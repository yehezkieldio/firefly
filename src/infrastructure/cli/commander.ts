import { program } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { BumpVersionCommand } from "#/application/commands/bump-version.command";
import { DetermineVersionCommand } from "#/application/commands/determine-version.command";
import { PreflightCheckCommand } from "#/application/commands/preflight-check.command";
import { ApplicationContext } from "#/application/context";
import { Orchestrator } from "#/application/orchestrator";
import type { FireflyConfig } from "#/infrastructure/config";
import { configLoader } from "#/infrastructure/config/loader";
import { logger } from "#/shared/logger";
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
        .option("--bump-strategy <strategy>", "Bump strategy (auto, manual)", "auto")
        .option("--release-type <type>", "Release type (major, minor, patch, prerelease, etc.)")
        .option("--pre-release-id <id>", "Pre-release identifier")
        .option("--pre-release-base <base>", "Pre-release base version", "0")
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
                ];

                const orchestrator = new Orchestrator(context, commands);
                await orchestrator.run();
            } catch (error) {
                logger.error("Failed to execute release command:", error);
                process.exit(1);
            }
        });

    return program;
}

export { program } from "commander";
