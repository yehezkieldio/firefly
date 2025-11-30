import { ResultAsync } from "neverthrow";
import { z } from "zod";

import { createFireflyError } from "#/core/result/error.factories";
import { FireflyErrAsync, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { withDryRun } from "#/infrastructure/dry-run";
import { logger } from "#/infrastructure/logging";

/**
 * Configuration options for executing GitHub CLI commands.
 */
export interface GhCommandOptions {
    /**
     * When true, side-effect commands (create, delete, merge, etc.) are logged but not executed.
     */
    dryRun?: boolean;

    /**
     * Working directory for the GitHub CLI command.
     * Defaults to `process.cwd()` if not specified.
     */
    cwd?: string;

    /**
     * Forces buffered execution even for commands that would normally use streaming.
     * Use when you need the complete output before processing.
     */
    forceBuffered?: boolean;

    /**
     * Enables verbose logging of command execution.
     * Defaults to `true`.
     */
    verbose?: boolean;

    /**
     * When true, sensitive information in logs is masked.
     */
    redacted?: boolean;
}

/**
 * Internal spawn options passed to Bun.spawn
 */
interface SpawnOptions {
    cwd: string;
    stdout: "pipe";
    stderr: "pipe";
    env: Record<string, string | undefined>;
}

/**
 * GitHub CLI resource commands that may have side-effect subcommands.
 * These are checked in combination with mutating subcommands.
 */
const SIDE_EFFECT_COMMANDS = new Set<string>([
    "repo",
    "pr",
    "issue",
    "gist",
    "release",
    "workflow",
    "run",
    "secret",
    "variable",
    "auth",
    "alias",
    "config",
    "extension",
    "ssh-key",
    "gpg-key",
    "api",
    "codespace",
    "project",
    "label",
    "milestone",
] as const);

/**
 * GitHub CLI commands that benefit from streaming execution.
 * These commands often produce large outputs that should be processed incrementally.
 */
const STREAMING_COMMANDS = new Set<string>([
    "repo",
    "pr",
    "issue",
    "gist",
    "release",
    "workflow",
    "run",
    "api",
    "search",
    "browse",
    "status",
] as const);

/**
 * Subcommands that modify remote GitHub state.
 * Used in conjunction with SIDE_EFFECT_COMMANDS to determine dry-run behavior.
 */
const MUTATING_SUBCOMMANDS = [
    "create",
    "delete",
    "edit",
    "merge",
    "close",
    "reopen",
    "comment",
    "review",
    "approve",
    "request-changes",
    "upload",
    "download",
    "clone",
    "fork",
    "sync",
    "enable",
    "disable",
    "cancel",
    "rerun",
    "set",
    "add",
    "remove",
    "login",
    "logout",
    "install",
    "upgrade",
    "publish",
] as const;

/**
 * Subcommands that produce read-only output suitable for streaming.
 */
const STREAMING_SUBCOMMANDS = ["list", "view", "status", "diff", "log", "search"] as const;

/**
 * Flags whose values contain sensitive information that should be redacted in logs.
 */
const SENSITIVE_FLAGS = new Set<string>([
    "--token",
    "-t",
    "--password",
    "-p",
    "--secret",
    "--body",
    "-b",
    "--notes",
    "-n",
    "--message",
    "-m",
    "--key",
    "--value",
    "--header",
    "-H",
] as const);

// Validates that GitHub CLI arguments are non-empty strings
const ghArgsSchema = z.array(z.string().min(1));

/**
 * Determines if the given arguments contain commands that modify GitHub state.
 * Checks for resource commands followed by mutating subcommands.
 *
 * @param args - GitHub CLI command arguments to check
 * @returns `true` if the command would modify remote state
 */
function hasSideEffects(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());

    return normalizedArgs.some((token, index) => {
        if (SIDE_EFFECT_COMMANDS.has(token)) {
            const nextArg = normalizedArgs[index + 1];
            if (nextArg) {
                return MUTATING_SUBCOMMANDS.includes(nextArg as (typeof MUTATING_SUBCOMMANDS)[number]);
            }
        }
        return false;
    });
}

