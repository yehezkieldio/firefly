import { LogLevels } from "consola";
import type { ReleaseContext } from "#/commands/release/release.context";
import {
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    failedErrAsync,
    invalidErr,
    notFoundErrAsync,
} from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { wrapPromise } from "#/core/result/result.utilities";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL, type BumpStrategy } from "#/domain/semver/semver.strategies";
import { logger } from "#/infrastructure/logging";
import type { VersionChoice as PromptSelectChoice } from "#/services/contracts/version-strategy.interface";

const BUMP_STRATEGIES: readonly PromptSelectChoice[] = [
    {
        label: "Automatic Bump",
        value: BUMP_STRATEGY_AUTO,
        hint: "Determines the next version based on conventional commits history",
    },
    {
        label: "Manual Bump",
        value: BUMP_STRATEGY_MANUAL,
        hint: "Manually specify the next version",
    },
] as const;

const VALID_STRATEGY_VALUES = BUMP_STRATEGIES.map((s) => s.value);

/**
 * Validates that the selected strategy is one of the allowed values.
 *
 * @param strategy The selected version bump strategy.
 * @returns A FireflyResult indicating success or failure of validation.
 */
function validateStrategy(strategy: string): FireflyResult<string> {
    if (!VALID_STRATEGY_VALUES.includes(strategy)) {
        return invalidErr({
            message: `Invalid version bump strategy: ${strategy}`,
        });
    }
    return FireflyOk(strategy);
}

/**
 * Prompts the user to select a bump strategy using the logger's prompt API.
 */
function promptBumpStrategy(): FireflyAsyncResult<BumpStrategy> {
    const defaultStrategy = BUMP_STRATEGIES[0];

    if (!defaultStrategy) {
        return notFoundErrAsync({
            message: "No default version bump strategy found",
        });
    }

    logger.verbose("PromptBumpStrategyTask: Prompting user for version bump strategy.");

    const prompt = logger.prompt("Select version bump strategy", {
        type: "select",
        options: BUMP_STRATEGIES as unknown as string[],
        initial: defaultStrategy.value,
        cancel: "undefined",
    });

    return wrapPromise(prompt).andThen((selected) => {
        if (!selected || selected === "") {
            return failedErrAsync({
                message: "Operation cancelled by user",
            });
        }
        if (logger.level === LogLevels.verbose) logger.log("");
        if (logger.level !== LogLevels.verbose) logger.log("");

        const validationResult = validateStrategy(selected);
        if (validationResult.isErr()) {
            return FireflyErrAsync(validationResult.error);
        }

        logger.verbose(`PromptBumpStrategyTask: Selected version bump strategy: '${selected}'`);
        return FireflyOkAsync(selected as BumpStrategy);
    });
}

export function createPromptBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-bump-strategy")
        .description("Prompts the user for a version bump strategy")
        .dependsOn("initialize-release-version")
        .skipWhenWithReason(
            // Execute when neither bumpStrategy nor releaseType is set
            (ctx) => ctx.config.skipBump || Boolean(ctx.config.bumpStrategy) || Boolean(ctx.config.releaseType),
            "Skipped: skipBump enabled, or bumpStrategy/releaseType already specified"
        )
        .execute((ctx) =>
            promptBumpStrategy().andThen((strategy) => FireflyOkAsync(ctx.fork("selectedBumpStrategy", strategy)))
        )
        .build();
}
