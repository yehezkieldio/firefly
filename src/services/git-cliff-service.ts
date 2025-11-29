/**
 * Git-Cliff Service Module
 *
 * Provides changelog generation using git-cliff. Handles:
 * - Git-cliff configuration and execution
 * - GitHub token integration for commit links
 * - Dry-run support for testing
 *
 * @module services/git-cliff-service
 */

import { type Options as GitCliffOptions, runGitCliff } from "git-cliff";
import { okAsync } from "neverthrow";
import { executeGhCommand } from "#/utils/gh-command-executor";
import { logger } from "#/utils/log";
import {
    type FireflyAsyncResult,
    FireflyErrAsync,
    FireflyOk,
    FireflyOkAsync,
    type FireflyResult,
    failedErrAsync,
    invalidErr,
    wrapPromise,
} from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for changelog generation.
 */
export interface ChangelogOptions {
    /** The git tag name for the release */
    readonly tagName: string;
    /** Whether to perform a dry run (no file modifications) */
    readonly dryRun?: boolean;
    /** Path to the changelog file */
    readonly changelogPath?: string;
    /** Custom release notes to include */
    readonly releaseNotes?: string;
    /** GitHub repository in "owner/repo" format */
    readonly repository?: string;
    /** Root directory for monorepo setups */
    readonly rootDirectory?: string;
    /** Include path pattern for monorepo filtering */
    readonly includePath?: string;
    /** Path to git-cliff config file */
    readonly configPath?: string;
}

/**
 * Result of changelog generation.
 */
export interface ChangelogResult {
    /** The generated changelog content */
    readonly content: string;
    /** Whether the changelog file was updated */
    readonly fileUpdated: boolean;
}

// ============================================================================
// GitHub Token Resolution
// ============================================================================

/**
 * Retrieves the GitHub token from environment or CLI.
 *
 * Order of precedence:
 * 1. GITHUB_TOKEN environment variable
 * 2. GH_TOKEN environment variable
 * 3. GitHub CLI (gh auth token)
 */
function getGitHubToken(): FireflyAsyncResult<string> {
    const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (envToken) {
        logger.verbose("GitCliffService: Using GitHub token from environment");
        return okAsync(envToken);
    }

    logger.verbose("GitCliffService: Retrieving GitHub token via CLI");
    return executeGhCommand(["auth", "token"], { verbose: false }).map((token) => token.trim());
}

// ============================================================================
// Git-Cliff Options Builder
// ============================================================================

/**
 * Builds git-cliff options from changelog options.
 */
function buildGitCliffOptions(options: ChangelogOptions): FireflyResult<GitCliffOptions> {
    if (!options.tagName?.trim()) {
        return invalidErr({
            message: "Tag name is required for changelog generation",
            source: "GitCliffService.buildOptions",
        });
    }

    const gitCliffOptions: GitCliffOptions = {
        tag: options.tagName,
        unreleased: true,
        config: options.configPath ?? "./cliff.toml",
        output: "-", // Output to stdout
    };

    // Add release notes if provided
    if (options.releaseNotes?.trim()) {
        const normalizedNotes = options.releaseNotes.replace(/\\n/g, "\n");
        gitCliffOptions.withTagMessage = normalizedNotes;
        logger.verbose("GitCliffService: Release notes added to changelog options");
    }

    // Configure prepend (only in non-dry-run mode)
    if (!options.dryRun && options.changelogPath) {
        gitCliffOptions.prepend = options.changelogPath;
        logger.verbose(`GitCliffService: Prepend enabled for ${options.changelogPath}`);
    } else if (options.dryRun) {
        logger.verbose("GitCliffService: Prepend disabled (dry run mode)");
    }

    // Configure monorepo support
    if (options.rootDirectory && options.rootDirectory !== ".") {
        gitCliffOptions.repository = options.rootDirectory;
        if (options.includePath) {
            gitCliffOptions.includePath = options.includePath;
            logger.verbose(`GitCliffService: Include path set to ${options.includePath}`);
        }
    }

    // Add GitHub repository for commit links
    if (options.repository) {
        gitCliffOptions.githubRepo = options.repository;
        logger.verbose(`GitCliffService: GitHub repository set to ${options.repository}`);
    }

    return FireflyOk(gitCliffOptions);
}

