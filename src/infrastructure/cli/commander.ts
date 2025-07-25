import { InvalidArgumentError, program } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { ZodError } from "zod";
import { ApplicationContext } from "#/application/context";
import { TaskOrchestratorService } from "#/application/services/task-orchestrator.service";
import { BumpVersionTask } from "#/application/tasks/bump-version.task";
import { CreateCommitTask } from "#/application/tasks/create-commit.task";
import { CreateReleaseTask } from "#/application/tasks/create-release.task";
import { CreateTagTask } from "#/application/tasks/create-tag.task";
import { DetermineNextVersionTask } from "#/application/tasks/determine-next-version.task";
import { GenerateChangelogTask } from "#/application/tasks/generate-changelog.task";
import { PreflightCheckTask } from "#/application/tasks/preflight-check.task";
import { PushChangesTask } from "#/application/tasks/push-changes.task";
import type { FireflyConfig } from "#/infrastructure/config";
import { configLoader } from "#/infrastructure/config/config-loader";
import {
    BumpStrategySchema,
    BumpStrategyValues,
    ReleaseTypeSchema,
    ReleaseTypeValues,
} from "#/infrastructure/config/schema";
import { logger } from "#/shared/utils/logger.util";
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
        .option("--branch <branch>", "Target branch, defaults to current branch if not specified")
        .helpOption("-h, --help", "Display help information")
        .helpCommand("help", "Display help for command");

    // Release command
    program
        .command("release")
        .description("Create a new release")
        .option(
            "--bs,--bump-strategy <strategy>",
            "Bump strategy (auto, manual)",
            (input) => {
                const result = BumpStrategySchema.safeParse(input);
                if (!result.success) {
                    throw new InvalidArgumentError(
                        `Invalid bump strategy: "${input}". Must be one of: ${BumpStrategyValues.join(", ")}`
                    );
                }
                return result.data;
            },
            "manual"
        )
        .option("--rt, --release-type <type>", "Release type (major, minor, patch, prerelease, etc.)", (input) => {
            // Accept undefined (no input) or a valid value
            if (input === undefined) return undefined;
            const result = ReleaseTypeSchema.safeParse(input);
            if (!result.success) {
                throw new InvalidArgumentError(
                    `Invalid release type: "${input}". Must be one of: ${ReleaseTypeValues.join(", ")}`
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
            logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${pkg.version}`)}`);

            const globalOptions = program.opts();
            const mergedOptions = { ...globalOptions, ...options };

            const configResult = await configLoader({
                configFile: mergedOptions.config,
                overrides: mergedOptions,
            });
            if (configResult.isErr()) {
                if (configResult.error instanceof ZodError) {
                    const messages = configResult.error.issues.map((issue) => issue.message);
                    logger.error(messages.join("; "));
                }

                process.exit(1);
            }

            const config = configResult.value;

            if (config.verbose) {
                logger.level = LogLevels.verbose;
            }

            if (config.dryRun) {
                logger.warn("Running in dry-run mode. No changes will be made.");
            }

            const context = new ApplicationContext(config);
            const tasks = [
                new PreflightCheckTask(context),
                new DetermineNextVersionTask(context),
                new BumpVersionTask(context),
                new GenerateChangelogTask(context),
                new CreateCommitTask(context),
                new CreateTagTask(context),
                new PushChangesTask(context),
                new CreateReleaseTask(context),
            ];

            const orchestrator = new TaskOrchestratorService(context, tasks);
            await orchestrator.run();
        });

    return program;
}

export { program } from "commander";
