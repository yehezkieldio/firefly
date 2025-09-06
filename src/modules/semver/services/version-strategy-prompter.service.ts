import { LogLevels } from "consola";
import { ResultAsync, err, ok } from "neverthrow";
import { BUMP_STRATEGY_AUTO } from "#/modules/semver/constants/bump-strategy.constant";
import { logger } from "#/shared/logger";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class VersionStrategyPrompterService {
    private static readonly STRATEGIES: PromptSelectChoice[] = [
        {
            label: "Automatic Bump",
            value: BUMP_STRATEGY_AUTO,
            hint: "Determines the next version based on conventional commits history",
        },
        {
            label: "Manual Bump",
            value: "manual",
            hint: "Manually specify the next version",
        },
    ] as const;

    async run(): Promise<FireflyResult<string>> {
        const defaultStrategy = VersionStrategyPrompterService.STRATEGIES[1];

        if (!defaultStrategy) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "No default version bump strategy found",
                    source: "semver/version-strategy-prompter-service",
                }),
            );
        }

        const prompt = await this.prompt(defaultStrategy.value);
        if (prompt.isErr()) {
            return err(prompt.error);
        }

        const selectedStrategy = prompt.value;
        if (!selectedStrategy || selectedStrategy === "") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "No version bump strategy selected",
                    source: "semver/version-strategy-prompter-service",
                }),
            );
        }

        return ok(selectedStrategy);
    }

    private async prompt(defaultValue: string): Promise<FireflyResult<string>> {
        const prompter = await this.createPrompter(defaultValue);
        if (prompter.isErr()) {
            return err(prompter.error);
        }
        if (logger.level === LogLevels.verbose) prompter.andTee(() => logger.log(""));

        return prompter.andThen((strategy) => this.validateStrategy(strategy));
    }

    private createPrompter(defaultValue: string): FireflyAsyncResult<string> {
        const prompt = logger.prompt("Select version bump strategy", {
            type: "select",
            options: VersionStrategyPrompterService.STRATEGIES,
            initial: defaultValue,
            cancel: "reject",
        });

        return ResultAsync.fromPromise(prompt, (e) => createFireflyError(toFireflyError(e)));
    }

    private validateStrategy(strategy: string): FireflyResult<string> {
        const validStrategies = VersionStrategyPrompterService.STRATEGIES.map((s) => s.value);
        if (!validStrategies.includes(strategy)) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Invalid version bump strategy: ${strategy}`,
                    source: "semver/version-strategy-prompter-service",
                }),
            );
        }

        return ok(strategy);
    }
}
