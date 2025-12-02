/**
 * A reference to an issue or PR in a commit.
 */
export interface CommitReference {
    readonly raw: string;
    readonly action: string | null;
    readonly owner: string | null;
    readonly repository: string | null;
    readonly issue: string;
    readonly prefix: string;
}

/**
 * A note attached to a commit (e.g., BREAKING CHANGE).
 */
export interface CommitNote {
    readonly title: string;
    readonly text: string;
}

/**
 * Base structure shared by all commit types.
 */
export interface CommitBase {
    readonly merge: string | null;
    readonly revert: Readonly<Record<string, string | null>> | null;
    readonly header: string | null;
    readonly body: string | null;
    readonly footer: string | null;
    readonly notes: readonly CommitNote[];
    readonly mentions: readonly string[];
    readonly references: readonly CommitReference[];
}

/**
 * A fully parsed conventional commit.
 *
 * @example
 * ```ts
 * const commit: Commit = {
 *   hash: "abc123",
 *   type: "feat",
 *   scope: "auth",
 *   subject: "add OAuth support",
 *   header: "feat(auth): add OAuth support",
 *   body: "Implements OAuth 2.0 flow",
 *   ...
 * };
 * ```
 */
export interface Commit extends CommitBase {
    readonly hash?: string | null;
    readonly date?: string | null;
    readonly author?: string | null;
    readonly type?: string | null;
    readonly scope?: string | null;
    readonly subject?: string | null;
}

/**

 * Results of analyzing commits for version impact.

 */
export interface CommitAnalysis {
    /**
     * Number of commits with breaking changes
     */
    readonly breakingChanges: number;

    /**
     * Number of feature commits (feat)
     */
    readonly features: number;

    /**
     * Number of patch-level commits (fix, perf, etc.)
     */
    readonly patches: number;

    /**
     * Scopes that indicate breaking changes
     */
    readonly scopedBreaking: string[];

    /**
     * Whether a pre-release to stable transition was detected
     */
    readonly hasPreReleaseTransition: boolean;

    /**
     * Commits grouped by their type
     */
    readonly commitsByType: Record<string, Commit[]>;
}

/**

 * Configuration for which commit types map to version levels.

 */
export interface CommitTypeConfiguration {
    /**
     * Commit types that trigger major version bumps
     */
    readonly major: readonly string[];

    /**
     * Commit types that trigger minor version bumps
     */
    readonly minor: readonly string[];

    /**
     * Commit types that trigger patch version bumps
     */
    readonly patch: readonly string[];

    /**
     * Scope-to-version-level rules
     */
    readonly scopeRules: Readonly<Record<string, "major" | "minor" | "patch">>;
}

/**
 * Default configuration for conventional commit type analysis.
 */
export const DEFAULT_COMMIT_TYPE_CONFIG: CommitTypeConfiguration = {
    major: ["revert"],
    minor: ["feat", "feature"],
    patch: ["fix", "perf", "refactor", "style", "test", "build", "ci", "chore", "docs", "security"],
    scopeRules: {
        deps: "patch",
        dependencies: "patch",
        security: "patch",
        api: "minor",
        breaking: "major",
        "breaking-change": "major",
    },
} as const;
