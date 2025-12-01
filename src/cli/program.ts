import { Command } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import type { ZodObject, ZodRawShape } from "zod";
import { ConfigLoader } from "#/cli/config/config.loader";
import { OptionsBuilder } from "#/cli/options/options.builder";
import { OptionsNormalizer } from "#/cli/options/options.normalizer";
import type { ParsedCLIOptions, RuntimeConfig } from "#/cli/options/options.types";
import { releaseCommand } from "#/commands/release/release.command";
import type { BrandedCommand } from "#/core/command/command.types";
import { DebugFlags } from "#/core/environment/debug-flags";
import { RuntimeEnv } from "#/core/environment/runtime-env";
import { Workspace } from "#/core/environment/workspace";
import type { WorkflowExecutionResult } from "#/core/execution/workflow.executor";
import { WorkflowOrchestrator } from "#/core/execution/workflow.orchestrator";
import { CommandRegistry } from "#/core/registry/command.registry";
import { notFoundErrAsync, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { formatZodErrors } from "#/core/result/schema.utilities";
import { logger } from "#/infrastructure/logging";

/**
 * Context for command registration containing program, builder, and registry instances.
 */
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
        .description(RuntimeEnv.description)
        .version(RuntimeEnv.version)
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

/**
 * Creates a command registry for the CLI.
 *
 * @returns Configured command registry with all commands registered
 */
function createCommandRegistry(): CommandRegistry {
    const registry = new CommandRegistry();
    registry.registerCommand(releaseCommand);
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

    cmd.action(async (_cliOptions: ParsedCLIOptions, command: Command) => {
        const allOptions = command.optsWithGlobals() as ParsedCLIOptions;
        const normalizedOptions = ctx.normalizer.normalize(allOptions, configSchema);
        const result = await executeCommand(commandName, normalizedOptions, ctx.registry);

        if (result.isErr()) {
            logger.error(result.error.message);
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
 * 2. Load and merge config file values
 * 3. Execute through the workflow orchestrator
 *
 * @param commandName - The command to execute
 * @param cliOptions - Parsed and normalized CLI options (already merged with globals via optsWithGlobals)
 * @param registry - The command registry to look up the command
 * @returns Async result of the workflow execution
 */
function executeCommand(
    commandName: string,
    cliOptions: ParsedCLIOptions,
    registry: CommandRegistry
): FireflyAsyncResult<WorkflowExecutionResult> {
    logVersionInfo(commandName);

    if (cliOptions.verbose) {
        logger.level = LogLevels.verbose;
    }

    // Resolve workspace from cwd option (defaults to process.cwd())
    const workspace = Workspace.fromOptions({ basePath: cliOptions.cwd });

    const configLoader = new ConfigLoader({
        cwd: workspace.basePath,
        configFile: cliOptions.config,
        commandName,
    });

    return configLoader.load().andThen((fileConfig) => {
        const finalConfig = { ...fileConfig, ...cliOptions };
        return executeWithOrchestrator(commandName, finalConfig, workspace, registry);
    });
}

/**
 * Executes a command through the workflow orchestrator.
 *
 * @param commandName - The command to execute
 * @param config - The merged runtime configuration
 * @param workspace - The workspace for file operations
 * @param registry - The command registry
 * @returns Async result of the workflow execution
 */
function executeWithOrchestrator(
    commandName: string,
    config: RuntimeConfig,
    workspace: Workspace,
    registry: CommandRegistry
): FireflyAsyncResult<WorkflowExecutionResult> {
    const commandResult = registry.get(commandName);

    if (commandResult.isErr()) {
        return notFoundErrAsync({
            message: `Command "${commandName}" not found`,
        });
    }

    const command: BrandedCommand = commandResult.value;

    // Apply schema defaults by parsing the config through the command's schema
    const configSchema = command.meta.configSchema as ZodObject<ZodRawShape>;
    const parseResult = configSchema.safeParse(config);

    if (!parseResult.success) {
        const errors = formatZodErrors(parseResult.error);

        if (DebugFlags.showRawError) {
            logger.error(parseResult.error);
        }

        return validationErrAsync({
            message: errors,
        });
    }

    // Merge parsed config (with defaults) back with runtime config for global options
    const parsedConfig = { ...config, ...parseResult.data } as RuntimeConfig;
    const orchestrator = createOrchestrator(parsedConfig, workspace);

    return orchestrator.executeCommand(command, parsedConfig);
}

/**
 * Creates a workflow orchestrator with the given configuration.
 *
 * @param config - The runtime configuration
 * @param workspace - The workspace for file operations
 * @returns Configured workflow orchestrator
 */
function createOrchestrator(config: RuntimeConfig, workspace: Workspace): WorkflowOrchestrator {
    return new WorkflowOrchestrator({
        workspace,
        dryRun: config.dryRun ?? false,
        enableRollback: config.enableRollback ?? true,
        verbose: config.verbose ?? false,
    });
}

/**
 * Logs version information for the Firefly CLI.
 *
 * @param commandName - The name of the executed command
 */
function logVersionInfo(commandName: string): void {
    const fireflyVersion = colors.dim(`v${RuntimeEnv.version}`);
    const fireflyLabel = `${colors.magenta("firefly")} ${fireflyVersion}`;

    if (commandName === "release") {
        const gitCliffVersion = colors.dim(`v${RuntimeEnv.gitCliffVersion}`);
        logger.info(`${fireflyLabel} powered by git-cliff ${gitCliffVersion}`);
    } else {
        logger.info(fireflyLabel);
    }
}

/**
 * Get a description for a specific command.
 *
 * @param commandName - The name of the command
 * @returns A description of the command
 */
function getCommandDescription(commandName: string): string {
    const descriptions: Record<string, string> = {
        release: "Automated semantic versioning, changelog generation, and GitHub release creation",
    };

    return descriptions[commandName] ?? `Run the ${commandName} command`;
}
