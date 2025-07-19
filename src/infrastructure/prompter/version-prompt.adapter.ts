import type { ReleaseType } from "semver";
import { VersionChoiceService } from "#/core/services/version-choice.service";
import { VersionError } from "#/shared/error";
import { logger } from "#/shared/logger";

export function generateVersionChoices(currentVersion: string, releaseType: ReleaseType) {
    const versions = new VersionChoiceService().createVersionChoices(currentVersion, releaseType);

    const firstVersion = versions[0];
    if (!firstVersion) {
        throw new VersionError("No versions available.");
    }

    const prompt = logger.prompt("Select version bump", {
        type: "select",
        options: versions,
        initial: firstVersion.value,
        cancel: "reject",
    });

    return prompt;
}
