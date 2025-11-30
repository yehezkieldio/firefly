import { FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { executeGitCommand } from "#/infrastructure/executors/git-command.executor";
import type { IGitService } from "#/services/contracts/git.interface";

/** Options for internal git command execution */
interface GitExecutionOptions {
    readonly dryRun?: boolean;
    readonly verbose?: boolean;
}

/**
 * Default implementation of the git service.
 *
 * Executes git commands via the system's git binary
 * using the configured working directory.
 */
export class DefaultGitService implements IGitService {
    private readonly cwd: string;

    constructor(cwd: string) {
        this.cwd = cwd;
    }

    /**
     * Executes a git command with the configured working directory
     *
     * @param args - Git command arguments
     * @param options - Execution options
     * @returns Command output or error
     */
    private git(args: string[], options?: GitExecutionOptions): FireflyAsyncResult<string> {
        return executeGitCommand(args, {
            cwd: this.cwd,
            dryRun: options?.dryRun,
            verbose: options?.verbose ?? false,
        });
    }

    isRepository(): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--is-inside-work-tree"])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }
}

/**
 * Creates a git service instance.
 * @param cwd - Working directory for git commands
 */
export function createGitService(cwd: string): IGitService {
    return new DefaultGitService(cwd);
}
