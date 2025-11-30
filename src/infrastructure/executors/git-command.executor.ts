import { ResultAsync } from "neverthrow";
import { z } from "zod";

import { failedError } from "#/core/result/error.factories";
import { FireflyOkAsync, failedErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { logger } from "#/infrastructure/logging";

/**
 * Configuration options for executing Git commands.
 */
export interface GitCommandOptions {
    /**
     * When true, side-effect commands (commit, push, etc.) are logged but not executed.
     */
    dryRun?: boolean;

    /**
     * Working directory for the Git command.
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
     * AbortSignal for cancellation support.
     * When aborted, the Git process is killed and the result resolves to an error.
     */
    signal?: AbortSignal;

    /**
     * Timeout in milliseconds. Creates an internal AbortSignal if `signal` is not provided.
     * The command fails with an abort error if it exceeds this duration.
     */
    timeoutMs?: number;
}

/**
 * Internal spawn options passed to Bun.spawn
 */
interface SpawnOptions {
    cwd: string;
    stdout: "pipe";
    stderr: "pipe";
}

/**
 * Git commands that modify repository state.
 * These commands are skipped during dry-run mode.
 */
const SIDE_EFFECT_COMMANDS = new Set<string>([
    "add",
    "am",
    "apply",
    "branch",
    "checkout",
    "cherry-pick",
    "clean",
    "commit",
    "fetch",
    "merge",
    "mv",
    "pull",
    "push",
    "rebase",
    "reset",
    "restore",
    "revert",
    "rm",
    "stash",
    "switch",
    "tag",
    "worktree",
] as const);

/**
 * Git commands that benefit from streaming execution.
 * These commands often produce large outputs that should be processed incrementally.
 */
const STREAMING_COMMANDS = new Set<string>(["rev-list", "log", "show", "diff", "blame", "cat-file"] as const);

// Validates that Git arguments are non-empty strings
const gitArgsSchema = z.array(z.string().min(1));

/**
 * Determines if the given arguments contain commands that modify repository state.
 *
 * @param args - Git command arguments to check
 * @returns `true` if any argument is a side-effect command
 */
function hasSideEffects(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());
    return normalizedArgs.some((token) => SIDE_EFFECT_COMMANDS.has(token));
}

/**
 * Determines if the given arguments should use streaming execution.
 *
 * @param args - Git command arguments to check
 * @returns `true` if streaming execution is recommended
 */
function shouldUseStreaming(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());
    return normalizedArgs.some((token) => STREAMING_COMMANDS.has(token));
}

/**
 * Reads a process stdout stream into a string with abort support.
 *
 * @param args - Git command arguments
 * @param spawnOptions - Spawn configuration for the Git process
 * @param signal - Optional abort signal for cancellation
 * @returns Promise resolving to the complete stdout output
 */
