import { InvalidArgumentError, program } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import {
    BumpStrategySchema,
    BumpStrategyValues,
    ReleaseTypeSchema,
    ReleaseTypeValues,
} from "#/modules/semver/core/constants";
import { CLIRunner } from "#/platform/cli/runner";
import type { FireflyConfig } from "#/platform/config";
import pkg from "../../../package.json" with { type: "json" };

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

const runner = new CLIRunner();

export async function createCLI(): Promise<typeof program> {
    program.name("firefly").description(pkg.description).version(pkg.version);

    program.helpOption("-h, --help", "Display help information").helpCommand("help", "Display help for command");
    program.option("--ci", "Indicate if running in a CI environment", false);
    program.option("--repository <repo>", "Repository identifier (owner/repo)");
    program.option("--verbose", "Enable verbose logging", false);
    program.option("--dry-run", "Run in dry-run mode without making changes", false);
    program.option("--branch <branch>", "Target branch, defaults to current branch if not specified");

    program
        .command("release")
        .description("Create a new release")
        .option("--name <name>", "Project name (defaults to package.json name)")
        .option("--scope <scope>", "Organization or user scope (without @)")
        .option("--base <path>", "Base path for the project, if not the current directory")

        .option("--changelog-path <path>", "Path to changelog file", "CHANGELOG.md")

        .option(
            "--bs,--bump-strategy <strategy>",
            "Bump strategy (auto, manual)",
            (input) => {
                const result = BumpStrategySchema.safeParse(input);
                if (!result.success) {
                    throw new InvalidArgumentError(
                        `Invalid bump strategy: "${input}". Must be one of: ${BumpStrategyValues.join(", ")}`,
                    );
                }
                return result.data;
            },
            "manual",
        )
        .option("--rt, --release-type <type>", "Release type (major, minor, patch, prerelease, etc.)", (input) => {
            if (input === undefined) return;
            const result = ReleaseTypeSchema.safeParse(input);
            if (!result.success) {
                throw new InvalidArgumentError(
                    `Invalid release type: "${input}". Must be one of: ${ReleaseTypeValues.join(", ")}`,
                );
            }
            return result.data;
        })

        .option("--pre-release-id <id>", "Pre-release identifier")
        .option("--pre-release-base <base>", "Pre-release base version", (input) => {
            if (input === "0" || input === "1") return input;
            throw new InvalidArgumentError("Not a number of 0 or 1.");
        })

        .option("--release-notes <notes>", "Custom release notes")

        .option("--commit-message <message>", "Commit message template")
        .option("--tag-name <name>", "Tag name template")

        .option("--skip-bump", "Skip version bump", false)
        .option("--skip-changelog", "Skip changelog generation", false)
        .option("--skip-commit", "Skip git commit", false)
        .option("--skip-tag", "Skip git tag creation", false)
        .option("--skip-push", "Skip git push", false)
        .option("--skip-git", "Skip all git-related steps", false)
        .option("--skip-github-release", "Skip GitHub release creation", false)

        .option("--release-title <title>", "Release title template")
        .option("--release-latest", "Mark as latest release", true)
        .option("--release-prerelease", "Mark as pre-release (GitHub only)", false)
        .option("--release-draft", "Create as draft release (GitHub only)", false)

        .action((options: CLIOptions) => runner.run("release", options, createReleaseWorkflow));

    return program;
}
