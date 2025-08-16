import { LogLevels } from "consola";
import { err, ok, ResultAsync } from "neverthrow";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { VersionInferenceError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export class VersionStrategyPromptAdapter {
    static AUTOMATIC_BUMP = "auto";
    static MANUAL_BUMP = "manual";

    private static readonly STRATEGIES: PromptSelectChoice[] = [
        {
            label: "Automatic Bump",
            value: VersionStrategyPromptAdapter.AUTOMATIC_BUMP,
            hint: "Automatically determine the version bump using conventional commits",
        },
        {
            label: "Manual Bump",
            value: VersionStrategyPromptAdapter.MANUAL_BUMP,
            hint: "Manually select the version bump",
        },
    ] as const;

    private static readonly DEFAULT_STRATEGY_INDEX = 1;

    async generateVersionStrategyChoices(): Promise<FireflyResult<string>> {
        logger.verbose("VersionStrategyPromptAdapter: Generating version strategy choices...");
        const defaultStrategy =
            VersionStrategyPromptAdapter.STRATEGIES[VersionStrategyPromptAdapter.DEFAULT_STRATEGY_INDEX];

        if (!defaultStrategy) {
            return err(new VersionInferenceError("Default version strategy not found"));
        }

        logger.verbose(`VersionStrategyPromptAdapter: Default strategy is '${defaultStrategy.value}'`);

        const promptResult = await this.promptUser(defaultStrategy.value);
        if (promptResult.isErr()) {
            return err(promptResult.error);
        }

        const selectedStrategy = promptResult.value;
        logger.verbose(`VersionStrategyPromptAdapter: User selected strategy: '${selectedStrategy}'`);
        if (!selectedStrategy || selectedStrategy === "") {
            return err(new VersionInferenceError("No version strategy selected"));
        }

        logger.verbose(`VersionStrategyPromptAdapter: Returning selected strategy: '${selectedStrategy}'`);
        return ok(selectedStrategy);
    }

    private async promptUser(defaultValue: string): Promise<AsyncFireflyResult<string>> {
        logger.verbose(
            `VersionStrategyPromptAdapter: Prompting user for version strategy (default: '${defaultValue}')`,
        );
        const promptResult = await this.createPrompt(defaultValue);
        if (promptResult.isErr()) {
            return err(promptResult.error);
        }
        if (logger.level === LogLevels.verbose) promptResult.andTee(() => logger.log(""));

        logger.verbose(`VersionStrategyPromptAdapter: User input received: '${promptResult.value}'`);
        return promptResult.andThen((strategy) => this.validateStrategy(strategy));
    }

    private createPrompt(defaultValue: string): AsyncFireflyResult<string> {
        logger.verbose("VersionStrategyPromptAdapter: Creating prompt for version strategy selection");
        const prompt = logger.prompt("Select version strategy", {
            type: "select",
            options: VersionStrategyPromptAdapter.STRATEGIES,
            initial: defaultValue,
            cancel: "reject",
        });

        return ResultAsync.fromPromise(prompt, (e) => new VersionInferenceError("Failed to prompt user", e as Error));
    }

    private validateStrategy(strategy: string): FireflyResult<string> {
        const validStrategies = VersionStrategyPromptAdapter.STRATEGIES.map((s) => s.value);

        logger.verbose(`VersionStrategyPromptAdapter: Validating selected strategy: '${strategy}'`);
        if (!validStrategies.includes(strategy)) {
            return err(
                new VersionInferenceError(
                    `Invalid version strategy: ${strategy}. Valid strategies are: ${validStrategies.join(", ")}`,
                ),
            );
        }

        logger.verbose(`VersionStrategyPromptAdapter: Strategy '${strategy}' is valid.`);
        return ok(strategy);
    }
}
