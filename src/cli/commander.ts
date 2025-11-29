import { Command } from "commander";
import { colors } from "consola/utils";
import { errAsync } from "neverthrow";
import type { ZodObject, ZodRawShape } from "zod";
import { ConfigLoader } from "#/cli/config-loader";
import { OptionsRegistrar } from "#/cli/options-registrar";
import type { CLIOptions, CommandConfig } from "#/cli/types";
import { CommandRegistry } from "#/command-registry/command-registry";
import type { AnyCommand } from "#/command-registry/command-types";
import { releaseCommand } from "#/commands/release";
import type { WorkflowExecutionResult } from "#/execution/workflow-executor";
import { WorkflowOrchestrator } from "#/execution/workflow-orchestrator";
import { createFireflyError } from "#/utils/error";
import { logger } from "#/utils/log";
import type { FireflyAsyncResult } from "#/utils/result";

interface CommandRegistrationContext {
    program: Command;
    registrar: OptionsRegistrar;
    registry: CommandRegistry;
}

export function createFireflyCLI(): Command {
    const program = new Command();

    program
        .name("firefly")
        .description(String(process.env.FIREFLY_DESCRIPTION))
        .version(String(process.env.FIREFLY_VERSION))
        .helpOption("-h, --help", "Display help information")
        .helpCommand("help", "Display help for command");

    const registrar = new OptionsRegistrar();
    registrar.registerGlobalOptions(program);

    const registry = createCommandRegistry();
    const ctx: CommandRegistrationContext = { program, registrar, registry };

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

function registerCommand(
    ctx: CommandRegistrationContext,
    commandName: string,
    configSchema: ZodObject<ZodRawShape>
): void {
    const cmd = ctx.program.command(commandName).description(getCommandDescription(commandName));

    ctx.registrar.registerCommandOptions(cmd, configSchema);

    cmd.action(async (cliOptions: CLIOptions) => {
        const result = await executeCommand(commandName, cliOptions, ctx.registry);

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

function executeCommand(
    commandName: string,
    cliOptions: CLIOptions,
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

function executeWithOrchestrator(
    commandName: string,
    config: CommandConfig,
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
    const orchestrator = createOrchestrator(config);

    return orchestrator.executeCommand(command, config);
}

function createOrchestrator(config: CommandConfig): WorkflowOrchestrator {
    return new WorkflowOrchestrator({
        dryRun: config.dryRun ?? false,
        enableRollback: config.enableRollback ?? true,
        verbose: config.verbose ?? false,
    });
}

function mergeOptions(options: CLIOptions): CLIOptions {
    const parent = options.parent as { opts?: () => CLIOptions } | undefined;
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
