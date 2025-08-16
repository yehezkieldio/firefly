import { err, ok } from "neverthrow";
import type { GitProviderPort } from "#/core/ports/git-provider.port";
import type { PackageJson, PackageJsonPort } from "#/core/ports/package-json.port";
import type { FireflyConfig } from "#/infrastructure/config";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface EnrichmentSources {
    packageJsonService: PackageJsonPort;
    gitProvider: GitProviderPort;
}

export class ConfigEnricherService {
    private static readonly SCOPED_PACKAGE_REGEX = /^@[^/]+\//;

    constructor(private readonly sources: EnrichmentSources) {}

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
        if (!this.sources.packageJsonService) {
            return err(new ConfigurationError("packageJsonService is not available for enrichment"));
        }

        const packageJsonResult = await this.sources.packageJsonService.read();
        if (packageJsonResult.isErr()) {
            return err(new ConfigurationError("Could not find a valid package.json file in the current directory."));
        }

        logger.verbose("ConfigEnricherService: package.json found, enriching configuration...");

        const packageJson = packageJsonResult.value;
        if (!packageJson) {
            return err(new ConfigurationError("package.json is empty or invalid"));
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
        const isGitRepoResult = await this.sources.gitProvider.isInsideGitRepository();
        if (isGitRepoResult.isErr()) {
            return err(new ConfigurationError(`Failed to check git repository: ${isGitRepoResult.error.message}`));
        }

        if (!isGitRepoResult.value) {
            return err(
                new ConfigurationError(
                    "Not inside a Git repository. Please run Firefly from within a valid Git project.",
                ),
            );
        }
        logger.verbose("ConfigEnricherService: Inside a Git repository, enriching configuration...");

        return this.enrichRepositoryFromGit(config);
    }

    private async enrichRepositoryFromGit(
        config: Partial<FireflyConfig>,
    ): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.sources.gitProvider) {
            return ok(config);
        }

        if (config.repository && config.repository.trim() !== "") {
            return ok(config);
        }

        const repositoryUrlResult = await this.sources.gitProvider.getRepositoryUrl();
        if (repositoryUrlResult.isErr()) {
            return err(
                new ConfigurationError(
                    " Failed to get repository URL. Make sure a remote 'origin' exists or define repository manually in the config.",
                ),
            );
        }

        const extractResult = this.sources.gitProvider.extractRepository(repositoryUrlResult.value);
        if (extractResult.isErr()) {
            return err(new ConfigurationError("Failed to extract repository information from retrieved URL"));
        }

        const repository = extractResult.value;
        const repositoryString = `${repository.owner}/${repository.repository}`;

        logger.verbose(`ConfigEnricherService: Auto-detected repository: ${repositoryString}`);

        return ok({
            ...config,
            repository: repositoryString,
        });
    }

    private async enrichBranchFromGit(config: Partial<FireflyConfig>): Promise<FireflyResult<Partial<FireflyConfig>>> {
        if (!this.sources.gitProvider) {
            return ok(config);
        }

        if (config.branch && config.branch.trim() !== "") {
            const availableBranchesResult = await this.sources.gitProvider.isProvidedBranchValid(config.branch);
            if (availableBranchesResult.isErr()) {
                return err(
                    new ConfigurationError(
                        `Failed to validate provided branch "${config.branch}": ${availableBranchesResult.error.message}`,
                    ),
                );
            }

            if (!availableBranchesResult.value) {
                return err(
                    new ConfigurationError(
                        `Provided branch "${config.branch}" does not exist in the repository. Please check the branch name.`,
                    ),
                );
            }

            logger.verbose(`ConfigEnricherService: Using provided branch: ${config.branch}`);
            return ok(config);
        }

        const currentBranchResult = await this.sources.gitProvider.getCurrentBranch();
        if (currentBranchResult.isErr()) {
            return err(
                new ConfigurationError(
                    "Failed to get current branch. Make sure you are inside a Git repository or define branch manually in the config.",
                ),
            );
        }
        const currentBranch = currentBranchResult.value;
        logger.verbose(`ConfigEnricherService: Auto-detected branch: ${currentBranch}`);
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

        return ok(enrichedConfig);
    }

    private enrichNameFromPackageJson(
        enrichedConfig: Partial<FireflyConfig>,
        packageJson: PackageJson,
    ): FireflyResult<Partial<FireflyConfig>> {
        // Case 1: If config.name is undefined (not provided) and package.json.name is also missing
        if (enrichedConfig.name === undefined && !packageJson.name) {
            return err(new ConfigurationError("Could not find a valid package name in package.json"));
        }

        // Case 2: Enrich the config name from package.json if not provided (undefined)
        if (enrichedConfig.name === undefined && packageJson.name) {
            logger.verbose("ConfigEnricherService: Enriching name from package.json...");
            const extractedName = this.extractPackageName(packageJson.name);
            if (extractedName.isErr()) {
                return err(extractedName.error);
            }

            logger.verbose(
                `ConfigEnricherService: Enriched name from package.json: ${packageJson.name} -> ${extractedName.value}`,
            );

            return ok({ name: extractedName.value });
        }

        return ok({});
    }

    private enrichScopeFromPackageJson(
        originalConfig: Partial<FireflyConfig>,
        packageJson: PackageJson,
    ): FireflyResult<Partial<FireflyConfig>> {
        // Check if scope was explicitly provided in the original config (including empty string)
        // We consider scope explicitly provided if:
        // 1. The key exists AND the value is not undefined (covers empty string case)
        const scopeExplicitlyProvided = Object.hasOwn(originalConfig, "scope") && originalConfig.scope !== undefined;

        // Case 1: If scope was explicitly provided (even as empty string), don't enrich from package.json
        if (scopeExplicitlyProvided) {
            logger.verbose(
                `ConfigEnricherService: Scope explicitly provided in config: "${originalConfig.scope}" - not enriching from package.json`,
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
                `ConfigEnricherService: Auto-detected scope from package.json: ${extractedScopeResult.value}`,
            );

            return ok({ scope: extractedScopeResult.value });
        }

        return ok({});
    }

    private extractPackageName(packageName: string): FireflyResult<string> {
        if (!packageName?.trim()) {
            return err(new ConfigurationError("Package name is empty"));
        }

        const extractedName = packageName.replace(ConfigEnricherService.SCOPED_PACKAGE_REGEX, "");

        if (!extractedName) {
            return err(new ConfigurationError(`Invalid package name: ${packageName}`));
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
            return err(new ConfigurationError(`Malformed scoped package name: ${packageName}`));
        }

        return ok(scopePart.substring(1));
    }

    private isScopedPackage(packageName: string): boolean {
        return packageName.startsWith("@");
    }
}
