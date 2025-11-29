import { okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { type FireflyError, failedError } from "#/utils/error";
import { logger } from "#/utils/log";
import { failedErrAsync } from "#/utils/result";

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

const STREAMING_COMMANDS = new Set<string>(["rev-list", "log", "show", "diff", "blame", "cat-file"] as const);

const gitArgsSchema = z.array(z.string().min(1));

function hasSideEffects(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());
    return normalizedArgs.some((token) => SIDE_EFFECT_COMMANDS.has(token));
}

function shouldUseStreaming(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());
    return normalizedArgs.some((token) => STREAMING_COMMANDS.has(token));
}

export interface GitCommandOptions {
    dryRun?: boolean;
    cwd?: string;
    forceBuffered?: boolean;
    verbose?: boolean;
    /** AbortSignal for cancellation support */
    signal?: AbortSignal;
    /** Timeout in milliseconds (creates AbortSignal internally if signal not provided) */
    timeoutMs?: number;
}

export function executeGitCommand(args: string[], options: GitCommandOptions = {}): ResultAsync<string, FireflyError> {
    options.verbose = options.verbose ?? true;

    const parseResult = gitArgsSchema.safeParse(args);
    if (!parseResult.success) {
        return failedErrAsync({
            message: "Invalid git arguments",
            details: parseResult.error,
        });
    }

    const validatedArgs = parseResult.data;
    const commandStr = `git ${validatedArgs.join(" ")}`;

    // Resolve AbortSignal: use provided signal, create timeout signal, or undefined
    const signal = options.signal ?? (options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined);

    // Check if already aborted before starting
    if (signal?.aborted) {
        return failedErrAsync({
            message: `Git command aborted before execution: ${commandStr}`,
            details: signal.reason,
        });
    }

    const useStreaming = shouldUseStreaming(validatedArgs) && !options.forceBuffered;
    const executionMode = useStreaming ? "streaming" : "buffered";

    if (options.verbose) {
        logger.verbose(`GitCommandExecutor: Executing git command (${executionMode}): ${commandStr}`);
    }

    if (options.dryRun && hasSideEffects(validatedArgs)) {
        const dryRunMessage = `Dry run: Skipping ${commandStr}`;
        if (options.verbose) {
            logger.verbose(dryRunMessage);
        }
        return okAsync(dryRunMessage);
    }

    const spawnOptions = {
        cwd: options.cwd ?? process.cwd(),
        stdout: "pipe" as const,
        stderr: "pipe" as const,
    };

    if (useStreaming) {
        return executeGitCommandStreaming(validatedArgs, spawnOptions, commandStr, signal);
    }

    return executeGitCommandBuffered(validatedArgs, spawnOptions, commandStr, signal);
}

function executeGitCommandBuffered(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" },
    commandStr: string,
    signal?: AbortSignal
): ResultAsync<string, FireflyError> {
    const proc = Bun.spawn(["git", ...args], spawnOptions);

    const outputPromise = new Response(proc.stdout).text();
    const exitPromise = proc.exited;

    // Create abort handler that kills the process
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

    // Race between execution and abort
    const racePromise = abortPromise ? Promise.race([executionPromise, abortPromise]) : executionPromise;

    return ResultAsync.fromPromise(racePromise, (error) =>
        failedError({
            message: `Git command failed: ${commandStr}`,
            details: error,
        })
    );
}

function executeGitCommandStreaming(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" },
    commandStr: string,
    signal?: AbortSignal
): ResultAsync<string, FireflyError> {
    return ResultAsync.fromPromise(streamToString(args, spawnOptions, signal), (error) =>
        failedError({
            message: `Git command failed: ${commandStr}`,
            details: error,
        })
    );
}

function streamToString(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" },
    signal?: AbortSignal
): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = Bun.spawn(["git", ...args], spawnOptions);

        // Handle abort signal
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
            // Check abort before each read
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
