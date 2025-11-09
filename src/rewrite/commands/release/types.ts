/**
 * Shared types for the release command.
 */

export interface ReleaseData extends Record<string, unknown> {
    /**
     * Current version from package.json.
     */
    currentVersion?: string;

    /**
     * Next version to release.
     */
    nextVersion?: string;

    /**
     * Generated changelog content.
     */
    changelogContent?: string;

    /**
     * Commit SHA after changes are committed.
     */
    commitSha?: string;

    /**
     * Tag name created.
     */
    tagName?: string;

    /**
     * Release URL (if created on platform).
     */
    releaseUrl?: string;
}

/**
 * Version bump types.
 */
export type BumpType = "patch" | "minor" | "major";

/**
 * Version bump strategy.
 */
export type BumpStrategy = "automatic" | "manual" | "prompt";
