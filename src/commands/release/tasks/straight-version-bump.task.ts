import { colors } from "consola/utils";
import type { ReleaseContext } from "#/commands/release/release.context";
import { FireflyErrAsync, FireflyOkAsync, invalidErrAsync, validationErr } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { TaskBuilder } from "#/core/task/task.builder";
import type { Task } from "#/core/task/task.types";
import { Version } from "#/domain/semver/version";
import { logger } from "#/infrastructure/logging";
import type { VersionBumpOptions } from "#/services/contracts/version-bumper.interface";

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
 * Builds the bump options from the release context.
 */
function buildBumpOptionsFromContext(ctx: ReleaseContext): FireflyAsyncResult<VersionBumpOptions> {
    const currentVersionResult = parseCurrentVersion(ctx.data.currentVersion);
    if (currentVersionResult.isErr()) return FireflyErrAsync(currentVersionResult.error);

    const releaseType = ctx.config.releaseType;
    if (releaseType === undefined) {
        return invalidErrAsync({
            message: "Release type is required for straight bump",
        });
    }

    const currentVersion = currentVersionResult.value;

    const bumpOptions: VersionBumpOptions = {
        currentVersion,
        releaseType,
        preReleaseId: ctx.config.preReleaseId,
        preReleaseBase: ctx.config.preReleaseBase,
    };

    return FireflyOkAsync(bumpOptions);
}

/**
 * Performs the straight bump by delegating to the version bumper service.
 */
function executeStraightVersionBump(ctx: ReleaseContext): FireflyAsyncResult<ReleaseContext> {
    return buildBumpOptionsFromContext(ctx)
        .andThen((options) => ctx.services.versionBumper.bump(options))
        .andThen((newVersion) => {
            const from = ctx.data.currentVersion || "unknown";
            logger.info(`Bumped version: ${colors.green(from)} -> ${colors.green(newVersion.raw)}`);
            return FireflyOkAsync(ctx.fork("nextVersion", newVersion.toString()));
        });
}

export function createStraightVersionBump(): FireflyResult<Task> {
    return TaskBuilder.create<ReleaseContext>("straight-version-bump")
        .description("Performs a direct version bump based on the configured release type")
        .dependsOn("initialize-release-version")
        .skipWhenWithReason(
            (ctx) => ctx.config.skipBump || ctx.config.releaseType === undefined,
            "Skipped: skipBump is enabled or no release type specified"
        )
        .execute((ctx) => executeStraightVersionBump(ctx))
        .build();
}
