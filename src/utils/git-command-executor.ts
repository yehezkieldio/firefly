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
        return executeGitCommandStreaming(validatedArgs, spawnOptions, commandStr);
    }

    return executeGitCommandBuffered(validatedArgs, spawnOptions, commandStr);
}

function executeGitCommandBuffered(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" },
    commandStr: string
): ResultAsync<string, FireflyError> {
    const proc = Bun.spawn(["git", ...args], spawnOptions);

    const outputPromise = new Response(proc.stdout).text();
    const exitPromise = proc.exited;

    return ResultAsync.fromPromise(
        Promise.all([outputPromise, exitPromise]).then(([output]) => {
            if (proc.exitCode !== 0) {
                return new Response(proc.stderr).text().then((stderrText) => {
                    const errorMessage = `Git process exited with code ${proc.exitCode}: ${stderrText}`;
                    return Promise.reject(new Error(errorMessage));
                });
            }
            return output;
        }),
        (error) =>
            failedError({
                message: `Git command failed: ${commandStr}`,
                details: error,
            })
    );
}

function executeGitCommandStreaming(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" },
    commandStr: string
): ResultAsync<string, FireflyError> {
    return ResultAsync.fromPromise(streamToString(args, spawnOptions), (error) =>
        failedError({
            message: `Git command failed: ${commandStr}`,
            details: error,
        })
    );
}

function streamToString(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe" }
): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = Bun.spawn(["git", ...args], spawnOptions);

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
