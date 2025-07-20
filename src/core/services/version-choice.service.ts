import { ok, Result } from "neverthrow";
import type { ReleaseType } from "semver";
import semver from "semver";
import { Version } from "#/core/domain/version";
import { SemverService } from "#/core/services/semver.service";
import type { PreReleaseBase } from "#/infrastructure/config/schema";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice";
import { VersionError } from "#/shared/utils/error";

export class VersionChoiceService {
    private static readonly VERSION_TYPES = {
        RELEASE: ["patch", "minor", "major"],
        PRERELEASE: ["prepatch", "preminor", "premajor"],
        CONTINUATION: ["prerelease"],
    } as const;

    private static readonly VERSION_CHOICES = {
        latestIsPreRelease: [
            ...VersionChoiceService.VERSION_TYPES.CONTINUATION,
            ...VersionChoiceService.VERSION_TYPES.RELEASE,
        ],
        preRelease: VersionChoiceService.VERSION_TYPES.PRERELEASE,
        default: [...VersionChoiceService.VERSION_TYPES.RELEASE, ...VersionChoiceService.VERSION_TYPES.PRERELEASE],
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

    createVersionChoices(
        currentVersion: string,
        releaseType?: ReleaseType,
        preReleaseId?: string,
        preReleaseBase?: PreReleaseBase
    ): Result<PromptSelectChoice[], VersionError> {
        try {
            const availableTypes = this.determineAvailableVersionTypes(currentVersion, releaseType);

            const choices = availableTypes.map((increment) =>
                this.createVersionChoice(currentVersion, increment, preReleaseId, preReleaseBase)
            );

            return ok(choices);
        } catch (error) {
            return Result.fromThrowable(
                () => {
                    throw error;
                },
                (err) => new VersionError(`Failed to create version choices: ${err}`)
            )();
        }
    }

    private determineAvailableVersionTypes(currentVersion: string, releaseType?: ReleaseType): readonly ReleaseType[] {
        if (releaseType) {
            return this.getVersionTypesForReleaseType(releaseType);
        }

        const isCurrentPreRelease = this.isPreReleaseVersion(currentVersion);
        return isCurrentPreRelease
            ? VersionChoiceService.VERSION_CHOICES.latestIsPreRelease
            : VersionChoiceService.VERSION_CHOICES.default;
    }

    private getVersionTypesForReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
        return releaseType === "prerelease"
            ? VersionChoiceService.VERSION_CHOICES.preRelease
            : VersionChoiceService.VERSION_CHOICES.default;
    }

    private isPreReleaseVersion(currentVersion: string): boolean {
        return !!semver.prerelease(currentVersion);
    }

    private createVersionChoice(
        currentVersion: string,
        increment: ReleaseType,
        preReleaseId?: string,
        preReleaseBase?: PreReleaseBase
    ): PromptSelectChoice {
        const version = this.computeNewVersion(currentVersion, increment, preReleaseId, preReleaseBase);
        const description = this.getVersionDescription(increment);

        return {
            label: `${increment} (${version.toString()})`,
            hint: description,
            value: version.toString(),
        };
    }

    private computeNewVersion(
        currentVersion: string,
        increment: ReleaseType,
        preReleaseId?: string,
        preReleaseBase?: PreReleaseBase
    ): Version {
        return this.bumper.bump({
            current: new Version(currentVersion),
            increment,
            preReleaseId,
            preReleaseBase,
        });
    }

    private getVersionDescription(increment: ReleaseType): string {
        return VersionChoiceService.VERSION_DESCRIPTIONS[increment] ?? "";
    }
}
