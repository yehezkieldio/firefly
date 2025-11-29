/**
 * Prompt Bump Strategy Task
 *
 * Prompts the user to select a bump strategy when no specific release type
 * is provided in the configuration. This task provides an interactive flow
 * for determining how to bump the version.
 *
 * @module commands/release/tasks/prompt-bump
 */

import { errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import { BUMP_STRATEGY_AUTO, BUMP_STRATEGY_MANUAL, type ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { createFireflyError, toFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";
import { invalidErr } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Bump Strategy Prompter
// ============================================================================

interface PromptSelectChoice {
    label: string;
    value: string;
    hint?: string;
}

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
 */
function validateStrategy(strategy: string): FireflyResult<string> {
    if (!VALID_STRATEGY_VALUES.includes(strategy)) {
        return invalidErr({
            message: `Invalid version bump strategy: ${strategy}`,
            source: "prompt-bump-strategy",
        });
    }
    return ok(strategy);
}

/**
 * Prompts the user to select a bump strategy using the logger's prompt API.
 */
function promptBumpStrategy(): FireflyAsyncResult<string> {
    const defaultStrategy = BUMP_STRATEGIES[0];

    if (!defaultStrategy) {
        return errAsync(
            createFireflyError({
                code: "NOT_FOUND",
                message: "No default version bump strategy found",
                source: "prompt-bump-strategy",
            })
        );
    }

    logger.verbose("Prompting user for version bump strategy.");

    const promptPromise = logger.prompt("Select version bump strategy", {
        type: "select",
        options: BUMP_STRATEGIES as unknown as string[],
        initial: defaultStrategy.value,
        cancel: "reject",
    });

    return ResultAsync.fromPromise(promptPromise, (e) => createFireflyError(toFireflyError(e))).andThen((selected) => {
        if (!selected || selected === "") {
            return errAsync(
                createFireflyError({
                    code: "INVALID",
                    message: "No version bump strategy selected",
                    source: "prompt-bump-strategy",
                })
            );
        }

        const validationResult = validateStrategy(selected);
        if (validationResult.isErr()) {
            return errAsync(validationResult.error);
        }

        logger.verbose(`User selected version bump strategy: '${selected}'`);
        return okAsync(selected);
    });
}

// ============================================================================
// Task Definition
// ============================================================================

/**
 * Creates the Prompt Bump Strategy Task.
 *
 * This task is executed when no specific release type is provided in the
 * configuration. It will prompt the user to select a bump strategy
 * (auto or manual) interactively.
 *
 * This is the first step in the "prompted bump" flow, as opposed to the
 * "direct bump" flow where the user specifies the release type upfront.
 *
 * @example
 * ```ts
 * const task = createPromptBumpStrategyTask();
 * // When config.releaseType is undefined
 * // Prompts user to select bump strategy
 * ```
 */
export function createPromptBumpStrategyTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-bump-strategy")
        .description("Prompts the user to select a version bump strategy")
        .dependsOn("initialize-version")
        .skipWhenWithReason(
            // Execute when neither bumpStrategy nor releaseType is set
            (ctx) => ctx.config.skipBump || Boolean(ctx.config.bumpStrategy) || Boolean(ctx.config.releaseType),
            "Skipped: skipBump enabled, or bumpStrategy/releaseType already specified"
        )
        .execute((ctx) => {
            logger.info("[prompt-bump-strategy] Prompting for bump strategy...");

            return promptBumpStrategy().map((selectedStrategy) =>
                ctx.fork("selectedBumpStrategy", selectedStrategy as ReleaseData["selectedBumpStrategy"])
            );
        })
        .build();
}
