import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { consola } from "consola";
import { Changelog } from "#/core/domain/changelog.js";
import type { Version } from "#/core/domain/version.js";
import type { IChangelogGenerator } from "#/core/ports/changelog.port.js";
import type { ArtemisResult } from "#/shared/result.js";
import { ChangelogError, err, ok } from "#/shared/result.js";

// Declare Bun global for TypeScript
declare const Bun: {
    spawn: (
        args: string[],
        options?: { cwd?: string; stdout?: string; stderr?: string }
    ) => {
        stdout: ReadableStream;
        stderr: ReadableStream;
        exited: Promise<void>;
        exitCode: number | null;
    };
};

export class ChangelogGeneratorAdapter implements IChangelogGenerator {
    private readonly changelogPath: string;
    private readonly basePath: string;

    constructor(changelogPath: string, basePath: string = process.cwd()) {
        this.changelogPath = changelogPath;
        this.basePath = basePath;
    }

    async generate(
        from: Version,
        to: Version
    ): Promise<ArtemisResult<Changelog>> {
        try {
            consola.info(
                `Generating changelog from ${from.toString()} to ${to.toString()}`
            );

            const result = await this.runGitCliff([
                "--tag",
                to.toString(),
                "--from",
                from.toString(),
                "--output",
                this.changelogPath,
            ]);

            if (result.isErr()) {
                return err(result.error);
            }

            const content = await this.readChangelogFile();
            if (content.isErr()) {
                return err(content.error);
            }

            const changelog = Changelog.fromString(
                this.getChangelogPath(),
                content.value
            );
            return ok(changelog);
        } catch (error) {
            consola.error("Failed to generate changelog:", error);
            return err(
                new ChangelogError(
                    "Failed to generate changelog",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async generateUnreleased(): Promise<ArtemisResult<string>> {
        try {
            consola.info("Generating unreleased changelog");

            const result = await this.runGitCliff([
                "--unreleased",
                "--strip",
                "header",
            ]);

            if (result.isErr()) {
                return err(result.error);
            }

            return ok(result.value);
        } catch (error) {
            consola.error("Failed to generate unreleased changelog:", error);
            return err(
                new ChangelogError(
                    "Failed to generate unreleased changelog",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    getChangelogPath(): string {
        return join(this.basePath, this.changelogPath);
    }

    async hasChangelogFile(): Promise<boolean> {
        return existsSync(this.getChangelogPath());
    }

    async writeChangelog(changelog: Changelog): Promise<ArtemisResult<void>> {
        try {
            const content = changelog.toString();
            writeFileSync(this.getChangelogPath(), content);

            consola.success(`Changelog written to ${this.getChangelogPath()}`);
            return ok(undefined);
        } catch (error) {
            consola.error("Failed to write changelog:", error);
            return err(
                new ChangelogError(
                    "Failed to write changelog",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private async readChangelogFile(): Promise<ArtemisResult<string>> {
        try {
            const content = readFileSync(this.getChangelogPath(), "utf8");
            return ok(content);
        } catch (error) {
            consola.error("Failed to read changelog file:", error);
            return err(
                new ChangelogError(
                    "Failed to read changelog file",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private async runGitCliff(args: string[]): Promise<ArtemisResult<string>> {
        try {
            const proc = Bun.spawn(["git-cliff", ...args], {
                cwd: this.basePath,
                stdout: "pipe",
                stderr: "pipe",
            });

            const output = await new Response(proc.stdout).text();
            const error = await new Response(proc.stderr).text();

            await proc.exited;

            if (proc.exitCode !== 0) {
                return err(
                    new ChangelogError(
                        `git-cliff command failed: ${error || "Unknown error"}`
                    )
                );
            }

            return ok(output);
        } catch (error) {
            consola.error("Failed to run git-cliff command:", error);
            return err(
                new ChangelogError(
                    "Failed to run git-cliff command",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }
}
