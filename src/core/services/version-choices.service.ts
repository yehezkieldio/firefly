import { err, ok, Result } from "neverthrow";
import semver, { type ReleaseType } from "semver";
import { Version } from "#/core/domain/version";
import { SemverService, type VersionChoicesArgs } from "#/core/services/semver.service";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { VersionInferenceError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class VersionChoicesService {
    private static readonly VERSION_TYPES = {
        RELEASE: ["patch", "minor", "major"],
        PRERELEASE: ["prepatch", "preminor", "premajor"],
        CONTINUATION: ["prerelease"],
    } as const;

    private static readonly VERSION_CHOICES = {
        latestIsPreRelease: [
            ...VersionChoicesService.VERSION_TYPES.CONTINUATION,
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
        prerelease: "Unstable pre-release continuation.",
    };

    private readonly bumper: SemverService;

    constructor() {
        this.bumper = new SemverService();
    }

    createVersionChoices(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice[]> {
        const availableTypes = this.determineAvailableVersionTypes(options.currentVersion, options.releaseType);

        const choicesResult = availableTypes.map((releaseType) =>
            this.createVersionChoice({
                currentVersion: options.currentVersion,
                releaseType,
                preReleaseId: options.preReleaseId,
                preReleaseBase: options.preReleaseBase,
            })
        );

        return Result.combine(choicesResult);
    }

    private determineAvailableVersionTypes(currentVersion: string, releaseType?: ReleaseType): readonly ReleaseType[] {
        if (releaseType) {
            return this.getVersionTypesForReleaseType(releaseType);
        }

        const isCurrentPreRelease = this.isPreReleaseVersion(currentVersion);
        return isCurrentPreRelease
            ? VersionChoicesService.VERSION_CHOICES.latestIsPreRelease
            : VersionChoicesService.VERSION_CHOICES.default;
    }

    private getVersionTypesForReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
        return releaseType === "prerelease"
            ? VersionChoicesService.VERSION_CHOICES.preRelease
            : VersionChoicesService.VERSION_CHOICES.default;
    }

    private isPreReleaseVersion(currentVersion: string): boolean {
        return !!semver.prerelease(currentVersion);
    }

    private createVersionChoice(options: VersionChoicesArgs): FireflyResult<PromptSelectChoice> {
        const version = this.computeNewVersion({
            currentVersion: options.currentVersion,
            releaseType: options.releaseType,
            preReleaseId: options.preReleaseId,
            preReleaseBase: options.preReleaseBase,
        });

        if (version.isErr()) {
            return err(version.error);
        }

        const choice: PromptSelectChoice = {
            label: `${options.releaseType} (${version.value.toString()})`,
            hint: this.getVersionDescription(options.releaseType),
            value: version.value.toString(),
        };

        return ok(choice);
    }

    private computeNewVersion(options: VersionChoicesArgs): FireflyResult<string> {
        const version = Version.create(options.currentVersion);

        if (version.isErr()) {
            return err(new VersionInferenceError(`Invalid current version: ${options.currentVersion}`, version.error));
        }

        const newVersion = this.bumper.bump({
            currentVersion: version.value,
            releaseType: options.releaseType,
            preReleaseId: options.preReleaseId,
            preReleaseBase: options.preReleaseBase,
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
