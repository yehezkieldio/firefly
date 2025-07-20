import { err, ResultAsync } from "neverthrow";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice";
import { ConfigurationError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class VersionStrategyPromptAdapter {
    private static readonly STRATEGIES: PromptSelectChoice[] = [
        {
            label: "Automatic Bump",
            value: "auto",
            hint: "Automatically determine the version bump using conventional commits",
        },
        {
            label: "Manual Bump",
            value: "manual",
            hint: "Manually select the version bump",
        },
    ] as const;

    private static readonly DEFAULT_STRATEGY_INDEX = 1;

    generateVersionStrategyChoices(): AsyncFireflyResult<string> {
        const defaultStrategy =
            VersionStrategyPromptAdapter.STRATEGIES[VersionStrategyPromptAdapter.DEFAULT_STRATEGY_INDEX];
        if (!defaultStrategy) {
            return ResultAsync.fromSafePromise(
                Promise.resolve(err(new ConfigurationError("Default strategy configuration is invalid")))
            ).andThen((result) => result);
        }

        return ResultAsync.fromPromise(
            this.promptUser(defaultStrategy.value),
            (error) =>
                new ConfigurationError(
                    `Failed to get version strategy selection: ${error instanceof Error ? error.message : error}`,
                    error as Error
                )
        );
    }

    private async promptUser(defaultValue: string): Promise<string> {
        try {
            const result = await logger.prompt("Pick a version strategy", {
                type: "select",
                options: VersionStrategyPromptAdapter.STRATEGIES,
                initial: defaultValue,
                cancel: "reject",
            });

            if (!result || typeof result !== "string") {
                throw new Error("Invalid selection received from prompt");
            }

            return this.validateStrategy(result);
        } catch (error) {
            if (error instanceof Error && error.message.includes("canceled")) {
                throw new Error("Version strategy selection was canceled by user");
            }
            throw error;
        }
    }

    private validateStrategy(strategy: string): string {
        const validStrategies = VersionStrategyPromptAdapter.STRATEGIES.map((s) => s.value);

        if (!validStrategies.includes(strategy)) {
            throw new Error(`Invalid strategy selected: ${strategy}. Valid options: ${validStrategies.join(", ")}`);
        }

        return strategy;
    }
}
