import semver, { type ReleaseType } from "semver";
import type { ArtemisContext, PreReleaseBase } from "#/types";

export function incrementVersion(context: ArtemisContext, increment: ReleaseType): string {
    const preReleaseId: string = context.options.preReleaseId || "alpha";
    const releaseIdentifier: PreReleaseBase = ensureIdentifierBase(context.options.preReleaseBase);

    return semver.inc(context.currentVersion, increment, preReleaseId, releaseIdentifier) ?? context.currentVersion;
}

function ensureIdentifierBase(value: string): PreReleaseBase {
    return value === "0" || value === "1" ? value : "0";
}
