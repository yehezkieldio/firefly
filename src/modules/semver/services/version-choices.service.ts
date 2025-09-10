import { Result, err, ok } from "neverthrow";
import type { PreReleaseBase } from "#/modules/semver/constants/pre-release-base.constant";
import type { ReleaseType } from "#/modules/semver/constants/release-type.constant";
import { type VersionBumpOptions, VersionManager } from "#/modules/semver/services/version-manager.service";
import type { Version } from "#/modules/semver/version.domain";
import { logger } from "#/shared/logger";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface VersionChoicesArgs {
    currentVersion: Version;
    releaseType?: ReleaseType;
    prereleaseIdentifier?: string;
    prereleaseBase?: PreReleaseBase;
}

export class VersionChoicesService {
    private static readonly VERSION_TYPES = {
        RELEASE: ["patch", "minor", "major"] as const,
        PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
        CONTINUATION: ["prerelease"] as const,
        GRADUATION: ["graduate"] as const,
    } as const;

    private static readonly VERSION_CHOICES = {
        latestIsPreRelease: [
            ...VersionChoicesService.VERSION_TYPES.CONTINUATION,
            ...VersionChoicesService.VERSION_TYPES.GRADUATION,
            ...VersionChoicesService.VERSION_TYPES.RELEASE,
        ],
        preRelease: VersionChoicesService.VERSION_TYPES.PRERELEASE,
        default: [...VersionChoicesService.VERSION_TYPES.RELEASE, ...VersionChoicesService.VERSION_TYPES.PRERELEASE],
    } as const;

    private static readonly VERSION_DESCRIPTIONS: Record<string, string> = {
        patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
        minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
        major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
        prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
        preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
        premajor: "Unstable major release candidate. Used for testing breaking changes before a major release.",
        prerelease: "Unstable pre-release continuation. Increments the pre-release number or changes identifier.",
        graduate: "Promote pre-release to stable. Removes pre-release identifiers to create a stable version.",
    };

    createVersionChoices(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice[]> {
        logger.verbose(`VersionChoicesService: Creating version choices for '${options.currentVersion.raw}'...`);

        const availableTypes = this.determineAvailableVersionTypes(options.currentVersion, options.releaseType);

        const choicesResults = availableTypes.map((releaseType) =>
            this.createVersionChoice({
                currentVersion: options.currentVersion,
                releaseType,
                prereleaseIdentifier: options.prereleaseIdentifier,
                prereleaseBase: options.prereleaseBase,
            }),
        );

        const combinedResult = Result.combine(choicesResults);
        if (combinedResult.isErr()) {
            return err(combinedResult.error);
        }

        logger.verbose(`VersionChoicesService: Created ${combinedResult.value.length} version choices.`);
        return ok(combinedResult.value);
    }

    private determineAvailableVersionTypes(currentVersion: Version, releaseType?: ReleaseType): readonly ReleaseType[] {
        if (releaseType !== undefined) {
            return this.getVersionTypesForReleaseType(releaseType);
        }

        const isCurrentPreRelease = currentVersion.isPrerelease;
        return isCurrentPreRelease
            ? VersionChoicesService.VERSION_CHOICES.latestIsPreRelease
            : VersionChoicesService.VERSION_CHOICES.default;
    }

    private getVersionTypesForReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
        return releaseType === "prerelease"
            ? VersionChoicesService.VERSION_CHOICES.preRelease
            : VersionChoicesService.VERSION_CHOICES.default;
    }

    private createVersionChoice(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice> {
        const newVersionResult = this.computeNewVersion(options);

        if (newVersionResult.isErr()) {
            return err(newVersionResult.error);
        }

        const newVersion = newVersionResult.value;
        const releaseType = options.releaseType || "patch";

        const choice: PromptSelectChoice = {
            label: `${releaseType} (${newVersion.raw})`,
            hint: this.getVersionDescription(releaseType),
            value: newVersion.raw,
        };

        return ok(choice);
    }

    private computeNewVersion(options: VersionChoicesArgs): FireflyResult<Version> {
        if (!options.releaseType) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Release type is required to compute new version",
                }),
            );
        }

        const bumpOptions: VersionBumpOptions = {
            currentVersion: options.currentVersion,
            releaseType: options.releaseType,
            prereleaseIdentifier: options.prereleaseIdentifier,
            prereleaseBase: options.prereleaseBase,
        };

        return VersionManager.bumpVersion(bumpOptions);
    }

    private getVersionDescription(releaseType: ReleaseType): string {
        return VersionChoicesService.VERSION_DESCRIPTIONS[releaseType] ?? "";
    }
}
