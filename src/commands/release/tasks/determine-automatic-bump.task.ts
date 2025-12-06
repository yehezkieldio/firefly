import { colors } from "consola/utils";
import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyErrAsync, FireflyOkAsync, validationErr } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { BUMP_STRATEGY_AUTO } from "#/domain/semver/semver.strategies";
import { Version } from "#/domain/semver/version";
import { logger } from "#/infrastructure/logging";
import type { ResolveVersionOptions } from "#/services/contracts/version-strategy.interface";

/**
 * Parses the current version from a raw string.
 *
 * @param currentVersionRaw - The raw string representing the current version
 * @returns A FireflyResult containing the parsed Version or a validation error
 */
function parseCurrentVersion(currentVersionRaw: string | undefined): FireflyResult<Version> {
    if (!currentVersionRaw) {
        return validationErr({
            message: "Current version is undefined",
        });
    }

    return Version.from(currentVersionRaw);
}

/**
 * Logs the analysis recommendation with formatting.
 *
 * @param reason - The reason string from the recommendation
 */
function logRecommendation(reason: string | undefined): void {
    if (!reason) return;

    if (reason.startsWith("Analysis found:")) {
        const prefix = "Analysis found:";
        const details = reason.slice(prefix.length).trim();
        logger.info(`${prefix} ${colors.green(details)}`);
    } else {
        logger.info(reason);
    }
}

/**
 * Performs the automatic bump by analyzing commits and resolving version strategy.
 */
function executeAutomaticBump(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    const currentVersionResult = parseCurrentVersion(ctx.data.currentVersion);
    if (currentVersionResult.isErr()) return FireflyErrAsync(currentVersionResult.error);

    const currentVersion = currentVersionResult.value;

    return ctx.services.commitAnalysis
        .analyzeForVersion()
        .andThen((recommendation) => {
            logRecommendation(recommendation.reason);

            const options: ResolveVersionOptions = {
                currentVersion,
                preReleaseID: ctx.config.preReleaseID,
                preReleaseBase: ctx.config.preReleaseBase,
            };

            return ctx.services.versionStrategy.resolveVersion(options, recommendation);
        })
        .andThen((newVersion) => {
            const from = ctx.data.currentVersion || "unknown";
            logger.info(`Determined version: ${colors.green(from)} -> ${colors.green(newVersion.raw)}`);
            return FireflyOkAsync(ctx.fork("nextVersion", newVersion.toString()));
        });
}

export function createDetermineAutomaticBump(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("determine-automatic-bump")
        .description("Automatically determines the version bump from commit messages")
        .dependsOn("delegate-bump-strategy")
        .skipWhenWithReason((ctx) => {
            const bumpStrategy = ctx.data.selectedBumpStrategy ?? ctx.config.bumpStrategy;
            return ctx.config.skipBump || bumpStrategy !== BUMP_STRATEGY_AUTO;
        }, "Skipped: skipBump enabled or bumpStrategy is not 'auto'")
        .execute((ctx) => executeAutomaticBump(ctx))
        .build();
}
