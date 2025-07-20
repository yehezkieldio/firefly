import { err, ResultAsync } from "neverthrow";
import type { ReleaseType } from "semver";
import { VersionChoiceService } from "#/core/services/version-choice.service";
import { FireflyError, VersionError } from "#/shared/utils/error";
import { logger } from "#/shared/utils/logger";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class VersionPromptAdapter {
    private readonly versionChoiceService: VersionChoiceService;

    constructor(versionChoiceService: VersionChoiceService = new VersionChoiceService()) {
        this.versionChoiceService = versionChoiceService;
    }

    generateVersionChoices(currentVersion: string, releaseType: ReleaseType): AsyncFireflyResult<string> {
        if (!currentVersion?.trim()) {
            return ResultAsync.fromSafePromise(
                Promise.resolve(err(new VersionError("Current version cannot be empty")))
            ).andThen((result) => result);
        }

        if (!releaseType?.trim()) {
            return ResultAsync.fromSafePromise(
                Promise.resolve(err(new VersionError("Release type cannot be empty")))
            ).andThen((result) => result);
        }

        const versionsResult = this.versionChoiceService.createVersionChoices(currentVersion, releaseType);
        if (versionsResult.isErr()) {
            return ResultAsync.fromSafePromise(Promise.resolve(err(versionsResult.error))).andThen((result) => result);
        }

        const versions = versionsResult.value;
        if (versions.length === 0) {
            return ResultAsync.fromSafePromise(
                Promise.resolve(err(new VersionError("No versions available for selection")))
            ).andThen((result) => result);
        }

        return ResultAsync.fromPromise(
            this.promptUser(versions),
            (error) =>
                new VersionError(
                    `Failed to get version selection: ${error instanceof Error ? error.message : error}`,
                    error as Error
                )
        );
    }

    private async promptUser(versions: Array<{ value: string; label: string; hint?: string }>): Promise<string> {
        const firstVersion = versions[0];
        if (!firstVersion) {
            throw new FireflyError("No versions available for selection", "NO_VERSIONS_AVAILABLE");
        }

        try {
            const result = await logger.prompt("Select version bump", {
                type: "select",
                options: versions,
                initial: firstVersion.value,
                cancel: "reject",
            });

            if (!result || typeof result !== "string") {
                throw new FireflyError("Invalid version selection received from prompt", "INVALID_VERSION_SELECTION");
            }

            return this.validateSelectedVersion(result, versions);
        } catch (error) {
            if (error instanceof Error && error.message.includes("canceled")) {
                throw new FireflyError("Version selection was canceled by user", "VERSION_SELECTION_CANCELED");
            }
            throw error;
        }
    }

    private validateSelectedVersion(
        selectedVersion: string,
        availableVersions: Array<{ value: string; label: string; hint?: string }>
    ): string {
        const validVersions = availableVersions.map((v) => v.value);

        if (!validVersions.includes(selectedVersion)) {
            throw new FireflyError(
                `Invalid version selected: ${selectedVersion}. Valid options: ${validVersions.join(", ")}`,
                "INVALID_VERSION_SELECTION"
            );
        }

        return selectedVersion;
    }
}
