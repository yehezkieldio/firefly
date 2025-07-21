import { InvalidArgumentError, program } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { BumpVersionCommand } from "#/application/commands/bump-version.command";
import { CreateCommitCommand } from "#/application/commands/create-commit.command";
import { CreateReleaseCommand } from "#/application/commands/create-release.command";
import { CreateTagCommand } from "#/application/commands/create-tag.command";
import { DetermineVersionCommand } from "#/application/commands/determine-version.command";
import { GenerateChangelogCommand } from "#/application/commands/generate-changelog.command";
import { PreflightCheckCommand } from "#/application/commands/preflight-check.command";
import { PushChangesCommand } from "#/application/commands/push-changes.command";
import { ApplicationContext } from "#/application/context";
import { OrchestratorService } from "#/application/services/orchestrator.service";
import type { FireflyConfig } from "#/infrastructure/config";
import { configLoader } from "#/infrastructure/config/loader";
import { logger } from "#/shared/utils/logger";
import pkg from "../../../package.json" with { type: "json" };

export interface CLIOptions extends Partial<FireflyConfig> {
    config?: string;
}

export async function createCLI(): Promise<typeof program> {
    program.name("firefly").description(pkg.description).version(pkg.version);

    // Global options
    program
        .option("--dry-run", "Run in dry-run mode without making changes", false)
        .option("--verbose", "Enable verbose logging", false)
        .option("--name <name>", "Project name (defaults to package.json name)")
        .option("--scope <scope>", "Organization or user scope (without @)")
        .option("--base <path>", "Base path for the project, if not the current directory")
        .option("--repository <repo>", "Repository identifier (owner/repo)")
        .option("--changelog-path <path>", "Path to changelog file", "CHANGELOG.md")
        .option("--branch <branch>", "Target branch", "master")
        .helpOption("-h, --help", "Display help information")
        .helpCommand("help", "Display help for command");

    // Release command
    program
        .command("release")
        .description("Create a new release")
        .option("--bump-strategy <strategy>", "Bump strategy (auto, manual)", "manual")
        .option("--release-type <type>", "Release type (major, minor, patch, prerelease, etc.)")
        .option("--pre-release-id <id>", "Pre-release identifier")
        .option("--pre-release-base <base>", "Pre-release base version", (input) => {
            if (input === "0" || input === "1") return input;
            throw new InvalidArgumentError("Not a number of 0 or 1.");
        })
        .option("--release-notes <notes>", "Custom release notes")
        .option("--commit-message <message>", "Commit message template")
        .option("--tag-name <name>", "Tag name template")
        .option("--release-title <title>", "Release title template")
        .option("--skip-bump", "Skip version bump", false)
        .option("--skip-changelog", "Skip changelog generation", false)
        .option("--skip-github-release", "Skip GitHub release creation", false)
        .option("--skip-commit", "Skip git commit", false)
        .option("--skip-tag", "Skip git tag creation", false)
        .option("--skip-push", "Skip git push", false)
        .option("--release-latest", "Mark as latest release", true)
        .option("--release-prerelease", "Mark as pre-release (GitHub only)", false)
        .option("--release-draft", "Create as draft release (GitHub only)", false)
        .action(async (options: CLIOptions) => {
            try {
                logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${pkg.version}`)}`);

                const globalOptions = program.opts();
                const mergedOptions = { ...globalOptions, ...options };

                const config = await configLoader({
                    configFile: mergedOptions.config,
                    overrides: mergedOptions,
                });

                if (config.verbose) {
                    logger.level = LogLevels.verbose;
                }

                const context = new ApplicationContext(config);
                const commands = [
                    new PreflightCheckCommand(context),
                    new DetermineVersionCommand(context),
                    new BumpVersionCommand(context),
                    new GenerateChangelogCommand(context),
                    new CreateCommitCommand(context),
                    new CreateTagCommand(context),
                    new PushChangesCommand(context),
                    new CreateReleaseCommand(context),
                ];

                const orchestrator = new OrchestratorService(context, commands);
                await orchestrator.run();
            } catch (error) {
                logger.error("Failed to execute release command:", error);
                process.exit(1);
            }
        });

    return program;
}

export { program } from "commander";
