/**
 * Prompt Manual Version Task
 *
 * Prompts the user to manually select a version bump type
 * when the bump strategy is set to "manual".
 *
 * @module commands/release/tasks/prompt-manual-version
 */

import { errAsync, ok, ResultAsync } from "neverthrow";
import { BUMP_STRATEGY_MANUAL, type ReleaseConfig } from "#/commands/release/config";
import type { ReleaseData } from "#/commands/release/data";
import type { WorkflowContext } from "#/context/workflow-context";
import { Version } from "#/semver/version";
import { createVersionChoices, type VersionChoice, type VersionChoicesArgs } from "#/semver/version-choices";
import type { ResolvedServices } from "#/services/service-registry";
import { TaskBuilder } from "#/task-system/task-builder";
import type { Task } from "#/task-system/task-types";
import { createFireflyError, toFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";
import { FireflyErrAsync, FireflyOkAsync, invalidErr } from "#/utils/result";

type ReleaseServices = ResolvedServices<"fs" | "git">;
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;

// ============================================================================
// Version Choice Prompter
// ============================================================================

/**
 * Validates that a version was selected and is valid.
 */
function validateVersionSelection(version: string, availableChoices: VersionChoice[]): FireflyResult<string> {
    const validVersions = availableChoices.map((choice) => choice.value);

    if (!validVersions.includes(version)) {
        return invalidErr({
            message: `Invalid version selected: ${version}. Valid options: ${validVersions.join(", ")}`,
            source: "prompt-manual-version",
        });
    }

    return ok(version);
}

/**
 * Prompts the user to select a version from the available choices.
 */
function promptVersionChoice(choices: VersionChoice[]): FireflyAsyncResult<string> {
    const defaultChoice = choices[0];

    if (!defaultChoice) {
        return FireflyErrAsync(
            createFireflyError({
                code: "NOT_FOUND",
                message: "No version choices available",
                source: "prompt-manual-version",
            })
        );
    }

    logger.verbose("[prompt-manual-version] Prompting user for version selection.");

    const promptPromise = logger.prompt("Select version bump", {
        type: "select",
        options: choices as unknown as string[],
        initial: defaultChoice.value,
        cancel: "reject",
    });

    return ResultAsync.fromPromise(promptPromise, (e) => createFireflyError(toFireflyError(e))).andThen((selected) => {
        if (!selected || selected === "") {
            return errAsync(
                createFireflyError({
                    code: "INVALID",
                    message: "No version selected",
                    source: "prompt-manual-version",
                })
            );
        }

        const validationResult = validateVersionSelection(selected, choices);
        if (validationResult.isErr()) {
            return errAsync(validationResult.error);
        }

        logger.verbose(`[prompt-manual-version] User selected version: '${selected}'`);
        return FireflyOkAsync(selected);
    });
}

/**
 * Runs the version choice prompt flow.
 */
function runVersionPrompt(ctx: ReleaseContext): FireflyAsyncResult<string> {
    const currentVersionStr = ctx.data.currentVersion;

    if (!currentVersionStr) {
        return FireflyErrAsync(
            createFireflyError({
                code: "INVALID",
                message: "Current version is required to generate version choices",
                source: "prompt-manual-version",
            })
        );
    }

    const versionResult = Version.from(currentVersionStr);
    if (versionResult.isErr()) {
        return errAsync(versionResult.error);
    }

    const options: VersionChoicesArgs = {
        currentVersion: versionResult.value,
        releaseType: ctx.config.releaseType,
        prereleaseIdentifier: ctx.config.preReleaseId,
        prereleaseBase: ctx.config.preReleaseBase,
    };

    const choicesResult = createVersionChoices(options);
    if (choicesResult.isErr()) {
        return errAsync(choicesResult.error);
    }

    const choices = choicesResult.value;
    if (choices.length === 0) {
        return FireflyErrAsync(
            createFireflyError({
                code: "NOT_FOUND",
                message: "No version choices available",
                source: "prompt-manual-version",
            })
        );
    }

    return promptVersionChoice(choices);
}

// ============================================================================
// Task Definition
// ============================================================================

/**
 * Determines whether the prompt should be skipped.
 */
function shouldSkipManualPrompt(ctx: ReleaseContext): boolean {
    const { skipBump, bumpStrategy } = ctx.config;
    const { selectedBumpStrategy } = ctx.data;

    // Skip if bump is disabled
    if (skipBump) return true;

    // Check both config and runtime-selected strategy
    const effectiveStrategy = selectedBumpStrategy ?? bumpStrategy;

    // Skip if strategy is not manual
    if (effectiveStrategy !== BUMP_STRATEGY_MANUAL) return true;

    return false;
}

/**
 * Creates the Prompt Manual Version Task.
 *
 * This task prompts the user to select a version bump type
 * (major, minor, patch, etc.) interactively when the bump
 * strategy is set to "manual".
 *
 * Executes when: bumpStrategy === "manual" (from config or runtime selection)
 */
export function createPromptManualVersionTask(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("prompt-manual-version")
        .description("Prompts user to manually select version bump type")
        .dependsOn("execute-bump-strategy")
        .skipWhenWithReason(shouldSkipManualPrompt, "Skipped: skipBump enabled or bumpStrategy is not 'manual'")
        .execute((ctx) => {
            logger.info("[prompt-manual-version] Prompting for manual version selection...");

            return runVersionPrompt(ctx).map((selectedVersion) => {
                logger.info(`[prompt-manual-version] Selected version: ${selectedVersion}`);
                return ctx.fork("nextVersion", selectedVersion);
            });
        })
        .build();
}
