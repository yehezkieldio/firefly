import { type ConfigLayerMeta, loadConfig, type ResolvedConfig } from "c12";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { createDefaultConfiguration } from "#/context";
import { CWD, CWD_PACKAGE_PATH } from "#/lib/constants";
import { extractRepository, getRepository, type Repository } from "#/lib/git";
import { getRepositoryUsingGitHubCLI } from "#/lib/github";
import { logger } from "#/lib/logger";
import { type PackageJson, pkgJson } from "#/lib/package-json";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisConfiguration, ArtemisContext } from "#/types";

export function getFileConfiguration(): ResultAsync<ArtemisConfiguration, Error> {
    return ResultAsync.fromPromise(
        loadConfig<ArtemisConfiguration>({
            name: "artemis",
            cwd: CWD,
            rcFile: false,
            defaultConfig: createDefaultConfiguration()
        }),
        (e: unknown): Error => createErrorFromUnknown(e, "Failed to load configuration")
    ).map((config: ResolvedConfig<ArtemisConfiguration, ConfigLayerMeta>): ArtemisConfiguration => config.config);
}

export function checkRepositoryConfiguration(
    configuration: ArtemisConfiguration
): ResultAsync<ArtemisConfiguration, Error> {
    const repoPattern = /^[^/]+\/[^/]+$/;

    function attemptAutoDetectRepository(): ResultAsync<ArtemisConfiguration, Error> {
        logger.verbose("FileConfiguration: Repository not configured, attempting to detect from git");
        return getRepository()
            .orElse(() => {
                logger.verbose("FileConfiguration: Failed to get repository from git, trying GitHub CLI");
                return getRepositoryUsingGitHubCLI().andThen((url: string): ResultAsync<Repository, Error> => {
                    const result = extractRepository(url);
                    if (result.isOk()) {
                        const ownerRepo = `${result.value.owner}/${result.value.repo}` as Repository;
                        return okAsync(ownerRepo);
                    }
                    return errAsync(result.error);
                });
            })
            .map(
                (repository: Repository): ArtemisConfiguration => ({
                    ...configuration,
                    repository
                })
            );
    }

    if (!configuration.repository || configuration.repository.trim() === "") {
        return attemptAutoDetectRepository();
    }

    if (!repoPattern.test(configuration.repository)) {
        return errAsync(new Error("Repository in configuration file must be in the format of <owner>/<repo>"));
    }

    return okAsync(configuration);
}

export function checkNameAndScopeConfiguration(
    configuration: ArtemisConfiguration
): ResultAsync<ArtemisConfiguration, Error> {
    if (configuration.name || configuration.scope) {
        return okAsync(configuration);
    }

    logger.verbose("FileConfiguration: Name and scope not configured, attempting to detect from package.json");

    return pkgJson
        .readPackageJson(CWD_PACKAGE_PATH)
        .orElse((readError: Error) => {
            logger.warn(`Could not read package.json at ${CWD_PACKAGE_PATH}: ${readError.message}`);
            return okAsync(null);
        })
        .andThen((pkg: PackageJson | null): ResultAsync<ArtemisConfiguration, Error> => {
            if (!pkg) {
                return okAsync(configuration);
            }

            const scopeResult = pkgJson.getPackageNameWithScope(pkg);
            if (scopeResult.isOk()) {
                const { name, scope } = scopeResult.value;
                logger.verbose(`FileConfiguration: Detected scoped package: ${scope}/${name}`);
                return okAsync({ ...configuration, name, scope });
            }

            const nameResult = pkgJson.getPackageName(pkg);
            if (nameResult.isOk()) {
                const name = nameResult.value;
                logger.verbose(`FileConfiguration: Detected package name: ${name}`);
                return okAsync({ ...configuration, name });
            }

            logger.warn("Could not determine package name or scope from package.json");
            return okAsync(configuration);
        });
}

export function getFullPackageName(configuration: ArtemisConfiguration): string {
    if (configuration.scope) {
        return `@${configuration.scope}/${configuration.name!}`;
    }

    return configuration.name!;
}

export function resolveCommitMessage(context: ArtemisContext): string {
    let message: string = context.config.commitMessage!;
    const name: string = getFullPackageName(context.config);

    if (message.includes("{{version}}")) {
        message = message.replace("{{version}}", context.nextVersion || "");
    }

    if (message.includes("{{name}}")) {
        message = message.replace("{{name}}", name);
    }

    return message;
}

export function resolveTagName(context: ArtemisContext): string {
    let tagName: string = context.config.tagName!;
    const name: string = getFullPackageName(context.config);

    if (tagName.includes("{{version}}")) {
        tagName = tagName.replace("{{version}}", context.nextVersion || "");
    }

    if (tagName.includes("{{name}}")) {
        tagName = tagName.replace("{{name}}", name);
    }

    logger.verbose("Resolved tag name:", tagName);
    return tagName;
}

export function resolveTagNameAnnotation(context: ArtemisContext): string {
    let tagAnnotation: string = context.config.tagAnnotation!;
    const name: string = getFullPackageName(context.config);

    if (tagAnnotation.includes("{{version}}")) {
        tagAnnotation = tagAnnotation.replace("{{version}}", context.nextVersion || "");
    }

    if (tagAnnotation.includes("{{name}}")) {
        tagAnnotation = tagAnnotation.replace("{{name}}", name);
    }
    return tagAnnotation;
}

export function resolveReleaseTitle(context: ArtemisContext): string {
    let title: string = context.config.gitHubReleaseTitle!;
    const name: string = getFullPackageName(context.config);

    if (title.includes("{{version}}")) {
        title = title.replace("{{version}}", context.nextVersion || "");
    }

    if (title.includes("{{name}}")) {
        title = title.replace("{{name}}", name);
    }

    return title;
}
