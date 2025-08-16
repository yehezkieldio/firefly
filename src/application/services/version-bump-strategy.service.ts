import { LogLevels } from "consola";
import { err, ok } from "neverthrow";
import type { ReleaseType } from "semver";
import type { ApplicationContext } from "#/application/context";
import { VersionDeciderService } from "#/core/services/version-decider.service";
import { GitProviderAdapter } from "#/infrastructure/adapters/git-provider.adapter";
import { VersionRepositoryAdapter } from "#/infrastructure/adapters/version-repository.adapter";
import type { BumpStrategyNonOptional, ReleaseTypeNonOptional } from "#/infrastructure/config/schema";
import { VersionChoicePrompter } from "#/infrastructure/prompters/version-choice.prompt";
import { VersionStrategyPromptAdapter } from "#/infrastructure/prompters/version-strategy.prompter";
import { createPackageJsonService } from "#/infrastructure/services/package-json-service.factory";
import { SemanticVersionService } from "#/infrastructure/services/semantic-version.service";
import { TaskExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

type StrategyHandler = () => Promise<FireflyResult<void>>;
type StrategyHandlers = Record<BumpStrategyNonOptional, StrategyHandler>;

export class BumpStrategyService {
    private readonly strategyHandlers: StrategyHandlers;
    private readonly versionRepository: VersionRepositoryAdapter;
    private readonly semanticVersionService: SemanticVersionService;

    constructor(
        private readonly context: ApplicationContext,
        private readonly promptStrategy: VersionStrategyPromptAdapter = new VersionStrategyPromptAdapter(),
        private readonly versionPrompt: VersionChoicePrompter = new VersionChoicePrompter(),
    ) {
        this.strategyHandlers = this.createStrategyHandlers();
        this.versionRepository = new VersionRepositoryAdapter(createPackageJsonService(context.getBasePath()));
        this.semanticVersionService = new SemanticVersionService(GitProviderAdapter.getInstance());
    }

    async initializeCurrentVersion(): Promise<FireflyResult<void>> {
        logger.verbose("BumpStrategyService: Initializing current version...");
        const currentVersion = await this.versionRepository.getCurrentVersion();
        if (currentVersion.isErr()) {
            return err(currentVersion.error);
        }
        logger.verbose(`BumpStrategyService: Current version is ${currentVersion.value}`);

        const version = currentVersion.value;
        const versionString = version.toString();

        this.context.setCurrentVersion(versionString);

        return ok(undefined);
    }

    async promptForStrategy(): Promise<FireflyResult<BumpStrategyNonOptional>> {
        logger.verbose("BumpStrategyService: Prompting for version bump strategy...");
        const promptResult = await this.promptStrategy.generateVersionStrategyChoices();
        if (promptResult.isErr()) {
            return err(promptResult.error);
        }

        const selectedStrategy = promptResult.value;
        if (logger.level !== LogLevels.verbose && selectedStrategy !== VersionStrategyPromptAdapter.MANUAL_BUMP) {
            logger.log("");
        }

        logger.verbose(`BumpStrategyService: User selected strategy: '${selectedStrategy}'`);
        if (!this.isValidStrategy(selectedStrategy)) {
            return err(new TaskExecutionError(`Invalid version bump strategy selected: ${selectedStrategy}`));
        }

        logger.verbose(`BumpStrategyService: Returning selected strategy: '${selectedStrategy}'`);
        return ok(selectedStrategy);
    }

    async executeStrategy(strategy: BumpStrategyNonOptional): Promise<FireflyResult<void>> {
        logger.verbose(`BumpStrategyService: Executing strategy: '${strategy}'`);
        const handler = this.strategyHandlers[strategy];
        if (!handler) {
            return err(new TaskExecutionError(`No handler found for strategy: ${strategy}`));
        }

        return handler();
    }

    async determineAndExecuteStrategy(): Promise<FireflyResult<void>> {
        logger.verbose("BumpStrategyService: Determining and executing version bump strategy...");
        const getCurrentVersionResult = await this.initializeCurrentVersion();
        if (getCurrentVersionResult.isErr()) {
            return err(getCurrentVersionResult.error);
        }
        logger.info(`Current version: ${this.context.getCurrentVersion()}`);

        const config = this.context.getConfig();
        const strategy = config.bumpStrategy;

        // If no strategy configured or set to manual, prompt user
        if (!strategy || strategy === VersionStrategyPromptAdapter.MANUAL_BUMP) {
            logger.verbose("BumpStrategyService: No strategy configured or set to manual, prompting user...");

            if (config.releaseType) {
                logger.verbose(`BumpStrategyService: releaseType '${config.releaseType}' provided, skipping prompt.`);
                return this.handleStraightBump();
            }

            logger.verbose("BumpStrategyService: No releaseType provided, prompting user...");
            const strategyResult = await this.promptForStrategy();

            if (strategyResult.isErr()) {
                return err(strategyResult.error);
            }

            return this.executeStrategy(strategyResult.value);
        }

        logger.verbose(`BumpStrategyService: Using configured strategy: '${strategy}'`);
        return this.executeStrategy(strategy);
    }

    private createStrategyHandlers(): StrategyHandlers {
        return {
            auto: () => this.executeAutomaticBump(),
            manual: () => this.executeManualBump(),
        };
    }

    private async executeManualBump(): Promise<FireflyResult<void>> {
        const handle = await this.handleManualBump();
        if (handle.isErr()) {
            return err(handle.error);
        }

        logger.verbose("BumpStrategyService: Manual bump executed successfully.");
        return ok(undefined);
    }

    private async executeAutomaticBump(): Promise<FireflyResult<void>> {
        const handle = await this.handleAutomaticBump();
        if (handle.isErr()) {
            return err(handle.error);
        }

        logger.verbose("BumpStrategyService: Automatic bump executed successfully.");
        return ok(undefined);
    }

    private async handleManualBump(): Promise<FireflyResult<void>> {
        logger.verbose("BumpStrategyService: Handling manual bump...");
        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            return err(new TaskExecutionError("Current version is not set in the context"));
        }

        const opts = this.context.getConfig();

        logger.verbose(
            `BumpStrategyService: Prompting for next version (manual) from current version: ${currentVersion}`,
        );
        const nextVersionResult = await this.versionPrompt.generateVersionChoices({
            currentVersion,
            releaseType: opts.releaseType,
            preReleaseId: opts.preReleaseId,
            preReleaseBase: opts.preReleaseBase,
        });

        if (nextVersionResult.isErr()) {
            return err(nextVersionResult.error);
        }

        const nextVersion = nextVersionResult.value;
        if (logger.level !== LogLevels.verbose) logger.log("");
        logger.info(`Next version determined: ${nextVersion}`);

        this.context.setNextVersion(nextVersion);
        logger.verbose(`BumpStrategyService: Manual bump set next version to: ${nextVersion}`);
        return ok(undefined);
    }

    private async handleStraightBump(): Promise<FireflyResult<void>> {
        logger.verbose("BumpStrategyService: Handling straight bump...");
        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            return err(new TaskExecutionError("Current version is not set in the context"));
        }

        const opts = this.context.getConfig();

        logger.verbose(
            `BumpStrategyService: Deciding next version from current: ${currentVersion}, releaseType: ${opts.releaseType}`,
        );
        const versionDecider = new VersionDeciderService();
        const nextVersionResult = versionDecider.decideNextVersion({
            currentVersion,
            releaseType: this.determineReleaseType(opts.releaseType),
            preReleaseId: opts.preReleaseId,
            preReleaseBase: opts.preReleaseBase,
        });
        if (nextVersionResult.isErr()) {
            return err(nextVersionResult.error);
        }

        const nextVersion = nextVersionResult.value;
        logger.info(`Next version determined: ${nextVersion}`);

        this.context.setNextVersion(nextVersion);
        logger.verbose(`BumpStrategyService: Straight bump set next version to: ${nextVersion}`);
        return ok(undefined);
    }

    private async handleAutomaticBump(): Promise<FireflyResult<void>> {
        logger.verbose("BumpStrategyService: Handling automatic bump...");
        const currentVersion = this.context.getCurrentVersion();
        if (!currentVersion) {
            return err(new TaskExecutionError("Current version is not set in the context"));
        }

        logger.verbose("BumpStrategyService: Getting version recommendation from semantic analysis...");
        const recommendationResult = await this.semanticVersionService.getVersionRecommendation();
        if (recommendationResult.isErr()) {
            return err(recommendationResult.error);
        }

        const recommendation = recommendationResult.value;

        const config = this.context.getConfig();
        const versionDecider = new VersionDeciderService();

        const releaseType = this.determineReleaseType(config.releaseType, recommendation.releaseType as ReleaseType);
        logger.verbose(
            `BumpStrategyService: Deciding next version from current: ${currentVersion}, releaseType: ${releaseType}`,
        );

        const nextVersionResult = versionDecider.decideNextVersion({
            currentVersion,
            releaseType,
            preReleaseId: config.preReleaseId,
            preReleaseBase: config.preReleaseBase,
        });
        if (nextVersionResult.isErr()) {
            return err(nextVersionResult.error);
        }

        const nextVersion = nextVersionResult.value;
        logger.info(recommendation.reason);
        logger.info(`Next version determined: ${nextVersion}`);

        this.context.setNextVersion(nextVersion);
        logger.verbose(`BumpStrategyService: Automatic bump set next version to: ${nextVersion}`);
        return ok(undefined);
    }

    private determineReleaseType(configuredType?: ReleaseTypeNonOptional, recommendedType?: ReleaseType): ReleaseType {
        if (configuredType) {
            return configuredType;
        }

        if (recommendedType) {
            return recommendedType;
        }

        return "patch";
    }

    private isValidStrategy(strategy: string): strategy is BumpStrategyNonOptional {
        return strategy === "auto" || strategy === "manual";
    }
}
