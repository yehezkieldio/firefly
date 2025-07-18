import { program } from "commander";
import { consola } from "consola";
import type { ArtemisConfig } from "#/infrastructure/config/index.js";
import { loadArtemisConfig } from "#/infrastructure/config/index.js";

export interface CLIOptions extends Partial<ArtemisConfig> {
    // CLI-specific options
    config?: string;
}

export async function createCLI(): Promise<typeof program> {
    program
        .name("artemis")
        .description(
            "CLI orchestrator for semantic versioning, changelog generation, and creating releases"
        )
        .version("2.0.0-alpha.0");

    // Global options
    program
        .option("-c, --config <path>", "Path to config file")
        .option(
            "--dry-run",
            "Run in dry-run mode without making changes",
            false
        )
        .option("--verbose", "Enable verbose logging", false)
        .option("--name <name>", "Project name (defaults to package.json name)")
        .option("--scope <scope>", "Organization or user scope (without @)")
        .option("--base <path>", "Base path for monorepo projects")
        .option("--repository <repo>", "Repository identifier (owner/repo)")
        .option(
            "--changelog-path <path>",
            "Path to changelog file",
            "CHANGELOG.md"
        )
        .option("--branch <branch>", "Target branch", "main")
        .option("--github-token <token>", "GitHub authentication token")
        .option("--gitlab-token <token>", "GitLab authentication token");

    // Release command
    program
        .command("release")
        .description("Create a new release")
        .option(
            "--bump-strategy <strategy>",
            "Bump strategy (auto, manual, conventional)",
            "auto"
        )
        .option(
            "--release-type <type>",
            "Release type (major, minor, patch, prerelease, etc.)"
        )
        .option("--pre-release-id <id>", "Pre-release identifier")
        .option("--pre-release-base <base>", "Pre-release base version", "0")
        .option("--release-notes <notes>", "Custom release notes")
        .option("--commit-message <message>", "Commit message template")
        .option("--tag-name <name>", "Tag name template")
        .option("--release-title <title>", "Release title template")
        .option("--skip-bump", "Skip version bump", false)
        .option("--skip-changelog", "Skip changelog generation", false)
        .option("--skip-github-release", "Skip GitHub release creation", false)
        .option("--skip-gitlab-release", "Skip GitLab release creation", true)
        .option("--skip-commit", "Skip git commit", false)
        .option("--skip-tag", "Skip git tag creation", false)
        .option("--skip-push", "Skip git push", false)
        .option("--release-latest", "Mark as latest release", true)
        .option("--release-prerelease", "Mark as pre-release", false)
        .option("--release-draft", "Create as draft release", false)
        .action(async (options: CLIOptions) => {
            try {
                const config = await loadArtemisConfig({
                    configFile: options.config,
                    overrides: options,
                });

                if (config.verbose) {
                    consola.level = 5; // Debug level
                }

                consola.info("Starting release process...");
                consola.debug("Configuration:", config);

                // TODO: Implement release orchestration
                consola.warn("Release orchestration not yet implemented");
            } catch (error) {
                consola.error("Failed to execute release command:", error);
                process.exit(1);
            }
        });

    // Bump command
    program
        .command("bump")
        .description("Bump version without creating a release")
        .option(
            "--release-type <type>",
            "Release type (major, minor, patch, prerelease, etc.)"
        )
        .option("--pre-release-id <id>", "Pre-release identifier")
        .option("--skip-commit", "Skip git commit", false)
        .option("--skip-tag", "Skip git tag creation", false)
        .action(async (options: CLIOptions) => {
            try {
                const config = await loadArtemisConfig({
                    configFile: options.config,
                    overrides: options,
                });

                if (config.verbose) {
                    consola.level = 5; // Debug level
                }

                consola.info("Starting version bump...");
                consola.debug("Configuration:", config);

                // TODO: Implement version bump
                consola.warn("Version bump not yet implemented");
            } catch (error) {
                consola.error("Failed to execute bump command:", error);
                process.exit(1);
            }
        });

    // Changelog command
    program
        .command("changelog")
        .description("Generate changelog without creating a release")
        .option("--from <version>", "Generate changelog from version")
        .option("--to <version>", "Generate changelog to version")
        .option("--unreleased", "Generate unreleased changes only", false)
        .action(
            async (
                options: CLIOptions & {
                    from?: string;
                    to?: string;
                    unreleased?: boolean;
                }
            ) => {
                try {
                    const config = await loadArtemisConfig({
                        configFile: options.config,
                        overrides: options,
                    });

                    if (config.verbose) {
                        consola.level = 5; // Debug level
                    }

                    consola.info("Generating changelog...");
                    consola.debug("Configuration:", config);

                    // TODO: Implement changelog generation
                    consola.warn("Changelog generation not yet implemented");
                } catch (error) {
                    consola.error(
                        "Failed to execute changelog command:",
                        error
                    );
                    process.exit(1);
                }
            }
        );

    // Init command
    program
        .command("init")
        .description("Initialize Artemis configuration")
        .action(async () => {
            try {
                consola.info("Initializing Artemis configuration...");

                // TODO: Implement initialization
                consola.warn(
                    "Configuration initialization not yet implemented"
                );
            } catch (error) {
                consola.error("Failed to initialize configuration:", error);
                process.exit(1);
            }
        });

    // Config command
    program
        .command("config")
        .description("Show current configuration")
        .action(async (options: CLIOptions) => {
            try {
                const config = await loadArtemisConfig({
                    configFile: options.config,
                    overrides: options,
                });

                consola.info("Current Artemis configuration:");
                console.log(JSON.stringify(config, null, 2));
            } catch (error) {
                consola.error("Failed to load configuration:", error);
                process.exit(1);
            }
        });

    return program;
}

export { program } from "commander";
