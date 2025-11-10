import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { FireflyErr, toFireflyError, type FireflyAsyncResult } from "#/shared/errors";

const execAsync = promisify(exec);

export interface GenerateChangelogOptions {
    configPath?: string;
    outputPath?: string;
    fromTag?: string;
    toTag?: string;
    unreleased?: boolean;
    tagPrefix?: string;
    prepend?: boolean;
    workingDirectory?: string;
}

export class ChangelogService {
    constructor(private readonly workingDir: string = process.cwd()) {}

    generateChangelog(options: GenerateChangelogOptions = {}): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(
            this.executeGitCliff(options),
            (error) => toFireflyError(error, "Failed to generate changelog"),
        );
    }

    isGitCliffInstalled(): FireflyAsyncResult<boolean> {
        return ResultAsync.fromPromise(
            execAsync("git cliff --version").then(() => true),
            () => FireflyErr("git-cliff is not installed"),
        ).orElse(() => okAsync(false));
    }

    private async executeGitCliff(options: GenerateChangelogOptions): Promise<string> {
        const args: string[] = [];
        if (options.configPath) args.push("--config", options.configPath);
        if (options.outputPath) args.push("--output", options.outputPath);
        if (options.fromTag) args.push("--tag", options.fromTag);
        if (options.toTag) args.push("--tag", options.toTag);
        if (options.unreleased) args.push("--unreleased");
        if (options.tagPrefix) args.push("--tag-pattern", `${options.tagPrefix}*`);
        if (options.prepend) args.push("--prepend", options.outputPath || "CHANGELOG.md");

        const command = `git cliff ${args.join(" ")}`;
        const { stdout, stderr } = await execAsync(command, { 
            cwd: options.workingDirectory || this.workingDir 
        });

        if (stderr && !stderr.includes("warning")) {
            throw new Error(stderr);
        }
        return stdout.trim();
    }
}
