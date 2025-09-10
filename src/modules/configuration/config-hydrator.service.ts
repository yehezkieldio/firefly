import { err, ok } from "neverthrow";
import semver from "semver";
import { type PackageJson, PackageJsonService } from "#/modules/filesystem/package-json.service";
import { GitProvider } from "#/modules/git/git.provider";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class ConfigHydratorService {
    private static readonly SCOPED_PACKAGE_REGEX = /^@[^/]+\//;
    private readonly gitProvider: GitProvider = new GitProvider();
    private readonly packageJsonService: PackageJsonService;

    constructor(packageJsonPath: string) {
        this.packageJsonService = new PackageJsonService(packageJsonPath);
    }

    async enrichConfig(config: Partial<FireflyConfig>): Promise<FireflyResult<FireflyConfig>> {
        let enrichedConfig = { ...config };

        const gitResult = await this.enrichFromGitRepository(enrichedConfig);
        if (gitResult.isErr()) {
            return err(gitResult.error);
        }
        enrichedConfig = gitResult.value;

        const branchResult = await this.enrichBranchFromGit(enrichedConfig);
        if (branchResult.isErr()) {
            return err(branchResult.error);
        }
        enrichedConfig = branchResult.value;

        const packageJsonResult = await this.enrichFromPackageJson(enrichedConfig);
        if (packageJsonResult.isErr()) {
            return err(packageJsonResult.error);
        }
        enrichedConfig = packageJsonResult.value;

        return ok(enrichedConfig as FireflyConfig);
    }

    private async enrichFromPackageJson(
        config: Partial<FireflyConfig>,
    ): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.packageJsonService) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "packageJsonService is not available for enrichment",
                }),
            );
        }

        const packageJsonResult = await this.packageJsonService.read();
        if (packageJsonResult.isErr()) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "Could not find a valid package.json file in the current directory.",
                }),
            );
        }

        logger.verbose("ConfigHydratorService: package.json found, enriching configuration...");

        const packageJson = packageJsonResult.value;
        if (!packageJson) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "package.json is empty or invalid",
                }),
            );
        }

        const enrichResult = this.enrichFromPackageData(config, packageJson);
        if (enrichResult.isErr()) {
            return err(enrichResult.error);
        }

        return ok(enrichResult.value);
    }

    private async enrichFromGitRepository(
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
        logger.verbose("ConfigHydratorService: Inside a Git repository, enriching configuration...");

        return this.enrichRepositoryFromGit(config);
    }

    private async enrichRepositoryFromGit(
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

    private async enrichBranchFromGit(config: Partial<FireflyConfig>): Promise<FireflyResult<Partial<FireflyConfig>>> {
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

    private enrichFromPackageData(
        config: Partial<FireflyConfig>,
        packageJson: PackageJson,
    ): FireflyResult<Partial<FireflyConfig>> {
        const enrichedConfig = { ...config };

        // Enrich name from package.json if not provided
        const nameEnrichmentResult = this.enrichNameFromPackageJson(enrichedConfig, packageJson);
        if (nameEnrichmentResult.isErr()) {
            return err(nameEnrichmentResult.error);
        }
        Object.assign(enrichedConfig, nameEnrichmentResult.value);

        // Enrich scope from package.json if not explicitly provided
        const scopeEnrichmentResult = this.enrichScopeFromPackageJson(config, packageJson);
        if (scopeEnrichmentResult.isErr()) {
            return err(scopeEnrichmentResult.error);
        }
        Object.assign(enrichedConfig, scopeEnrichmentResult.value);

        // Enrich preReleaseId from package.json if not explicitly provided
        const preReleaseEnrichmentResult = this.enrichPreReleaseIdFromPackageJson(config, packageJson);
        if (preReleaseEnrichmentResult.isErr()) {
            return err(preReleaseEnrichmentResult.error);
        }
        Object.assign(enrichedConfig, preReleaseEnrichmentResult.value);

        return ok(enrichedConfig);
    }

    private enrichPreReleaseIdFromPackageJson(
        originalConfig: FireflyConfig,
        packageJson: PackageJson,
    ): FireflyResult<FireflyConfig> {
        const preReleaseProvided =
            originalConfig.preReleaseId !== undefined && originalConfig.preReleaseId.trim() !== "";

        if (preReleaseProvided) {
            return ok({});
        }

        if (packageJson.version) {
            const parsed = semver.parse(packageJson.version);
            if (!parsed) {
                return err(
                    createFireflyError({
                        code: "INVALID",
                        message: `Invalid version in package.json: ${packageJson.version}`,
                    }),
                );
            }

            if (parsed.prerelease.length > 0) {
                const preId = typeof parsed.prerelease[0] === "string" ? parsed.prerelease[0] : "";
                if (!preId) {
                    return err(
                        createFireflyError({
                            code: "INVALID",
                            message: `package.json version "${packageJson.version}" is a prerelease but has no valid identifier`,
                        }),
                    );
                }

                logger.verbose(`ConfigHydratorService: Auto-detected preReleaseId from package.json: ${preId}`);
                return ok({ preReleaseId: preId });
            }
        }

        return ok({
            preReleaseId: "alpha",
        });
    }

    private enrichNameFromPackageJson(
        enrichedConfig: FireflyConfig,
        packageJson: PackageJson,
    ): FireflyResult<FireflyConfig> {
        // Case 1: If config.name is undefined (not provided) and package.json.name is also missing
        if (enrichedConfig.name === undefined && !packageJson.name) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "Could not find a valid package name in package.json",
                }),
            );
        }

        // Case 2: Enrich the config name from package.json if not provided (undefined)
        if (enrichedConfig.name === undefined && packageJson.name) {
            logger.verbose("ConfigHydratorService: Enriching name from package.json...");
            const extractedName = this.extractPackageName(packageJson.name);
            if (extractedName.isErr()) {
                return err(extractedName.error);
            }

            logger.verbose(
                `ConfigHydratorService: Enriched name from package.json: ${packageJson.name} -> ${extractedName.value}`,
            );

            return ok({ name: extractedName.value });
        }

        return ok({});
    }

    private enrichScopeFromPackageJson(
        originalConfig: FireflyConfig,
        packageJson: PackageJson,
    ): FireflyResult<FireflyConfig> {
        // Check if scope was explicitly provided in the original config (including empty string)
        // We consider scope explicitly provided if:
        // 1. The key exists AND the value is not undefined (covers empty string case)
        const scopeExplicitlyProvided = Object.hasOwn(originalConfig, "scope") && originalConfig.scope !== undefined;

        if (scopeExplicitlyProvided) {
            logger.verbose(
                `ConfigHydratorService: Scope explicitly provided in config: "${originalConfig.scope}" - not enriching from package.json`,
            );
            return ok({});
        }

        // Case 2: Only enrich scope if package.json has a scoped name and scope wasn't explicitly provided
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
