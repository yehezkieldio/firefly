import type { ReleaseType } from "semver";
import semver from "semver";
import { Version } from "#/core/domain/version";
import { bumpVersion } from "#/core/services/semver.service";
import type { PromptSelectChoice } from "#/shared/types/prompt";

export class VersionChoiceService {
    private static readonly VERSION_TYPES = {
        RELEASE: ["patch", "minor", "major"] as const,
        PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
        CONTINUATION: ["prerelease", "pre"] as const,
    };

    private static readonly VERSION_CHOICES = {
        latestIsPreRelease: [this.VERSION_TYPES.CONTINUATION[0], ...this.VERSION_TYPES.RELEASE],
        preRelease: this.VERSION_TYPES.PRERELEASE,
        default: [...this.VERSION_TYPES.RELEASE, ...this.VERSION_TYPES.PRERELEASE],
    };

    private static readonly VERSION_DESCRIPTIONS = {
        patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
        minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
        major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
        prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
        preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
        premajor: "Unstable major release candidate. Used for testing breaking changes before a major release.",
        prerelease: "Unstable pre-release.",
    };

    createVersionChoices(currentVersion: string, releaseType: ReleaseType) {
        let types: readonly ReleaseType[];

        if (releaseType) {
            types =
                releaseType === "prerelease"
                    ? VersionChoiceService.VERSION_CHOICES.preRelease
                    : VersionChoiceService.VERSION_CHOICES.default;
        } else if (semver.inc(currentVersion, "prerelease")) {
            types = VersionChoiceService.VERSION_CHOICES.latestIsPreRelease;
        } else {
            types = VersionChoiceService.VERSION_CHOICES.default;
        }

        return types.map(
            (increment: ReleaseType): PromptSelectChoice => this.createVersionChoice(currentVersion, increment)
        );
    }

    private createVersionChoice(currentVersion: string, increment: ReleaseType) {
        const descriptionKey = increment as keyof typeof VersionChoiceService.VERSION_DESCRIPTIONS;
        const version = bumpVersion({
            current: new Version(currentVersion),
            increment,
        });

        return {
            label: increment,
            description: VersionChoiceService.VERSION_DESCRIPTIONS[descriptionKey] ?? version.toString(),
            value: version.toString(),
        };
    }
}
