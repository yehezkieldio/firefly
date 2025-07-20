import { ResultAsync } from "neverthrow";
import type { ReleaseType } from "semver";
import type { ApplicationContext } from "#/application/context";
import { VersionDeciderService } from "#/core/services/version-decider.service";
import { ConventionalBumperAdapter } from "#/infrastructure/adapters/conventional-bumper.adapter";
import { VersionRepositoryAdapter } from "#/infrastructure/adapters/version-repository.adapter";
import type { BumpStrategyNonOptional, ReleaseTypeNonOptional } from "#/infrastructure/config/schema";
import { VersionPromptAdapter } from "#/infrastructure/prompter/version-prompt.adapter";
import { VersionStrategyPromptAdapter } from "#/infrastructure/prompter/version-strategy-prompt.adapter";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { CommandExecutionError, ConfigurationError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";
import type { AsyncFireflyResult } from "#/shared/utils/result";

type StrategyHandler = () => AsyncFireflyResult<void>;
type StrategyHandlers = Record<BumpStrategyNonOptional, StrategyHandler>;

export class BumpStrategyService {
    private readonly strategyHandlers: StrategyHandlers;
    private readonly versionRepository: VersionRepositoryAdapter;

    constructor(
        private readonly context: ApplicationContext,
        private readonly promptStrategy: VersionStrategyPromptAdapter = new VersionStrategyPromptAdapter(),
        private readonly versionPrompt: VersionPromptAdapter = new VersionPromptAdapter(),
        private readonly conventionalBumper: ConventionalBumperAdapter = new ConventionalBumperAdapter(
            context.getBasePath()
        )
    ) {
        this.strategyHandlers = this.createStrategyHandlers();
        this.versionRepository = new VersionRepositoryAdapter(createPackageJsonService(context.getBasePath()));
    }

    initializeCurrentVersion(): AsyncFireflyResult<void> {
        return ResultAsync.fromPromise(
            this.versionRepository.getCurrentVersion(),
            (error) => new CommandExecutionError(`Failed to load current version: ${error}`, error as Error)
        ).andThen((versionResult) => {
            if (versionResult.isErr()) {
                return ResultAsync.fromSafePromise(Promise.reject(versionResult.error));
            }

            const version = versionResult.value;
            const versionString = version.toString();

            this.context.setCurrentVersion(versionString);

            return ResultAsync.fromSafePromise(Promise.resolve());
        });
    }

    promptForStrategy(): AsyncFireflyResult<BumpStrategyNonOptional> {
        return this.promptStrategy
            .generateVersionStrategyChoices()
            .mapErr(
                (error) => new CommandExecutionError(`Failed to prompt for version strategy: ${error.message}`, error)
            )
            .map((selectedStrategy) => {
                if (!this.isValidStrategy(selectedStrategy)) {
                    throw new CommandExecutionError("Invalid version strategy selected");
                }

                return selectedStrategy as BumpStrategyNonOptional;
            });
    }

    executeStrategy(strategy: BumpStrategyNonOptional): AsyncFireflyResult<void> {
        const handler = this.strategyHandlers[strategy];
        if (!handler) {
            return ResultAsync.fromSafePromise(
                Promise.resolve().then(() => {
                    throw new ConfigurationError(`Unknown bump strategy: ${strategy}`);
                })
            );
        }

        return handler().mapErr(
            (error) => new CommandExecutionError(`Failed to execute ${strategy} strategy: ${error.message}`, error)
        );
    }

    determineAndExecuteStrategy(): AsyncFireflyResult<void> {
        return this.initializeCurrentVersion().andThen(() => {
            const config = this.context.getConfig();
            const strategy = config.bumpStrategy;

            // If no strategy configured or set to manual, prompt user
            if (!strategy || strategy === "manual") {
                return this.promptForStrategy().andThen((selectedStrategy) => {
                    return this.executeStrategy(selectedStrategy);
                });
            }

            return this.executeStrategy(strategy);
        });
    }

    private createStrategyHandlers(): StrategyHandlers {
        return {
            auto: () => this.executeAutomaticBump(),
            manual: () => this.executeManualBump(),
        };
    }

    private executeManualBump(): AsyncFireflyResult<void> {
        return ResultAsync.fromPromise(
            this.handleManualBump(),
            (error) =>
                new CommandExecutionError(
                    `Manual bump failed: ${error instanceof Error ? error.message : error}`,
                    error as Error
                )
        );
    }

    private executeAutomaticBump(): AsyncFireflyResult<void> {
        return ResultAsync.fromPromise(
            this.handleAutomaticBump(),
            (error) =>
                new CommandExecutionError(
                    `Automatic bump failed: ${error instanceof Error ? error.message : error}`,
                    error as Error
                )
        );
    }

    private async handleManualBump(): Promise<void> {
        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            throw new CommandExecutionError("Current version is not set in the context");
        }

        const config = this.context.getConfig();
        const configuredReleaseType = config.releaseType;

        const versionResult = await this.versionPrompt.generateVersionChoices(currentVersion, configuredReleaseType);

        if (versionResult.isErr()) {
            throw new CommandExecutionError(
                `Failed to get version selection: ${versionResult.error.message}`,
                versionResult.error
            );
        }

        const selectedVersion = versionResult.value;
        logger.log("");
        logger.info(`Version selected: ${selectedVersion}`);

        this.context.setNextVersion(selectedVersion);
    }

    private async handleAutomaticBump(): Promise<void> {
        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            throw new CommandExecutionError("Current version is not set in the context");
        }

        const recommendationResult = await this.conventionalBumper.getVersionRecommendation();
        if (recommendationResult.isErr()) {
            throw new CommandExecutionError(
                `Failed to get version recommendation: ${recommendationResult.error.message}`,
                recommendationResult.error
            );
        }

        const recommendation = recommendationResult.value;
        const config = this.context.getConfig();
        const versionDecider = new VersionDeciderService(currentVersion, config.preReleaseId, config.preReleaseBase);

        // Use configured release type if available, otherwise use recommendation
        const releaseType = this.determineReleaseType(config.releaseType, recommendation.releaseType as ReleaseType);

        const nextVersionResult = versionDecider.decideNextVersion(releaseType, recommendation);
        if (nextVersionResult.isErr()) {
            throw new CommandExecutionError(
                `Failed to decide next version: ${nextVersionResult.error.message}`,
                nextVersionResult.error
            );
        }

        const nextVersion = nextVersionResult.value;
        logger.log("");
        logger.info(`Version decided: ${nextVersion}`);

        this.context.setNextVersion(nextVersion);
    }

    private determineReleaseType(configuredType?: ReleaseTypeNonOptional, recommendedType?: ReleaseType): ReleaseType {
        if (configuredType) {
            return configuredType;
        }

        if (recommendedType) {
            return recommendedType;
        }

        logger.info("No release type configured or recommended, defaulting to patch");
        return "patch";
    }

    private isValidStrategy(strategy: string): strategy is BumpStrategyNonOptional {
        return strategy === "auto" || strategy === "manual";
    }
}
