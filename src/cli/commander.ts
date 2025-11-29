/**
 * CLI orchestration and command registration.
 *
 * This module creates the Commander.js program, registers commands and options,
 * and handles the execution flow from CLI input to workflow execution.
 *
 * @internal
 */

import { Command } from "commander";
import { colors } from "consola/utils";
import { errAsync } from "neverthrow";
import type { ZodObject, ZodRawShape } from "zod";
import { ConfigLoader } from "#/cli/config-loader";
import type { ParsedCLIOptions, RuntimeConfig } from "#/cli/internal-types";
import { OptionsBuilder } from "#/cli/options-builder";
import { OptionsNormalizer } from "#/cli/options-normalizer";
import { CommandRegistry } from "#/command-registry/command-registry";
import type { AnyCommand } from "#/command-registry/command-types";
import { releaseCommand } from "#/commands/release";
import type { WorkflowExecutionResult } from "#/execution/workflow-executor";
import { WorkflowOrchestrator } from "#/execution/workflow-orchestrator";
import { createFireflyError, toFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

/** Context for command registration containing program, builder, and registry instances. */
interface CommandRegistrationContext {
    program: Command;
    builder: OptionsBuilder;
    normalizer: OptionsNormalizer;
    registry: CommandRegistry;
}

/**
 * Creates and configures the Firefly CLI program.
 *
 * Sets up the Commander.js program with:
 * - Global options (--dry-run, --verbose, --no-enable-rollback)
 * - All registered commands with their specific options
 * - Help and version information
 *
 * @returns Configured Commander program ready for parsing
 */
export function createFireflyCLI(): Command {
    const program = new Command();

    program
        .name("firefly")
        .description(String(process.env.FIREFLY_DESCRIPTION))
        .version(String(process.env.FIREFLY_VERSION))
        .helpOption("-h, --help", "Display help information")
        .helpCommand("help", "Display help for command");

    const builder = new OptionsBuilder();
    builder.registerGlobalOptions(program);

    const normalizer = new OptionsNormalizer();
    const registry = createCommandRegistry();
    const ctx: CommandRegistrationContext = { program, builder, normalizer, registry };

    for (const command of registry.getAll()) {
        const configSchema = command.meta.configSchema as ZodObject<ZodRawShape>;
        registerCommand(ctx, command.meta.name, configSchema);
    }

    return program;
}

function createCommandRegistry(): CommandRegistry {
    const registry = new CommandRegistry();
    registry.register(releaseCommand);
    return registry;
}

/**
 * Registers a single command with the CLI program.
 *
 * @param ctx - The registration context containing program, builder, and registry
 * @param commandName - The name of the command to register
 * @param configSchema - The Zod schema defining the command's configuration
 */
function registerCommand(
    ctx: CommandRegistrationContext,
    commandName: string,
    configSchema: ZodObject<ZodRawShape>
): void {
    const cmd = ctx.program.command(commandName).description(getCommandDescription(commandName));

    ctx.builder.registerCommandOptions(cmd, configSchema);

    cmd.action(async (cliOptions: ParsedCLIOptions) => {
        const normalizedOptions = ctx.normalizer.normalize(cliOptions, configSchema);
        const result = await executeCommand(commandName, normalizedOptions, ctx.registry);

        if (result.isErr()) {
            logger.error("Execution failed:", result.error.message);
            process.exit(1);
        }

        const executionResult = result.value;

        if (!executionResult.success) {
            process.exit(1);
        }

        process.exit(0);
    });
}

/**
 * Executes a command with the given options.
 *
 * Handles the full execution flow:
 * 1. Log version information
 * 2. Merge global and command options
 * 3. Load and merge config file values
 * 4. Execute through the workflow orchestrator
 *
 * @param commandName - The command to execute
 * @param cliOptions - Parsed and normalized CLI options
 * @param registry - The command registry to look up the command
 * @returns Async result of the workflow execution
 */
function executeCommand(
    commandName: string,
    cliOptions: ParsedCLIOptions,
    registry: CommandRegistry
): FireflyAsyncResult<WorkflowExecutionResult> {
    logVersionInfo(commandName);

    const mergedOptions = mergeOptions(cliOptions);

    const configLoader = new ConfigLoader({
        configFile: mergedOptions.config,
        commandName,
    });

    return configLoader.load().andThen((fileConfig) => {
        const finalConfig = { ...fileConfig, ...mergedOptions };
        return executeWithOrchestrator(commandName, finalConfig, registry);
    });
}

/**
 * Executes a command through the workflow orchestrator.
 *
 * @param commandName - The command to execute
 * @param config - The merged runtime configuration
 * @param registry - The command registry
 * @returns Async result of the workflow execution
 */
function executeWithOrchestrator(
    commandName: string,
    config: RuntimeConfig,
    registry: CommandRegistry
): FireflyAsyncResult<WorkflowExecutionResult> {
    const commandResult = registry.get(commandName);

    if (commandResult.isErr()) {
        return errAsync(
            createFireflyError({
                code: "NOT_FOUND",
                message: `Command "${commandName}" not found`,
                source: "cli/commander",
            })
        );
    }

    const command: AnyCommand = commandResult.value;

    // Apply schema defaults by parsing the config through the command's schema
    const configSchema = command.meta.configSchema as ZodObject<ZodRawShape>;
    const parseResult = configSchema.safeParse(config);

    if (!parseResult.success) {
        const errors = parseResult.error.issues
            .map((issue) => `  • ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");
        logger.error("Config validation failed:");
        logger.error(errors);
        return errAsync(
            createFireflyError(toFireflyError(`Invalid configuration:\n${errors}`, "VALIDATION", "cli/commander"))
        );
    }

    // Merge parsed config (with defaults) back with runtime config for global options
    const parsedConfig = { ...config, ...parseResult.data } as RuntimeConfig;
    const orchestrator = createOrchestrator(parsedConfig);

    return orchestrator.executeCommand(command, parsedConfig);
}

/** Creates a workflow orchestrator with the given configuration. */
function createOrchestrator(config: RuntimeConfig): WorkflowOrchestrator {
    return new WorkflowOrchestrator({
        dryRun: config.dryRun ?? false,
        enableRollback: config.enableRollback ?? true,
        verbose: config.verbose ?? false,
    });
}

/**
 * Merges global options from the parent command with command-specific options.
 *
 * Commander.js stores global options in the parent context, so we need to
 * extract and merge them with the command's own options.
 *
 * @param options - The command's parsed options
 * @returns Merged options including global flags
 */
function mergeOptions(options: ParsedCLIOptions): ParsedCLIOptions {
    const parent = options.parent as { opts?: () => ParsedCLIOptions } | undefined;
    const globalOpts = parent?.opts?.() ?? {};
    return { ...globalOpts, ...options };
}

function logVersionInfo(commandName: string): void {
    const fireflyVersion = colors.dim(`v${String(process.env.FIREFLY_VERSION)}`);
    const fireflyLabel = `${colors.magenta("firefly")} ${fireflyVersion}`;

    if (commandName === "release") {
        const gitCliffVersion = colors.dim(`v${String(process.env.FIREFLY_GIT_CLIFF_VERSION)}`);
        logger.info(`${fireflyLabel} powered by git-cliff ${gitCliffVersion}`);
    } else {
        logger.info(fireflyLabel);
    }
}

function getCommandDescription(commandName: string): string {
    const descriptions: Record<string, string> = {
        release: "Automated semantic versioning, changelog generation, and GitHub release creation",
    };

    return descriptions[commandName] ?? `Run the ${commandName} command`;
}
