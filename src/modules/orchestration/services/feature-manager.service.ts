import { err, ok } from "neverthrow";
import z from "zod";
import type { OrchestratorOptions } from "#/modules/orchestration/contracts/orchestration.interface";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyResult, parseSchema } from "#/shared/utils/result.util";

const FeatureNameSchema = z
    .string()
    .min(1, "Feature name must be at least 1 character long")
    .max(100, "Feature name must be at most 100 characters long")
    .regex(/^[a-zA-Z0-9-_]+$/, "Feature name can only contain alphanumeric characters, hyphens, and underscores");

const FeatureFlagSchema = z.boolean();

const FeatureFlagsRecordSchema = z.record(FeatureNameSchema, FeatureFlagSchema);

type FeatureFlags = Map<string, boolean>;

interface FeatureMetadata {
    name: string;
    description?: string;
    dependencies?: string[];
    conflictsWith?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export class FeatureManagerService {
    private readonly features: FeatureFlags;
    private readonly metadata: Map<string, FeatureMetadata>;

    private constructor(features?: Map<string, boolean>, metadata?: Map<string, FeatureMetadata>) {
        this.features = features ? new Map(features) : new Map();
        this.metadata = metadata ? new Map(metadata) : new Map();
    }

    static empty(): FeatureManagerService {
        return new FeatureManagerService();
    }

    static fromMaps(features: Map<string, boolean>, metadata: Map<string, FeatureMetadata>): FeatureManagerService {
        return new FeatureManagerService(features, metadata);
    }

    static fromConfig(config: Record<string, boolean>): FireflyResult<FeatureManagerService> {
        const configValidation = parseSchema(FeatureFlagsRecordSchema, config);
        if (configValidation.isErr()) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Invalid feature configuration: ${configValidation.error.message}`,
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        const featureFlags = new Map(Object.entries(configValidation.value));
        return ok(FeatureManagerService.fromMaps(featureFlags, new Map()));
    }

    static create(options: Pick<OrchestratorOptions, "featureFlags">): FireflyResult<FeatureManagerService> {
        if (!options.featureFlags) {
            return ok(new FeatureManagerService());
        }

        // Convert Map to Record for validation if needed
        const configRecord =
            options.featureFlags instanceof Map ? Object.fromEntries(options.featureFlags) : options.featureFlags;

        return FeatureManagerService.fromConfig(configRecord);
    }

    isEnabled(featureName: string): boolean {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            logger.warn(`FeatureManagerService: Invalid feature name checked - ${validation.error.message}`);
            return false;
        }

        const enabled = this.features.get(featureName) ?? false;
        return enabled;
    }

    areAllEnabled(featureNames: string[]): boolean {
        return featureNames.every((name) => this.isEnabled(name));
    }

    isAnyEnabled(featureNames: string[]): boolean {
        return featureNames.some((name) => this.isEnabled(name));
    }

    enable(featureName: string): FireflyResult<FeatureManagerService> {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            return err(validation.error);
        }

        const metadata = this.metadata.get(featureName);

        if (metadata) {
            const dependencyCheck = this.validateDependencies(featureName, metadata);
            if (dependencyCheck.isErr()) {
                return err(dependencyCheck.error);
            }

            const conflictCheck = this.validateConflicts(featureName, metadata);
            if (conflictCheck.isErr()) {
                return err(conflictCheck.error);
            }
        }

        const updated = new Map(this.features);
        const updatedMetadata = new Map(this.metadata);

        updated.set(featureName, true);
        updatedMetadata.set(featureName, {
            ...(metadata || { name: featureName, createdAt: new Date() }),
            updatedAt: new Date(),
        });

        return ok(FeatureManagerService.fromMaps(updated, updatedMetadata));
    }

    disable(featureName: string): FireflyResult<FeatureManagerService> {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            logger.warn(`FeatureManagerService: Invalid feature name checked - ${validation.error.message}`);
            return err(validation.error);
        }

        const dependents = this.findDependents(featureName);
        if (dependents.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Cannot disable feature "${featureName}" because the following features depend on it: ${dependents.join(
                        ", ",
                    )}`,
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        const metadata = this.metadata.get(featureName);
        const updated = new Map(this.features);
        const updatedMetadata = new Map(this.metadata);

        updated.set(featureName, false);
        updatedMetadata.set(featureName, {
            ...(metadata || { name: featureName, createdAt: new Date() }),
            updatedAt: new Date(),
        });

        return ok(FeatureManagerService.fromMaps(updated, updatedMetadata));
    }

    private findDependents(featureName: string): string[] {
        const dependents: string[] = [];

        for (const [name, meta] of this.metadata.entries()) {
            if (meta.dependencies?.includes(featureName) && this.isEnabled(name)) {
                dependents.push(name);
            }
        }

        return dependents;
    }

    private validateDependencies(featureName: string, metadata: FeatureMetadata): FireflyResult<void> {
        if (!metadata.dependencies) {
            return ok();
        }

        const missingDependencies = metadata.dependencies.filter((dep) => !this.isEnabled(dep));
        if (missingDependencies.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Cannot enable feature "${featureName}" due to missing dependencies: ${missingDependencies.join(
                        ", ",
                    )}`,
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        return ok();
    }

    private validateConflicts(featureName: string, metadata: FeatureMetadata): FireflyResult<void> {
        if (!metadata.conflictsWith) {
            return ok();
        }

        const conflictingFeatures = metadata.conflictsWith.filter((conflict) => this.isEnabled(conflict));
        if (conflictingFeatures.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Cannot enable feature "${featureName}" due to conflicts with enabled features: ${conflictingFeatures.join(
                        ", ",
                    )}`,
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        return ok();
    }

    toggle(featureName: string): FireflyResult<FeatureManagerService> {
        const current = this.isEnabled(featureName);
        return current ? this.disable(featureName) : this.enable(featureName);
    }

    getEnabledFeatures(): Set<string> {
        return new Set(
            Array.from(this.features.entries())
                .filter(([, isEnabled]) => isEnabled)
                .map(([name]) => name),
        );
    }

    getDisabledFeatures(): Set<string> {
        return new Set(
            Array.from(this.features.entries())
                .filter(([, isEnabled]) => !isEnabled)
                .map(([name]) => name),
        );
    }

    getAllFeatures(): Map<string, boolean> {
        return new Map(this.features);
    }

    setFeatures(features: Map<string, boolean>): FireflyResult<FeatureManagerService> {
        const updated = new Map(this.features);
        const updatedMetadata = new Map(this.metadata);
        const now = new Date();
        const errors: string[] = [];

        for (const [featureName, isEnabled] of features.entries()) {
            const validationName = parseSchema(FeatureNameSchema, featureName);
            if (validationName.isErr()) {
                errors.push(`Invalid feature name "${featureName}": ${validationName.error.message}`);
                continue;
            }

            const validationFlag = parseSchema(FeatureFlagSchema, isEnabled);
            if (validationFlag.isErr()) {
                errors.push(`Invalid flag for feature "${featureName}": ${validationFlag.error.message}`);
                continue;
            }

            const metadata = this.metadata.get(featureName);
            updated.set(featureName, isEnabled);
            updatedMetadata.set(featureName, {
                ...(metadata || { name: featureName, createdAt: now }),
                updatedAt: now,
            });
        }

        if (errors.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Errors setting features: ${errors.join("; ")}`,
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        return ok(FeatureManagerService.fromMaps(updated, updatedMetadata));
    }

    getMetadata(featureName: string): FeatureMetadata | undefined {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            logger.warn(`FeatureManagerService: Invalid feature name checked - ${validation.error.message}`);
            return;
        }

        return this.metadata.get(featureName);
    }

    getMetadataWithEnabled(featureName: string): (FeatureMetadata & { enabled: boolean }) | undefined {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            logger.warn(`FeatureManagerService: Invalid feature name checked - ${validation.error.message}`);
            return;
        }

        const metadata = this.metadata.get(featureName);
        if (!metadata) return;

        return {
            ...metadata,
            enabled: this.features.get(featureName) ?? false,
        };
    }

    setMetadata(
        featureName: string,
        metadata: Partial<Omit<FeatureMetadata, "name" | "createdAt" | "updatedAt">>,
    ): FireflyResult<FeatureManagerService> {
        const validation = parseSchema(FeatureNameSchema, featureName);
        if (validation.isErr()) {
            logger.warn(`FeatureManagerService: Invalid feature name checked - ${validation.error.message}`);
            return err(validation.error);
        }

        const updatedMetadata = new Map(this.metadata);
        const existing = updatedMetadata.get(featureName);

        updatedMetadata.set(featureName, {
            name: featureName,
            createdAt: existing?.createdAt ?? new Date(),
            updatedAt: new Date(),
            ...metadata,
        });

        return ok(FeatureManagerService.fromMaps(this.features, updatedMetadata));
    }

    checkCompatibility(features: string[]): FireflyResult<void> {
        const errors: string[] = [];

        for (const f of features) {
            const validation = parseSchema(FeatureNameSchema, f);
            if (validation.isErr()) {
                errors.push(`Invalid feature name "${f}": ${validation.error.message}`);
            }
        }

        // Check dependencies and conflicts for valid feature names only
        for (const feature of features) {
            const validation = parseSchema(FeatureNameSchema, feature);
            if (validation.isErr()) {
                // Skip invalid names as they're already collected above
                continue;
            }

            const metadata = this.getMetadata(feature);

            if (metadata?.dependencies) {
                const missingDependencies = metadata.dependencies.filter((dep) => !features.includes(dep));
                if (missingDependencies.length > 0) {
                    errors.push(
                        `Feature "${feature}" is missing dependencies: ${missingDependencies
                            .map((d) => `"${d}"`)
                            .join(", ")}`,
                    );
                }
            }

            if (metadata?.conflictsWith) {
                const conflictingFeatures = metadata.conflictsWith.filter((conflict) => features.includes(conflict));
                if (conflictingFeatures.length > 0) {
                    errors.push(
                        `Feature "${feature}" conflicts with: ${conflictingFeatures.map((c) => `"${c}"`).join(", ")}`,
                    );
                }
            }
        }

        if (errors.length > 0) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Feature compatibility check failed: ${errors.join("; ")}`,
                    details: { errors },
                    source: "orchestration/feature-manager-service",
                }),
            );
        }

        return ok();
    }
}