function streamToString(args: string[], spawnOptions: SpawnOptions, signal?: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = Bun.spawn(["git", ...args], spawnOptions);

        if (signal) {
            const onAbort = () => {
                proc.kill();
                reject(new Error("Git command aborted", { cause: signal.reason }));
            };
            if (signal.aborted) {
                onAbort();
                return;
            }
            signal.addEventListener("abort", onAbort, { once: true });
        }

        const chunks: string[] = [];
        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();

        const readChunks = (): void => {
            if (signal?.aborted) {
                reader.cancel();
                return;
            }

            reader.read().then((readResult) => {
                if (readResult.done) {
                    const finalChunk = decoder.decode();
                    if (finalChunk) {
                        chunks.push(finalChunk);
                    }

                    proc.exited.then(() => {
                        if (proc.exitCode !== 0) {
                            new Response(proc.stderr).text().then((stderrText) => {
                                const errorMessage = `Git process exited with code ${proc.exitCode}: ${stderrText}`;
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
 * Executes a Git command using buffered output collection.
 * Waits for the process to complete before returning the full output.
 *
 * @param args - Git command arguments
 * @param spawnOptions - Spawn configuration for the Git process
 * @param commandStr - Full command string for error messages
 * @param signal - Optional abort signal for cancellation
 * @returns FireflyAsyncResult containing stdout output or error
 */
function executeGitCommandBuffered(
    args: string[],
    spawnOptions: SpawnOptions,
    commandStr: string,
    signal?: AbortSignal
): FireflyAsyncResult<string> {
    const proc = Bun.spawn(["git", ...args], spawnOptions);

    const outputPromise = new Response(proc.stdout).text();
    const exitPromise = proc.exited;

    const abortPromise = signal
        ? new Promise<never>((_, reject) => {
              const onAbort = () => {
                  proc.kill();
                  reject(new Error(`Git command aborted: ${commandStr}`, { cause: signal.reason }));
              };
              if (signal.aborted) {
                  onAbort();
              } else {
                  signal.addEventListener("abort", onAbort, { once: true });
              }
          })
        : null;

    const executionPromise = Promise.all([outputPromise, exitPromise]).then(([output]) => {
        if (proc.exitCode !== 0) {
            return new Response(proc.stderr).text().then((stderrText) => {
                const errorMessage = `Git process exited with code ${proc.exitCode}: ${stderrText}`;
                return Promise.reject(new Error(errorMessage));
            });
        }
        return output;
    });

    const racePromise = abortPromise ? Promise.race([executionPromise, abortPromise]) : executionPromise;

    return ResultAsync.fromPromise(racePromise, (error) =>
        failedError({
            message: `Git command failed: ${commandStr}`,
            details: error,
        })
    );
}

/**
 * Executes a Git command using streaming output collection.
 *
 * @param args - Git command arguments
 * @param spawnOptions - Spawn configuration for the Git process
 * @param commandStr - Full command string for error messages
 * @param signal - Optional abort signal for cancellation
 * @returns FireflyAsyncResult containing stdout output or error
 */
function executeGitCommandStreaming(
    args: string[],
    spawnOptions: SpawnOptions,
    commandStr: string,
    signal?: AbortSignal
): FireflyAsyncResult<string> {
    return ResultAsync.fromPromise(streamToString(args, spawnOptions, signal), (error) =>
        failedError({
            message: `Git command failed: ${commandStr}`,
            details: error,
        })
    );
}

/**
 * Executes a Git command with comprehensive error handling and cancellation support.
 *
 * @example
 * ```ts
 * // Simple command
 * const result = await executeGitCommand(["status", "--porcelain"]);
 *
 * // With timeout
 * const result = await executeGitCommand(["log", "--oneline"], { timeoutMs: 5000 });
 *
 * // With abort signal
 * const controller = new AbortController();
 * const result = await executeGitCommand(["fetch", "--all"], { signal: controller.signal });
 * ```
 *
 * @param args - Git command arguments (e.g., ["status", "--porcelain"])
 * @param options - Execution options for dry-run, timeout, etc.
 * @returns FireflyAsyncResult containing stdout output or FireflyError
 */
export function executeGitCommand(args: string[], options: GitCommandOptions = {}): FireflyAsyncResult<string> {
    const resolvedOptions = { verbose: true, ...options };

    const parseResult = gitArgsSchema.safeParse(args);
    if (!parseResult.success) {
        return failedErrAsync({
            message: "Invalid git arguments",
            details: parseResult.error,
        });
    }

    const validatedArgs = parseResult.data;
    const commandStr = `git ${validatedArgs.join(" ")}`;

    const signal =
        resolvedOptions.signal ??
        (resolvedOptions.timeoutMs ? AbortSignal.timeout(resolvedOptions.timeoutMs) : undefined);

    if (signal?.aborted) {
        return failedErrAsync({
            message: `Git command aborted before execution: ${commandStr}`,
            details: signal.reason,
        });
    }

    const useStreaming = shouldUseStreaming(validatedArgs) && !resolvedOptions.forceBuffered;
    const executionMode = useStreaming ? "streaming" : "buffered";

    if (resolvedOptions.verbose) {
        logger.verbose(`GitCommandExecutor: Executing git command (${executionMode}): ${commandStr}`);
    }

    if (resolvedOptions.dryRun && hasSideEffects(validatedArgs)) {
        const dryRunMessage = `Dry run: Skipping ${commandStr}`;
        if (resolvedOptions.verbose) {
            logger.verbose(dryRunMessage);
        }
        return FireflyOkAsync(dryRunMessage);
    }

    const spawnOptions: SpawnOptions = {
        cwd: resolvedOptions.cwd ?? process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
    };

    if (useStreaming) {
        return executeGitCommandStreaming(validatedArgs, spawnOptions, commandStr, signal);
    }

    return executeGitCommandBuffered(validatedArgs, spawnOptions, commandStr, signal);
}
