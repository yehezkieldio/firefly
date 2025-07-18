import { consola } from "consola";
import type { ApplicationContext } from "#/application/context.js";
import { Release } from "#/core/domain/release.js";
import type { Version } from "#/core/domain/version.js";
import type {
    ArtemisConfig,
    ReleaseType,
} from "#/infrastructure/config/schema.js";
import type { ArtemisResult } from "#/shared/result.js";
import { ArtemisError, err, ok } from "#/shared/result.js";

export class CreateReleaseUseCase {
    private readonly context: ApplicationContext;

    constructor(context: ApplicationContext) {
        this.context = context;
    }

    async execute(releaseType?: ReleaseType): Promise<ArtemisResult<Release>> {
        try {
            const config = this.context.getConfig();
            consola.info("Creating release...");

            // Get current version
            const currentVersionResult =
                await this.context.versionRepository.getCurrentVersion();
            if (currentVersionResult.isErr()) {
                return err(currentVersionResult.error);
            }
            const currentVersion = currentVersionResult.value;

            // Determine next version
            const nextVersion = this.determineNextVersion(
                currentVersion,
                releaseType,
                config
            );
            if (nextVersion.isErr()) {
                return err(nextVersion.error);
            }

            // Get repository information
            const repositoryResult =
                await this.context.gitProvider.getCurrentRepository();
            if (repositoryResult.isErr()) {
                return err(repositoryResult.error);
            }
            // Repository info is available for future use
            const _repository = repositoryResult.value;

            // Generate changelog if not skipped
            let changelog;
            if (!config.skipChangelog) {
                const changelogResult =
                    await this.context.changelogGenerator.generate(
                        currentVersion,
                        nextVersion.value
                    );
                if (changelogResult.isErr()) {
                    return err(changelogResult.error);
                }
                changelog = changelogResult.value;
            }

            // Create release object
            const release = new Release(
                currentVersion,
                nextVersion.value,
                {
                    title: config.releaseTitle,
                    notes: config.releaseNotes,
                    isDraft: config.releaseDraft,
                    isPrerelease: config.releasePreRelease,
                    isLatest: config.releaseLatest,
                    tagName: config.tagName,
                    commitMessage: config.commitMessage,
                    branch: config.branch,
                },
                changelog
            );

            consola.success(
                `Release created: ${currentVersion.toString()} -> ${nextVersion.value.toString()}`
            );
            return ok(release);
        } catch (error) {
            consola.error("Failed to create release:", error);
            return err(
                new ArtemisError(
                    "Failed to create release",
                    "CREATE_RELEASE_FAILED",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private determineNextVersion(
        currentVersion: Version,
        releaseType: ReleaseType | undefined,
        config: ArtemisConfig
    ): ArtemisResult<Version> {
        try {
            if (releaseType) {
                // Explicit release type provided
                switch (releaseType) {
                    case "major":
                    case "minor":
                    case "patch":
                        return ok(currentVersion.bump(releaseType));
                    case "prerelease":
                        return ok(
                            currentVersion.bumpPrerelease(config.preReleaseId)
                        );
                    case "premajor":
                        return ok(
                            currentVersion.bumpPremajor(config.preReleaseId)
                        );
                    case "preminor":
                        return ok(
                            currentVersion.bumpPreminor(config.preReleaseId)
                        );
                    case "prepatch":
                        return ok(
                            currentVersion.bumpPrepatch(config.preReleaseId)
                        );
                    default:
                        return err(
                            new ArtemisError(
                                `Unknown release type: ${releaseType}`,
                                "UNKNOWN_RELEASE_TYPE"
                            )
                        );
                }
            }

            // Auto-determine version based on bump strategy
            if (config.bumpStrategy === "auto") {
                // For now, default to patch bump
                // TODO: Implement conventional commits analysis
                return ok(currentVersion.bump("patch"));
            }

            if (config.bumpStrategy === "manual") {
                // Manual bump requires explicit release type
                return err(
                    new ArtemisError(
                        "Manual bump strategy requires explicit release type",
                        "MANUAL_BUMP_REQUIRES_TYPE"
                    )
                );
            }

            if (config.bumpStrategy === "conventional") {
                // TODO: Implement conventional commits analysis
                return ok(currentVersion.bump("patch"));
            }

            return err(
                new ArtemisError(
                    `Unknown bump strategy: ${config.bumpStrategy}`,
                    "UNKNOWN_BUMP_STRATEGY"
                )
            );
        } catch (error) {
            return err(
                new ArtemisError(
                    "Failed to determine next version",
                    "VERSION_DETERMINATION_FAILED",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }
}