/**
 * Adds GitHub token to git-cliff options.
 */
function addGitHubTokenToOptions(options: GitCliffOptions): FireflyAsyncResult<GitCliffOptions> {
    return getGitHubToken()
        .map((token) => ({
            ...options,
            githubToken: token,
        }))
        .orElse((error) => {
            // Token retrieval failure is non-fatal, continue without token
            logger.verbose(`GitCliffService: GitHub token not available: ${error.message}`);
            return okAsync(options);
        });
}

// ============================================================================
// Git-Cliff Execution
// ============================================================================

/**
 * Redacts the GitHub token from command strings for logging.
 */
function redactTokenFromCommand(command: string): string {
    return command.replace(/--github-token\s+([^\s]+)/g, "--github-token [REDACTED]");
}

/**
 * Executes git-cliff with the provided options.
 */
function executeGitCliff(options: GitCliffOptions): FireflyAsyncResult<string> {
    logger.verbose(`GitCliffService: Executing git-cliff with tag: ${options.tag}`);

    return wrapPromise(runGitCliff(options, { stdio: "pipe" })).andThen((result) => {
        // Log redacted command if available
        const escapedCommand = (result as { escapedCommand?: string }).escapedCommand;
        if (escapedCommand) {
            logger.verbose(`GitCliffService: Executed: ${redactTokenFromCommand(escapedCommand)}`);
        }

        // Check exit code
        if (result.exitCode !== 0) {
            return failedErrAsync({
                message: `git-cliff failed with exit code ${result.exitCode}`,
                source: "GitCliffService.execute",
                details: result.stderr,
            });
        }

        // Ensure stdout content exists
        const stdout = result.stdout;
        if (!stdout) {
            return failedErrAsync({
                message: "git-cliff returned no output content",
                source: "GitCliffService.execute",
            });
        }

        const content = String(stdout);
        logger.verbose(`GitCliffService: Generated ${content.length} bytes of changelog content`);

        return FireflyOkAsync(content);
    });
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a changelog using git-cliff.
 *
 * @param options - Changelog generation options
 * @returns Generated changelog content and update status
 *
 * @example
 * ```typescript
 * const result = await generateChangelog({
 *   tagName: "v1.0.0",
 *   changelogPath: "CHANGELOG.md",
 *   repository: "owner/repo",
 * });
 *
 * if (result.isOk()) {
 *   console.log(result.value.content);
 * }
 * ```
 */
export function generateChangelog(options: ChangelogOptions): FireflyAsyncResult<ChangelogResult> {
    logger.verbose("GitCliffService: Starting changelog generation");
    const startTime = Date.now();

    // Validate and build options
    const optionsResult = buildGitCliffOptions(options);
    if (optionsResult.isErr()) {
        return FireflyErrAsync(optionsResult.error);
    }

    const gitCliffOptions = optionsResult.value;

    // Add GitHub token and execute
    return addGitHubTokenToOptions(gitCliffOptions)
        .andThen(executeGitCliff)
        .map((content) => {
            const elapsed = Date.now() - startTime;
            logger.verbose(`GitCliffService: Changelog generated in ${elapsed}ms`);

            return {
                content,
                fileUpdated: !options.dryRun && Boolean(options.changelogPath),
            };
        });
}

/**
 * Extracts only the changes section from raw changelog content.
 *
 * Useful for post-processing when you need just the version-specific
 * changes without the full changelog header.
 *
 * @param rawChangelog - Full changelog content from git-cliff
 * @returns Extracted changes section, or empty string if no changes found
 */
export function extractChangesSection(rawChangelog: string): string {
    // Find where the changes start (first ### section)
    const changesStartIndex = rawChangelog.indexOf("###");
    if (changesStartIndex === -1) {
        logger.verbose("GitCliffService: No changes section (###) found in changelog");
        return "";
    }

    const extracted = rawChangelog.slice(changesStartIndex).trim();

    // Verify there are actual commit entries
    if (!extracted.includes("###")) {
        logger.verbose("GitCliffService: Extracted section has no commit entries");
        return "";
    }

    return extracted;
}
