import { z } from "zod";
import type { OrchestratorOptions } from "#/modules/orchestration/core/contracts/orchestration.interface";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyResult, fireflyErr, fireflyOk } from "#/shared/utils/result.util";
import { validateWithResult } from "#/shared/utils/result-factory.util";

const FeatureNameSchema = z
    .string()
    .min(1, "Feature name must be a non-empty string")
    .max(100)
    .regex(/^[a-zA-Z0-9:_-]+$/, "Invalid characters in feature name");

const FeatureFlagSchema = z.boolean();

const FeatureFlagsMapSchema = z.map(FeatureNameSchema, FeatureFlagSchema);

const EnabledFeaturesSetSchema = z.set(FeatureNameSchema);

/**
 * Additional metadata for each feature.
 */
interface FeatureMetadata {
    name: string;
    enabled: boolean;
    description?: string;
    dependencies?: string[];
    conflictsWith?: string[];
    createdAt: Date;
    updatedAt: Date;
}

type FeatureFlags = Map<string, boolean>;

/**
 * Feature manager for handling feature flags and metadata.
 */
export class FeatureManager {
    private readonly features: FeatureFlags;
    private readonly metadata: Map<string, FeatureMetadata>;

    private constructor(features?: Map<string, boolean>, metadata?: Map<string, FeatureMetadata>) {
        this.features = features ? new Map(features) : new Map();
        this.metadata = metadata ? new Map(metadata) : new Map();
    }

    /**
     * Create an empty FeatureManager.
     */
    static empty(): FeatureManager {
        return new FeatureManager();
    }

    /**
     * Create a FeatureManager from options (enabledFeatures or featureFlags).
     */
    static fromOptions(options: Pick<OrchestratorOptions, "enabledFeatures" | "featureFlags">): FeatureManager {
        const manager = new FeatureManager();
        manager.initializeFeatures(options);
        return manager;
    }

    /**
     * Create a FeatureManager from existing maps.
     * This is the preferred path for producing new instances after updates.
     */
    static fromMaps(features: Map<string, boolean>, metadata: Map<string, FeatureMetadata>): FeatureManager {
        return new FeatureManager(features, metadata);
    }

