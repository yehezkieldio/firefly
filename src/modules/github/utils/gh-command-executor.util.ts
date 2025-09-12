import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { z } from "zod";
import { logger } from "#/shared/logger";
import { type FireflyError, createFireflyError } from "#/shared/utils/error.util";

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

const ghArgsSchema = z.array(z.string().min(1));

function hasSideEffects(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());

    return normalizedArgs.some((token, index) => {
        if (SIDE_EFFECT_COMMANDS.has(token)) {
            const nextArg = normalizedArgs[index + 1];
            if (nextArg) {
                const mutatingSubcommands = [
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
                    "remove",
                    "publish",
                ];
                return mutatingSubcommands.includes(nextArg);
            }
        }
        return false;
    });
}

function shouldUseStreaming(args: string[]): boolean {
    if (args.length === 0) return false;
    const normalizedArgs = args.map((token) => token.toLowerCase());

    return normalizedArgs.some((token, index) => {
        if (STREAMING_COMMANDS.has(token)) {
            const nextArg = normalizedArgs[index + 1];
            if (nextArg) {
                const streamingSubcommands = ["list", "view", "status", "diff", "log", "search"];
                return streamingSubcommands.includes(nextArg);
            }
        }
        return false;
    });
}

function createLogArgs(args: string[]): string {
    const dontTruncateNotes = Boolean(process.env.FIREFLY_DEBUG_DONT_TRUNCATE_RELEASE_NOTES);

    if (args[0] === "release" && args[1] === "create" && !dontTruncateNotes) {
        const notesIdx = args.indexOf("--notes");
        if (notesIdx !== -1) {
            const trailingFlags = args.slice(notesIdx + 2).filter((a) => a.startsWith("--"));
            return [...args.slice(0, notesIdx + 1), "NOTES_TRUNCATED", ...trailingFlags].join(" ");
        }
    }

    return args.join(" ");
}

export interface GhCommandOptions {
    dryRun?: boolean;
    cwd?: string;
    forceBuffered?: boolean;
    verbose?: boolean;
    redacted?: boolean;
}

export function executeGhCommand(args: string[], options: GhCommandOptions = {}): ResultAsync<string, FireflyError> {
    options.verbose = options.verbose ?? true;

    const parseResult = ghArgsSchema.safeParse(args);
    if (!parseResult.success) {
        return errAsync(
            createFireflyError({
                code: "FAILED",
                message: "Invalid gh arguments",
                details: parseResult.error,
            }),
        );
    }

    const validatedArgs = parseResult.data;
    const logArgs = createLogArgs(validatedArgs);
    const commandStr = `gh ${logArgs}`;

    const useStreaming = shouldUseStreaming(validatedArgs) && !options.forceBuffered;
    const executionMode = useStreaming ? "streaming" : "buffered";

    if (options.verbose) {
        logger.verbose(`GhCommandExecutor: Executing gh command (${executionMode}): ${commandStr}`);
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

function executeGhCommandBuffered(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe"; env: Record<string, string | undefined> },
    commandStr: string,
): ResultAsync<string, FireflyError> {
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
            }),
    );
}

function executeGhCommandStreaming(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe"; env: Record<string, string | undefined> },
    commandStr: string,
): ResultAsync<string, FireflyError> {
    return ResultAsync.fromPromise(streamToString(args, spawnOptions), (error) =>
        createFireflyError({
            code: "FAILED",
            message: `GitHub CLI command failed: ${commandStr}`,
            details: error,
        }),
    );
}

function streamToString(
    args: string[],
    spawnOptions: { cwd: string; stdout: "pipe"; stderr: "pipe"; env: Record<string, string | undefined> },
): Promise<string> {
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
