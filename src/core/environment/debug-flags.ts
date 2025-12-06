/**
 * Debug flags are environment variables prefixed with `FIREFLY_DEBUG_` that
 * enable diagnostic features during development and troubleshooting.
 *
 * @example
 * ```typescript
 * if (DebugFlags.showRawError) {
 *     logger.error(parseResult.error);
 * }
 * ```
 */
export class DebugFlags {
    private constructor() {} // Prevent instantiation

    /**
     * When enabled, displays raw Zod validation errors for configuration parsing.
     *
     * Useful for debugging configuration schema issues and understanding
     * why validation failed at a granular level.
     */
    static get showRawError(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_SHOW_RAW_ERROR);
    }

    /**
     * When enabled, logs the loaded configuration file contents.
     *
     * Useful for debugging configuration loading and understanding
     * what values are being read from config files.
     */
    static get showFileConfig(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_SHOW_FILE_CONFIG);
    }

    /**
     * When enabled, displays task graph statistics during release execution.
     *
     * Shows information about task dependencies, execution order,
     * and graph structure for debugging workflow issues.
     */
    static get showTaskGraphStats(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_SHOW_TASK_GRAPH_STATS);
    }

    /**
     * When enabled, prevents truncation of release notes in GitHub CLI logs.
     *
     * By default, release notes are truncated in logs to avoid pollution.
     * Enable this flag to see full release notes content during debugging.
     */
    static get dontTruncateReleaseNotes(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_DONT_TRUNCATE_RELEASE_NOTES?.trim());
    }

    /**
     * When enabled, prevents redaction of sensitive GitHub CLI arguments in logs.
     *
     * By default, sensitive values (tokens, passwords, etc.) are redacted.
     * Enable this flag to see full argument values during debugging.
     *
     * WARNING: Use with caution as this may expose sensitive information.
     */
    static get dontRedactGithubCliArgs(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_DONT_REDACT_GITHUB_CLI_ARGS?.trim());
    }

    /**
     * When enabled, logs verbose details for git commit operations.
     *
     * By default, the verbose log of the git show command is disabled to reduce noise, if commits are many.
     * Enable this flag to see detailed commit information during debugging.
     */
    static get showVerboseGitCommitDetails(): boolean {
        return Boolean(process.env.FIREFLY_DEBUG_SHOW_VERBOSE_GIT_COMMIT_DETAILS?.trim());
    }
}