/**
 * Determines if the given arguments should use streaming execution.
 * Checks for resource commands followed by streaming subcommands.
 *
 * @param args - GitHub CLI command arguments to check
 * @returns `true` if streaming execution is recommended
 */
function shouldUseStreaming(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());

    return normalizedArgs.some((token, index) => {
        if (STREAMING_COMMANDS.has(token)) {
            const nextArg = normalizedArgs[index + 1];
            if (nextArg) {
                return STREAMING_SUBCOMMANDS.includes(nextArg as (typeof STREAMING_SUBCOMMANDS)[number]);
            }
        }
        return false;
    });
}

/**
 * Redacts sensitive values from command arguments for secure logging.
 * Replaces values following sensitive flags with [REDACTED].
 *
 * @param args - GitHub CLI command arguments
 * @returns Arguments with sensitive values replaced
 */
function redactSensitiveArgs(args: string[]): string[] {
    const redactedArgs: string[] = [];
    let redactNext = false;

    for (const arg of args) {
        if (redactNext) {
            redactedArgs.push("[REDACTED]");
            redactNext = false;
            continue;
        }

        // Check for --flag=value format
        const equalIndex = arg.indexOf("=");
        if (equalIndex !== -1) {
            const flag = arg.slice(0, equalIndex);
            if (SENSITIVE_FLAGS.has(flag)) {
                redactedArgs.push(`${flag}=[REDACTED]`);
                continue;
            }
        }

        // Check if this flag's next argument should be redacted
        if (SENSITIVE_FLAGS.has(arg)) {
            redactedArgs.push(arg);
            redactNext = true;
            continue;
        }

        redactedArgs.push(arg);
    }

    return redactedArgs;
}

/**
 * Creates a sanitized log representation of command arguments.
 * Truncates release notes content to avoid log pollution.
 *
 * @param args - GitHub CLI command arguments
 * @param redacted - When true, sensitive values are masked
 * @returns Sanitized argument string for logging
 */
function createLogArgs(args: string[], redacted = false): string {
    const dontTruncateNotes = Boolean(process.env.FIREFLY_DEBUG_DONT_TRUNCATE_RELEASE_NOTES?.trim());
    const skipRedaction = Boolean(process.env.FIREFLY_DEBUG_DONT_REDACT_GITHUB_CLI_ARGS?.trim());

    const processedArgs = redacted && !skipRedaction ? redactSensitiveArgs(args) : args;

    if (processedArgs[0] === "release" && processedArgs[1] === "create" && !dontTruncateNotes) {
        const notesIdx = processedArgs.indexOf("--notes");
        if (notesIdx !== -1) {
            const trailingFlags = processedArgs.slice(notesIdx + 2).filter((a) => a.startsWith("--"));
            return [...processedArgs.slice(0, notesIdx + 1), "NOTES_TRUNCATED", ...trailingFlags].join(" ");
        }
    }

    return processedArgs.join(" ");
}

/**
 * Reads a process stdout stream into a string.
 *
 * @param args - GitHub CLI command arguments
 * @param spawnOptions - Spawn configuration for the process
 * @returns Promise resolving to the complete stdout output
 */
function streamToString(args: string[], spawnOptions: SpawnOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = Bun.spawn(["gh", ...args], spawnOptions);

        const chunks: string[] = [];
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();

        const readChunks = (): void => {
            reader.read().then((readResult) => {
                if (readResult.done) {
                    const finalChunk = decoder.decode();
                    if (finalChunk) {
                        chunks.push(finalChunk);
                    }

                    proc.exited.then(() => {
                        if (proc.exitCode !== 0) {
                            new Response(proc.stderr).text().then((stderrText) => {
                                const errorMessage = `GitHub CLI process exited with code ${proc.exitCode}: ${stderrText}`;
                                reject(new Error(errorMessage));
                            });
                        } else {
                            resolve(chunks.join(""));
                        }
                    });
                } else {
                    const decodedChunk = decoder.decode(readResult.value, { stream: true });
                    chunks.push(decodedChunk);
                    readChunks();
                }
            });
        };

        readChunks();
    });
}

/**
 * Executes a GitHub CLI command using buffered output collection.
 * Waits for the process to complete before returning the full output.
 *
 * @param args - GitHub CLI command arguments
 * @param spawnOptions - Spawn configuration for the process
 * @param commandStr - Full command string for error messages
 * @returns FireflyAsyncResult containing stdout output or error
 */
