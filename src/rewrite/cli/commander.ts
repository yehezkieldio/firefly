import { Command } from "commander";
import { colors } from "consola/utils";
import type { ZodObject } from "zod";
import { logger } from "#/shared/logger";
import { CommandRegistry as FireflyCommandRegistry } from "#/rewrite/command-registry/command-registry";
import { releaseCommand } from "#/rewrite/commands/release";
import { autocommitCommand } from "#/rewrite/commands/autocommit";
import { commitCommand } from "#/rewrite/commands/commit";
import { WorkflowOrchestrator } from "#/rewrite/execution/workflow-orchestrator";
import { ConfigLoader } from "./config-loader";
import { OptionsRegistrar } from "./options-registrar";
import type { CLIOptions, CommandConfig } from "./types";

/**
 * Creates and configures the Firefly CLI with the new architecture.
 */
export function createFireflyCLI(): Command {
    const program = new Command();

    // Configure program
    program
        .name("firefly")
        .description(String(process.env.FIREFLY_DESCRIPTION))
        .version(String(process.env.FIREFLY_VERSION))
        .helpOption("-h, --help", "Display help information")
        .helpCommand("help", "Display help for command");

    // Register global options
    const registrar = new OptionsRegistrar();
    registrar.registerGlobalOptions(program);

    // Initialize command registry and register commands
    const commandRegistry = new FireflyCommandRegistry();
    commandRegistry.register(releaseCommand);
    commandRegistry.register(autocommitCommand);
    commandRegistry.register(commitCommand);

    // Register each command with commander
    for (const command of commandRegistry.getAll()) {
        registerCommand(program, command.meta.name, command.meta.configSchema, registrar);
    }

    return program;
}

/**
 * Registers a single command with the CLI program.
 */
function registerCommand(
    program: Command,
    commandName: string,
    configSchema: ZodObject<any>,
    registrar: OptionsRegistrar,
): void {
    const cmd = program.command(commandName).description(getCommandDescription(commandName));

    // Register command-specific options
    registrar.registerCommandOptions(cmd, configSchema);

    // Set up command action
    cmd.action(async (cliOptions: CLIOptions) => {
        await executeCommand(commandName, cliOptions);
    });
}

/**
 * Executes a command with the given CLI options.
 */
async function executeCommand(commandName: string, cliOptions: CLIOptions): Promise<void> {
    try {
        // Display version info
        logVersionInfo(commandName);

        // Merge global and command options
        const mergedOptions = mergeOptions(cliOptions);

        // Load and merge file config
        const configLoader = new ConfigLoader({
            configFile: mergedOptions.config,
            commandName,
        });

        const configResult = await configLoader.load();

        if (configResult.isErr()) {
            logger.error("Configuration error:", configResult.error.message);
            process.exit(1);
        }

        const fileConfig = configResult.value;

        // CLI options override file config
        const finalConfig = { ...fileConfig, ...mergedOptions };

        // Get command from registry
        const commandRegistry = new FireflyCommandRegistry();
        commandRegistry.register(releaseCommand);
        commandRegistry.register(autocommitCommand);
        commandRegistry.register(commitCommand);

        const commandResult = commandRegistry.get(commandName);

        if (commandResult.isErr()) {
            logger.error(`Command "${commandName}" not found`);
            process.exit(1);
        }

        const command = commandResult.value;

        // Create orchestrator and execute
        const orchestrator = new WorkflowOrchestrator({
            dryRun: finalConfig.dryRun ?? false,
            enableRollback: finalConfig.enableRollback ?? true,
            verbose: finalConfig.verbose ?? false,
        });

        const result = await orchestrator.executeCommand(command, finalConfig);

        if (result.isErr()) {
            logger.error("Execution failed:", result.error.message);
            process.exit(1);
        }

        const executionResult = result.value;

        if (!executionResult.success) {
            logger.error(`Command failed: ${executionResult.error?.message || "Unknown error"}`);
            process.exit(1);
        }

        // Success!
        process.exit(0);
    } catch (error) {
        logger.error("Unexpected error:", error);
        process.exit(1);
    }
}

/**
 * Merges global and command-specific CLI options.
 */
function mergeOptions(options: CLIOptions): CLIOptions {
    // Get global options from commander program
    const globalOpts = options.parent?.opts() || {};
    return { ...globalOpts, ...options };
}

/**
 * Logs version information for the command.
 */
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

/**
 * Gets the description for a command.
 */
function getCommandDescription(commandName: string): string {
    const descriptions: Record<string, string> = {
        release: "Automated semantic versioning, changelog generation, and GitHub release creation",
        autocommit: "AI-generated conventional commit messages using Azure AI or other LLM providers",
        commit: "Interactive conventional commit creation with guided prompts",
    };

    return descriptions[commandName] || `Run the ${commandName} command`;
}
