import { err, ok } from "neverthrow";
import semver from "semver";
import { type CargoToml, CargoTomlService } from "#/modules/filesystem/cargo-toml.service";
import { type PackageJson, PackageJsonService } from "#/modules/filesystem/package-json.service";
import { GitProvider } from "#/modules/git/git.provider";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class ConfigHydratorService {
    private static readonly SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
    private readonly gitProvider: GitProvider;
    private readonly packageJsonService: PackageJsonService;
    private readonly cargoTomlService: CargoTomlService;

    constructor(basePath: string) {
        this.gitProvider = GitProvider.getInstance();
        this.packageJsonService = PackageJsonService.getInstance(basePath);
        this.cargoTomlService = CargoTomlService.getInstance(basePath);
    }

    async hydrateConfig(config: Partial<FireflyConfig>): Promise<FireflyResult<FireflyConfig>> {
        let hydratedConfig = { ...config };

        const gitResult = await this.hydrateFromGitRepository(hydratedConfig);
        if (gitResult.isErr()) {
            return err(gitResult.error);
        }
        hydratedConfig = gitResult.value;

        const branchResult = await this.hydrateBranchFromGit(hydratedConfig);
        if (branchResult.isErr()) {
            return err(branchResult.error);
        }
        hydratedConfig = branchResult.value;

        // Language-specific metadata hydration (priority: npm > cargo)
        const packageJsonResult = await this.hydrateFromPackageJson(hydratedConfig);
        if (packageJsonResult.isErr()) {
            return err(packageJsonResult.error);
        }
        hydratedConfig = packageJsonResult.value;

        const cargoTomlResult = await this.hydrateFromCargoToml(hydratedConfig);
        if (cargoTomlResult.isErr()) {
            return err(cargoTomlResult.error);
        }
        hydratedConfig = cargoTomlResult.value;

        if (!hydratedConfig.preReleaseId || hydratedConfig.preReleaseId.trim() === "") {
            logger.verbose("ConfigHydratorService: No preReleaseId found, defaulting to 'alpha'");
            hydratedConfig.preReleaseId = "alpha";
        }

        if (!hydratedConfig.name) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "Could not determine project name from config, package.json, or Cargo.toml",
                }),
            );
        }

        return ok(hydratedConfig as FireflyConfig);
    }

    private async hydrateFromPackageJson(
        config: Partial<FireflyConfig>,
    ): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.packageJsonService) {
            return ok(config);
        }

        const packageJsonResult = await this.packageJsonService.read();
        if (packageJsonResult.isErr()) {
            logger.verbose("ConfigHydratorService: package.json not found or unreadable, skipping hydration from it.");
            return ok(config);
        }

        logger.verbose("ConfigHydratorService: package.json found, hydrating configuration...");

        const packageJson = packageJsonResult.value;
        if (!packageJson) {
            // Should be covered by read() check, but safe guard
            return ok(config);
        }

        const hydrateResult = this.hydrateFromPackageData(config, packageJson);
        if (hydrateResult.isErr()) {
            return err(hydrateResult.error);
        }

        return ok(hydrateResult.value);
    }

    private async hydrateFromCargoToml(config: Partial<FireflyConfig>): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.cargoTomlService) {
            return ok(config);
        }

        const cargoTomlResult = await this.cargoTomlService.read();
        if (cargoTomlResult.isErr()) {
            logger.verbose("ConfigHydratorService: Cargo.toml not found or unreadable, skipping hydration from it.");
            return ok(config);
        }

        logger.verbose("ConfigHydratorService: Cargo.toml found, hydrating configuration...");

        const cargoToml = cargoTomlResult.value;
        if (!cargoToml) {
            return ok(config);
        }

        const hydrateResult = this.hydrateFromCargoData(config, cargoToml);
        if (hydrateResult.isErr()) {
            return err(hydrateResult.error);
        }

        return ok(hydrateResult.value);
    }

    private async hydrateFromGitRepository(
        config: Partial<FireflyConfig>,
    ): Promise<FireflyResult<Partial<FireflyConfig>>> {
        const isGitRepoResult = await this.gitProvider.repository.isInsideWorkTree();
        if (isGitRepoResult.isErr()) {
            return err(isGitRepoResult.error);
        }

        if (!isGitRepoResult.value) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "Not inside a Git repository. Please run Firefly from within a valid Git project.",
                }),
            );
        }
        logger.verbose("ConfigHydratorService: Inside a Git repository, hydrating configuration...");

        return this.hydrateRepositoryFromGit(config);
    }

    private async hydrateRepositoryFromGit(
        config: Partial<FireflyConfig>,
    ): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.gitProvider) {
            return ok(config);
        }

        if (config.repository && config.repository.trim() !== "") {
            return ok(config);
        }

        const repositoryUrlResult = await this.gitProvider.repository.getRepositoryUrl();
        if (repositoryUrlResult.isErr()) {
            return err(repositoryUrlResult.error);
        }

        const extractResult = this.gitProvider.repositoryParse.extractRepository(repositoryUrlResult.value);
        if (extractResult.isErr()) {
            return err(extractResult.error);
        }

        const repository = extractResult.value;
        const repositoryString = `${repository.owner}/${repository.repo}`;

        logger.verbose(`ConfigHydratorService: Auto-detected repository: ${repositoryString}`);

        return ok({
            ...config,
            repository: repositoryString,
        });
    }

    private async hydrateBranchFromGit(config: Partial<FireflyConfig>): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.gitProvider) {
            return ok(config);
        }

        if (config.branch && config.branch.trim() !== "") {
            const availableBranchesResult = await this.gitProvider.branch.isProvidedBranchValid(config.branch);
            if (availableBranchesResult.isErr()) {
                return err(availableBranchesResult.error);
            }

            if (!availableBranchesResult.value) {
                return err(
                    createFireflyError({
                        code: "NOT_FOUND",
                        message: `The provided branch "${config.branch}" does not exist in the repository.`,
                    }),
                );
            }

            logger.verbose(`ConfigHydratorService: Using provided branch: ${config.branch}`);
            return ok(config);
        }

        const currentBranchResult = await this.gitProvider.branch.currentBranch();
        if (currentBranchResult.isErr()) {
            return err(currentBranchResult.error);
        }
        const currentBranch = currentBranchResult.value;
        logger.verbose(`ConfigHydratorService: Auto-detected branch: ${currentBranch}`);
        return ok({
            ...config,
            branch: currentBranch,
        });
    }

    private hydrateFromPackageData(
        config: Partial<FireflyConfig>,
        packageJson: PackageJson,
    ): FireflyResult<Partial<FireflyConfig>> {
        const hydratedConfig = { ...config };

        // hydrate name from package.json if not provided
        const nameHydrationResult = this.hydrateNameFromPackageJson(hydratedConfig, packageJson);
        if (nameHydrationResult.isErr()) {
            return err(nameHydrationResult.error);
        }
        Object.assign(hydratedConfig, nameHydrationResult.value);

        // hydrate scope from package.json if not explicitly provided
        const scopeHydrationResult = this.hydrateScopeFromPackageJson(config, packageJson);
        if (scopeHydrationResult.isErr()) {
            return err(scopeHydrationResult.error);
        }
        Object.assign(hydratedConfig, scopeHydrationResult.value);

        // hydrate preReleaseId from package.json if not explicitly provided
        const preReleaseHydrationResult = this.hydratePreReleaseIdFromVersion(config, packageJson.version);
        if (preReleaseHydrationResult.isErr()) {
            return err(preReleaseHydrationResult.error);
        }
        Object.assign(hydratedConfig, preReleaseHydrationResult.value);

        return ok(hydratedConfig);
    }

    private hydrateFromCargoData(
        config: Partial<FireflyConfig>,
        cargoToml: CargoToml,
    ): FireflyResult<Partial<FireflyConfig>> {
        const hydratedConfig = { ...config };

        // hydrate name from Cargo.toml if not provided
        if (hydratedConfig.name === undefined && cargoToml.package?.name) {
            hydratedConfig.name = cargoToml.package.name;
            logger.verbose(`ConfigHydratorService: hydrating name from Cargo.toml: ${hydratedConfig.name}`);
        }

        // hydrate preReleaseId from Cargo.toml if not explicitly provided
        // Cargo.toml has no native concept of package scope; intentionally skipped
        const preReleaseHydrationResult = this.hydratePreReleaseIdFromVersion(config, cargoToml.package?.version);
        if (preReleaseHydrationResult.isErr()) {
            return err(preReleaseHydrationResult.error);
        }
        Object.assign(hydratedConfig, preReleaseHydrationResult.value);

        return ok(hydratedConfig);
    }

    private hydratePreReleaseIdFromVersion(
        originalConfig: FireflyConfig,
        version?: string,
    ): FireflyResult<FireflyConfig> {
        const preReleaseProvided =
            originalConfig.preReleaseId !== undefined && originalConfig.preReleaseId.trim() !== "";

        if (preReleaseProvided) {
            return ok({});
        }

        if (version) {
            const parsed = semver.parse(version);
            if (!parsed) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: `Invalid version string: ${version}`,
                    }),
                );
            }

            if (parsed.prerelease.length > 0) {
                const preId = typeof parsed.prerelease[0] === "string" ? parsed.prerelease[0] : "";
                if (!preId) {
                    return err(
                        createFireflyError({
                            code: "INVALID",
                            message: `Version "${version}" is a prerelease but has no valid identifier`,
                        }),
                    );
                }

                logger.verbose(`ConfigHydratorService: Auto-detected preReleaseId from version: ${preId}`);
                return ok({ preReleaseId: preId });
            }
        }

        // Return empty if no preReleaseId found, to allow defaulting later
        return ok({});
    }

    private hydrateNameFromPackageJson(
        hydratedConfig: FireflyConfig,
        packageJson: PackageJson,
    ): FireflyResult<FireflyConfig> {
        // Case 1: If config.name is undefined (not provided) and package.json.name is also missing
        if (hydratedConfig.name === undefined && !packageJson.name) {
            // Return ok to allow other hydrators (like Cargo) to attempt filling the name
            return ok({});
        }

        // Case 2: hydrate the config name from package.json if not provided (undefined)
        if (hydratedConfig.name === undefined && packageJson.name) {
            logger.verbose("ConfigHydratorService: hydrating name from package.json...");
            const extractedName = this.extractPackageName(packageJson.name);
            if (extractedName.isErr()) {
                return err(extractedName.error);
            }

            logger.verbose(
                `ConfigHydratorService: hydrating name from package.json: ${packageJson.name} -> ${extractedName.value}`,
            );

            return ok({ name: extractedName.value });
        }

        logger.verbose(`ConfigHydratorService: name explicitly provided in config: "${hydratedConfig.name}"`);
        return ok({});
    }

    private hydrateScopeFromPackageJson(
        originalConfig: FireflyConfig,
        packageJson: PackageJson,
    ): FireflyResult<FireflyConfig> {
        // Check if scope was explicitly provided in the original config (including empty string)
        const scopeExplicitlyProvided = Object.hasOwn(originalConfig, "scope") && originalConfig.scope !== undefined;

        if (scopeExplicitlyProvided) {
            logger.verbose(
                `ConfigHydratorService: Scope explicitly provided in config: "${originalConfig.scope}" - not hydrating from package.json`,
            );
            return ok({});
        }

        if (packageJson.name && this.isScopedPackage(packageJson.name)) {
            const extractedScopeResult = this.extractScope(packageJson.name);
            if (extractedScopeResult.isErr()) {
                return err(extractedScopeResult.error);
            }

            logger.verbose(
                `ConfigHydratorService: Auto-detected scope from package.json: ${extractedScopeResult.value}`,
            );

            return ok({ scope: extractedScopeResult.value });
        }

        return ok({});
    }

    private extractPackageName(packageName: string): FireflyResult<string> {
        if (!packageName?.trim()) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Package name cannot be empty",
                }),
            );
        }

        const extractedName = packageName.replace(ConfigHydratorService.SCOPED_PACKAGE_REGEX, "");
        if (!extractedName) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Malformed package name: "${packageName}"`,
                }),
            );
        }

        return ok(extractedName);
    }

    private extractScope(packageName: string): FireflyResult<string> {
        if (!this.isScopedPackage(packageName)) {
            return ok("");
        }

        const parts = packageName.split("/");
        const scopePart = parts[0];

        if (!scopePart || scopePart.length <= 1) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Malformed scoped package name: "${packageName}"`,
                }),
            );
        }

        return ok(scopePart.substring(1));
    }

    private isScopedPackage(packageName: string): boolean {
        return packageName.startsWith("@");
    }
}
