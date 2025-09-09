import { Result, err, ok } from "neverthrow";
import { BumpVersionService, type VersionChoicesArgs } from "#/modules/semver/services/bump-version.service";
import { Version } from "#/modules/semver/version.domain";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import type { FireflyResult } from "#/shared/utils/result.util";
import type { ReleaseType } from "../constants/release-type.constant";

type RELEASE_VERSION_TYPES = "RELEASE" | "PRERELEASE" | "CONTINUATION" | "GRADUATION";
type VERSION_CHOICES = "LATEST_IS_PRERELEASE" | "PRE_RELEASE" | "DEFAULT";

export class VersionChoicesService {
    private static readonly VERSION_TYPES: Record<RELEASE_VERSION_TYPES, ReleaseType[]> = {
        RELEASE: ["patch", "minor", "major"],
        PRERELEASE: ["prepatch", "preminor", "premajor"],
        CONTINUATION: ["prerelease"],
        GRADUATION: ["graduate"],
    };

    private static readonly VERSION_CHOICES: Record<VERSION_CHOICES, ReleaseType[]> = {
        LATEST_IS_PRERELEASE: [
            ...VersionChoicesService.VERSION_TYPES.CONTINUATION,
            ...VersionChoicesService.VERSION_TYPES.RELEASE,
        ],
        PRE_RELEASE: VersionChoicesService.VERSION_TYPES.PRERELEASE,
        DEFAULT: [...VersionChoicesService.VERSION_TYPES.RELEASE, ...VersionChoicesService.VERSION_TYPES.PRERELEASE],
    };

    private static readonly VERSION_DESCRIPTIONS: Record<ReleaseType, string> = {
        patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
        minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
        major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
        prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
        preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
        premajor: "Unstable major release candidate. Used for testing breaking changes before a major release.",
        prerelease: "Unstable pre-release continuation.",
        graduate: "Promotes a pre-release to a stable release.",
    };

    createVersionChoices(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice[]> {
        const availableVersionTypes = this.determineAvailableVersionTypes(options.currentVersion, options.releaseType);
        const choicesResult = availableVersionTypes.map((releaseType) =>
            this.createVersionChoice({
                currentVersion: options.currentVersion,
                releaseType,
                preReleaseId: options.preReleaseId,
                preReleaseBase: options.preReleaseBase,
            }),
        );

        return Result.combine(choicesResult);
    }

    private determineAvailableVersionTypes(currentVersion: string, releaseType?: ReleaseType): readonly ReleaseType[] {
        if (releaseType !== undefined) {
            return this.getVersionTypesFromReleaseType(releaseType);
        }

        const isPreRelease = Version.isPreRelease(currentVersion);
        return isPreRelease
            ? VersionChoicesService.VERSION_CHOICES.LATEST_IS_PRERELEASE
            : VersionChoicesService.VERSION_CHOICES.DEFAULT;
    }

    private getVersionTypesFromReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
        return releaseType === "prerelease"
            ? VersionChoicesService.VERSION_CHOICES.PRE_RELEASE
            : VersionChoicesService.VERSION_CHOICES.DEFAULT;
    }

    private createVersionChoice(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice> {
        const version = this.computeNewVersion(options);
        if (version.isErr()) {
            return err(version.error);
        }

        const choice: PromptSelectChoice = {
            label: `${options.releaseType} (${version.value.toString()})`,
            hint: this.getVersionDescription(options.releaseType as ReleaseType),
            value: version.value.toString(),
        };

        return ok(choice);
    }

    private computeNewVersion(options: VersionChoicesArgs): FireflyResult<string> {
        const version = Version.create(options.currentVersion);
        if (version.isErr()) {
            return err(version.error);
        }

        const newVersion = BumpVersionService.bump({
            currentVersion: version.value,
            releaseType: options.releaseType,
            preReleaseBase: options.preReleaseBase,
            preReleaseId: options.preReleaseId,
        });
        if (newVersion.isErr()) {
            return err(newVersion.error);
        }

        return newVersion.map((v) => v.toString());
    }

    private getVersionDescription(increment: ReleaseType): string {
        return VersionChoicesService.VERSION_DESCRIPTIONS[increment] ?? "";
    }
}
