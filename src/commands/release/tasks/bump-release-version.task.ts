import { colors } from "consola/utils";
import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyErrAsync, FireflyOk, FireflyOkAsync, validationErr } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

const PACKAGE_JSON_FILE = "package.json";

/**
 * Updates the configured package.json with the next version.
 *
 * @param ctx - The current release context
 * @returns A FireflyAsyncResult resolving to the release context after update
 */
function updatePackageJsonVersion(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    return ctx.services.packageJson.updateVersion(PACKAGE_JSON_FILE, ctx.data.nextVersion as string).map(() => ctx);
}

/**
 * Restores a previous version value in the configured package.json.
 *
 * @param ctx - The current release context
 * @param previousVersion - The previous version string to restore
 * @returns A FireflyAsyncResult resolving to the release context after restore
 */
function restorePackageJsonVersion(ctx: ReleaseContext, previousVersion: string): FireflyAsyncResult<ReleaseContext> {
    return ctx.services.packageJson.updateVersion(PACKAGE_JSON_FILE, previousVersion).map(() => ctx);
}

/**
 * Validates that the release context contains a next version value.
 *
 * @param ctx - The current release context
 * @returns A FireflyResult with the next version or a validation error
 */
function parseNextVersion(ctx: ReleaseContext): FireflyResult<string> {
    const nextVersion = ctx.data.nextVersion;
    if (!nextVersion) {
        return validationErr({ message: "Next version is undefined" });
    }

    return FireflyOk(nextVersion);
}

/**
 * Creates the Bump Release Version task.
 *
 * This task updates the version of the project to the next version determined
 * by earlier steps. Specifically, it:
 * 1. Validates that a `nextVersion` exists in the release context
 * 2. Writes the `nextVersion` into the configured package.json file
 * 3. Provides an undo operation that restores the original version
 */
export function createBumpReleaseVersion(): FireflyResult<Task> {
    /**
     * Holds the previous version before bumping, for undo purposes if needed.
     */
    let previousVersion: string | undefined;

    return TaskBuilder.create<ReleaseContext>("bump-release-version")
        .description("Applies the new version bump to relevant files")
        .dependsOnAll(
            "straight-version-bump",
            "determine-automatic-bump",
            "prompt-manual-version",
            "prompt-bump-strategy"
        )
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || !ctx.data.nextVersion,
            "Skipped: skipBump is enabled or next version is not set"
        )
        .execute((ctx) => {
            previousVersion = ctx.data.currentVersion;

            const nextVersionRes = parseNextVersion(ctx);
            if (nextVersionRes.isErr()) return FireflyErrAsync(nextVersionRes.error);

            logger.info(`Next version to be released: ${colors.green(nextVersionRes.value as string)}`);

            return updatePackageJsonVersion(ctx).andTee(() =>
                logger.success("package.json version updated successfully.")
            );
        })
        .withUndo((ctx) => {
            if (!previousVersion) {
                logger.verbose("BumpReleaseVersionTask: Previous version is undefined, skipping undo operation.");
                return FireflyOkAsync(undefined);
            }

            return restorePackageJsonVersion(ctx, previousVersion).map(() => undefined);
        })
        .build();
}