    /**
     * Initialize features from options.
     */
    private initializeFeatures(options: Pick<OrchestratorOptions, "enabledFeatures" | "featureFlags">): void {
        const now = new Date();

        // Process enabled features set
        if (options.enabledFeatures) {
            const validationResult = EnabledFeaturesSetSchema.safeParse(options.enabledFeatures);
            if (validationResult.success) {
                for (const feature of validationResult.data) {
                    const parsedFeature = FeatureNameSchema.parse(feature);
                    this.features.set(parsedFeature, true);
                    this.metadata.set(parsedFeature, {
                        name: parsedFeature,
                        enabled: true,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } else {
                logger.warn(`FeatureManager: Invalid enabled features set: ${validationResult.error.message}`);
            }
        }

        // Process feature flags map
        if (options.featureFlags) {
            const validationResult = FeatureFlagsMapSchema.safeParse(options.featureFlags);
            if (validationResult.success) {
                for (const [feature, enabled] of validationResult.data.entries()) {
                    this.features.set(feature, enabled);
                    this.metadata.set(feature, {
                        name: feature,
                        enabled,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } else {
                logger.warn(`FeatureManager: Invalid feature flags map: ${validationResult.error.message}`);
            }
        }
    }

    /**
     * Check if a feature is enabled.
     */
    isEnabled(feature: string): boolean {
        const validationResult = FeatureNameSchema.safeParse(feature);
        if (!validationResult.success) {
            logger.warn(`FeatureManager: Invalid feature name: ${feature}`);
            return false;
        }

        const enabled = this.features.get(validationResult.data) ?? false;
        logger.verbose(`FeatureManager: Feature ${validationResult.data} is ${enabled ? "enabled" : "disabled"}`);
        return enabled;
    }

    /**
     * Check if all features are enabled.
     */
    areAllEnabled(features: string[]): boolean {
        return features.every((f) => this.isEnabled(f));
    }

    /**
     * Check if any feature is enabled.
     */
    isAnyEnabled(features: string[]): boolean {
        return features.some((f) => this.isEnabled(f));
    }

    /**
     * Enable a feature (returns new instance).
     */
    enable(feature: string): FireflyResult<FeatureManager> {
        return validateWithResult(FeatureNameSchema, feature, "feature").andThen((validFeature) => {
            const metadata = this.metadata.get(validFeature);

            // Check dependencies
            if (metadata?.dependencies) {
                const missingDeps = metadata.dependencies.filter((dep) => !this.isEnabled(dep));
                if (missingDeps.length > 0) {
                    return fireflyErr(
                        createFireflyError({
                            code: "VALIDATION",
                            message: `Cannot enable ${validFeature}: missing dependencies ${missingDeps.join(", ")}`,
                            source: "application",
                        }),
                    );
                }
            }

            // Check conflicts
            if (metadata?.conflictsWith) {
                const conflicts = metadata.conflictsWith.filter((conf) => this.isEnabled(conf));
                if (conflicts.length > 0) {
                    return fireflyErr(
                        createFireflyError({
                            code: "CONFLICT",
                            message: `Cannot enable ${validFeature}: conflicts with ${conflicts.join(", ")}`,
                            source: "application",
                        }),
                    );
                }
            }

            const updated = new Map(this.features);
            const updatedMetadata = new Map(this.metadata);

            updated.set(validFeature, true);
            updatedMetadata.set(validFeature, {
                ...(metadata || { name: validFeature, enabled: false, createdAt: new Date() }),
                enabled: true,
                updatedAt: new Date(),
            });

            logger.verbose(`FeatureManager: Enabled feature ${validFeature}`);

            const newManager = FeatureManager.fromMaps(updated, updatedMetadata);
            return fireflyOk(newManager);
        });
    }

    /**
     * Disable a feature (returns new instance).
     */
    disable(feature: string): FireflyResult<FeatureManager> {
        return validateWithResult(FeatureNameSchema, feature, "feature").andThen((validFeature) => {
            // Check if other features depend on this one
            const dependents = this.findDependents(validFeature);
            if (dependents.length > 0) {
                return fireflyErr(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Cannot disable ${validFeature}: required by ${dependents.join(", ")}`,
                        source: "application",
                    }),
                );
            }

            const updated = new Map(this.features);
            const updatedMetadata = new Map(this.metadata);
            const metadata = this.metadata.get(validFeature);

            updated.set(validFeature, false);
            updatedMetadata.set(validFeature, {
                ...(metadata || { name: validFeature, enabled: true, createdAt: new Date() }),
                enabled: false,
                updatedAt: new Date(),
            });

            logger.verbose(`FeatureManager: Disabled feature ${validFeature}`);

            const newManager = FeatureManager.fromMaps(updated, updatedMetadata);
            return fireflyOk(newManager);
        });
    }

    /**
     * Set multiple features at once (returns new instance).
     */
    setFeatures(features: Record<string, boolean>): FireflyResult<FeatureManager> {
        const updated = new Map(this.features);
        const updatedMetadata = new Map(this.metadata);
        const now = new Date();
        const errors: string[] = [];

        for (const [feature, enabled] of Object.entries(features)) {
            const nameValidation = FeatureNameSchema.safeParse(feature);
            const flagValidation = FeatureFlagSchema.safeParse(enabled);

            if (!nameValidation.success) {
                errors.push(`Invalid feature name: ${feature}`);
                continue;
            }

            if (!flagValidation.success) {
                errors.push(`Invalid flag value for ${feature}: ${enabled}`);
                continue;
            }

            const metadata = this.metadata.get(nameValidation.data);
            updated.set(nameValidation.data, flagValidation.data);
            updatedMetadata.set(nameValidation.data, {
                ...(metadata || { name: nameValidation.data, enabled: false, createdAt: now }),
                enabled: flagValidation.data,
                updatedAt: now,
            });
        }

        if (errors.length > 0) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Feature validation errors: ${errors.join("; ")}`,
                    details: { errors },
                    source: "application",
                }),
            );
        }

        logger.verbose(`FeatureManager: Set ${Object.keys(features).length} features`);

        const newManager = FeatureManager.fromMaps(updated, updatedMetadata);
        return fireflyOk(newManager);
    }

    /**
     * Toggle a feature (returns new instance).
     */
    toggle(feature: string): FireflyResult<FeatureManager> {
        const current = this.isEnabled(feature);
        return current ? this.disable(feature) : this.enable(feature);
    }

    /**
     * Get all enabled features.
     */
    getEnabledFeatures(): Set<string> {
        return new Set(
            Array.from(this.features.entries())
                .filter(([, enabled]) => enabled)
                .map(([feature]) => feature),
        );
    }

    /**
     * Get all disabled features.
     */
    getDisabledFeatures(): Set<string> {
        return new Set(
            Array.from(this.features.entries())
                .filter(([, enabled]) => !enabled)
                .map(([feature]) => feature),
        );
    }

    /**
     * Get all features with their states.
     */
    getAllFeatures(): FeatureFlags {
        return new Map(this.features);
    }

    /**
     * Get feature metadata.
     */
    getMetadata(feature: string): FeatureMetadata | undefined {
        const validationResult = FeatureNameSchema.safeParse(feature);
        if (!validationResult.success) {
            return;
        }
        return this.metadata.get(validationResult.data);
    }

    /**
     * Set feature metadata.
     */
    setMetadata(
        feature: string,
        metadata: Partial<Omit<FeatureMetadata, "name" | "enabled" | "createdAt" | "updatedAt">>,
    ): FireflyResult<FeatureManager> {
        return validateWithResult(FeatureNameSchema, feature, "feature").map((validFeature) => {
            const updatedMetadata = new Map(this.metadata);
            const existing = this.metadata.get(validFeature);

            updatedMetadata.set(validFeature, {
                name: validFeature,
                enabled: this.features.get(validFeature) ?? false,
                createdAt: existing?.createdAt ?? new Date(),
                updatedAt: new Date(),
                ...metadata,
            });

            const newManager = FeatureManager.fromMaps(this.features, updatedMetadata);
            return newManager;
        });
    }

    /**
     * Find features that depend on a given feature.
     */
    private findDependents(feature: string): string[] {
        const dependents: string[] = [];

        for (const [name, metadata] of this.metadata.entries()) {
            if (metadata.dependencies?.includes(feature) && this.isEnabled(name)) {
                dependents.push(name);
            }
        }

        return dependents;
    }

    /**
     * Export feature configuration.
     */
    export(): Record<string, boolean> {
        const result: Record<string, boolean> = {};
        for (const [feature, enabled] of this.features.entries()) {
            result[feature] = enabled;
        }
        return result;
    }

    /**
     * Create a new FeatureManager from configuration.
     */
    static fromConfig(config: Record<string, boolean>): FireflyResult<FeatureManager> {
        const featureFlags = new Map<string, boolean>();
        const errors: string[] = [];

        for (const [feature, enabled] of Object.entries(config)) {
            const nameValidation = FeatureNameSchema.safeParse(feature);
            const flagValidation = FeatureFlagSchema.safeParse(enabled);

            if (!nameValidation.success) {
                errors.push(`Invalid feature name: ${feature}`);
                continue;
            }

            if (!flagValidation.success) {
                errors.push(`Invalid flag value for ${feature}: ${enabled}`);
                continue;
            }

            featureFlags.set(nameValidation.data, flagValidation.data);
        }

        if (errors.length > 0) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Invalid feature configuration: ${errors.join("; ")}`,
                    details: { errors },
                    source: "application",
                }),
            );
        }

        return fireflyOk(FeatureManager.fromMaps(featureFlags, new Map()));
    }

    /**
     * Check feature compatibility.
     */
    checkCompatibility(features: string[]): FireflyResult<void> {
        const errors: string[] = [];

        // Validate inputs first: all feature names must be valid.
        for (const f of features) {
            const nameValidation = FeatureNameSchema.safeParse(f);
            if (!nameValidation.success) {
                return fireflyErr(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Invalid feature name in compatibility check: ${f}`,
                        details: { errors: [nameValidation.error.message] },
                        source: "application",
                    }),
                );
            }
        }

        for (const feature of features) {
            const metadata = this.getMetadata(feature);

            if (metadata?.dependencies) {
                const missingDeps = metadata.dependencies.filter((dep) => !features.includes(dep));
                if (missingDeps.length > 0) {
                    errors.push(`${feature} requires ${missingDeps.join(", ")}`);
                }
            }

            if (metadata?.conflictsWith) {
                const conflicts = metadata.conflictsWith.filter((conf) => features.includes(conf));
                if (conflicts.length > 0) {
                    errors.push(`${feature} conflicts with ${conflicts.join(", ")}`);
                }
            }
        }

        if (errors.length > 0) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: "Feature compatibility check failed",
                    details: { errors },
                    source: "application",
                }),
            );
        }

        return fireflyOk();
    }
}
