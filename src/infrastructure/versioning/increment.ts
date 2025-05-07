import { okAsync, ResultAsync } from "neverthrow";
import type { ReleaseType } from "semver";
import semver from "semver";
import type { ArtemisContext } from "#/application/context";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";
import { incrementVersion } from "#/infrastructure/versioning/strategy";

export interface PromptSelectChoice {
    label: string;
    value: string;
    hint?: string;
}

const VERSION_TYPES = {
    RELEASE: ["patch", "minor", "major"] as const,
    PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
    CONTINUATION: ["prerelease", "pre"] as const
};

const VERSION_CHOICES = {
    latestIsPreRelease: [VERSION_TYPES.CONTINUATION[0], ...VERSION_TYPES.RELEASE],
    preRelease: VERSION_TYPES.PRERELEASE,
    default: [...VERSION_TYPES.RELEASE, ...VERSION_TYPES.PRERELEASE]
};

const VERSION_DESCRIPTIONS = {
    patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
    minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
    major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
    prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
    preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
    premajor: "Unstable major release candidate. Used for testing breaking changes before a major release."
};

export function generateManualVersion(context: ArtemisContext): ResultAsync<string, Error> {
    if (context.options.releaseType) {
        return okAsync(incrementVersion(context, context.options.releaseType));
    }

    return promptManualVersion(context)
        .andTee((): void => console.log(" "))
        .andTee((version: string): void => logger.verbose(`Selected version bump: ${version}`));
}

export function promptManualVersion(context: ArtemisContext): ResultAsync<string, Error> {
    const versions: PromptSelectChoice[] = generateVersionChoices(context);
    const prompt: Promise<string> = logger.prompt("Select version bump", {
        type: "select",
        options: versions,
        initial: versions[0]!.value,
        cancel: "reject"
    });

    return ResultAsync.fromPromise(prompt, (error: unknown): Error => createErrorFromUnknown(error));
}

function generateVersionChoices(context: ArtemisContext): PromptSelectChoice[] {
    let types: readonly ReleaseType[];

    if (context.options.releaseType) {
        types = context.options.releaseType === "prerelease" ? VERSION_CHOICES.preRelease : VERSION_CHOICES.default;
    } else if (semver.prerelease(context.currentVersion)) {
        types = VERSION_CHOICES.latestIsPreRelease;
    } else {
        types = VERSION_CHOICES.default;
    }

    return types.map((increment: ReleaseType): PromptSelectChoice => createVersionOption(context, increment));
}

function createVersionOption(context: ArtemisContext, increment: string): PromptSelectChoice {
    const nextVersion: string = incrementVersion(context, increment as ReleaseType);
    const descriptionKey = increment as keyof typeof VERSION_DESCRIPTIONS;

    return {
        label: `${increment} (${nextVersion})`,
        value: nextVersion,
        hint: VERSION_DESCRIPTIONS[descriptionKey] ?? nextVersion
    };
}