function executeGhCommandBuffered(
    args: string[],
    spawnOptions: SpawnOptions,
    commandStr: string
): FireflyAsyncResult<string> {
    const proc = Bun.spawn(["gh", ...args], spawnOptions);

    const outputPromise = new Response(proc.stdout).text();
    const exitPromise = proc.exited;

    return ResultAsync.fromPromise(
        Promise.all([outputPromise, exitPromise]).then(([output]) => {
            if (proc.exitCode !== 0) {
                return new Response(proc.stderr).text().then((stderrText) => {
                    const errorMessage = `GitHub CLI process exited with code ${proc.exitCode}: ${stderrText}`;
                    return Promise.reject(new Error(errorMessage));
                });
            }
            return output;
        }),
        (error) =>
            createFireflyError({
                code: "FAILED",
                message: `GitHub CLI command failed: ${commandStr}`,
                details: error,
            })
    );
}

/**
 * Executes a GitHub CLI command using streaming output collection.
 *
 * @param args - GitHub CLI command arguments
 * @param spawnOptions - Spawn configuration for the process
 * @param commandStr - Full command string for error messages
 * @returns FireflyAsyncResult containing stdout output or error
 */
function executeGhCommandStreaming(
    args: string[],
    spawnOptions: SpawnOptions,
    commandStr: string
): FireflyAsyncResult<string> {
    return ResultAsync.fromPromise(streamToString(args, spawnOptions), (error) =>
        createFireflyError({
            code: "FAILED",
            message: `GitHub CLI command failed: ${commandStr}`,
            details: error,
        })
    );
}

/**
 * Executes a GitHub CLI command with comprehensive error handling.
 *
 * @example
 * ```ts
 * // List pull requests
 * const result = await executeGhCommand(["pr", "list", "--json", "number,title"]);
 *
 * // Create a release (respects dry-run)
 * const result = await executeGhCommand(
 *   ["release", "create", "v1.0.0", "--notes", "Release notes"],
 *   { dryRun: true }
 * );
 *
 * // API call
 * const result = await executeGhCommand(["api", "/repos/{owner}/{repo}/issues"]);
 * ```
 *
 * @param args - GitHub CLI command arguments (e.g., ["pr", "list"])
 * @param options - Execution options for dry-run, verbosity, etc.
 * @returns FireflyAsyncResult containing stdout output or error
 */
export function executeGhCommand(args: string[], options: GhCommandOptions = {}): FireflyAsyncResult<string> {
    const resolvedOptions = { verbose: true, ...options };

    const parseResult = ghArgsSchema.safeParse(args);
    if (!parseResult.success) {
        return FireflyErrAsync(
            createFireflyError({
                code: "FAILED",
                message: "Invalid gh arguments",
                details: parseResult.error,
            })
        );
    }

    const validatedArgs = parseResult.data;
    const logArgs = createLogArgs(validatedArgs, resolvedOptions.redacted);
    const commandStr = `gh ${logArgs}`;

    const useStreaming = shouldUseStreaming(validatedArgs) && !resolvedOptions.forceBuffered;
    const executionMode = useStreaming ? "streaming" : "buffered";

    if (resolvedOptions.verbose) {
        logger.verbose(`GhCommandExecutor: Executing gh command (${executionMode}): ${commandStr}`);
    }

    if (resolvedOptions.dryRun && hasSideEffects(validatedArgs)) {
        const dryRunMessage = `Dry run: Skipping ${commandStr}`;
        return withDryRun(resolvedOptions, dryRunMessage, () => FireflyOkAsync(dryRunMessage), dryRunMessage);
    }

    const spawnOptions: SpawnOptions = {
        cwd: resolvedOptions.cwd ?? process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
        env: {
            ...process.env,
            GH_NO_UPDATE_NOTIFIER: "1",
        },
    };

    if (useStreaming) {
        return executeGhCommandStreaming(validatedArgs, spawnOptions, validatedArgs.join(" "));
    }

    return executeGhCommandBuffered(validatedArgs, spawnOptions, validatedArgs.join(" "));
}
