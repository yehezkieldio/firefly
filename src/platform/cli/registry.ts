import { program } from "commander";
import { colors } from "consola/utils";
import { ZodError, type ZodObject, type ZodRawShape } from "zod";
import { ConfigLoaderService } from "#/modules/configuration/config-loader.service";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import {
    type WorkflowExecutorOptions,
    WorkflowExecutorService,
    type WorkflowFactory,
} from "#/modules/orchestration/services/workflow-executor.service";
import type { CLIOptions } from "#/platform/cli/commander";
import { OptionNormalizer } from "#/platform/cli/options/normalizer";
import { OptionRegistrar } from "#/platform/cli/options/registrar";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";
import type { FireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

export class CommandRegistry {
    private readonly normalizer = new OptionNormalizer();
    private readonly registrar = new OptionRegistrar();

    create<T extends ZodRawShape>(schema: ZodObject<T>): typeof program {
        program.name("firefly");
        program.description(String(process.env.FIREFLY_DESCRIPTION)).version(String(process.env.FIREFLY_VERSION));
        program.helpOption("-h, --help", "Display help information").helpCommand("help", "Display help for command");

        this.registrar.registerOptions(program, schema);
        return program;
    }

    register<TCommand extends CommandName, TShape extends ZodRawShape>(
        schema: ZodObject<TShape>,
        workflowFactory: WorkflowFactory<TCommand>,
    ): void {
        const { command, description } = workflowFactory();
        const cmd = program.command(command).description(description);

        this.registrar.registerOptions(cmd, schema);

        cmd.action((cliOptions: CLIOptions) => {
            this.logVersionInfo(command);
            return this.runCommand(command as TCommand, cliOptions, workflowFactory);
        });
    }

    private logVersionInfo(command: string): void {
        logger.info(this.formatVersionInfo(command));
    }

    private formatVersionInfo(command: string): string {
        const fireflyVersion = colors.dim(`v${String(process.env.FIREFLY_VERSION)}`);
        const fireflyLabel = `${colors.magenta("firefly")} ${fireflyVersion}`;

        if (command === "release") {
            const gitCliffVersion = colors.dim(`v${String(process.env.FIREFLY_GIT_CLIFF_VERSION)}`);
            return `${fireflyLabel} powered by git-cliff ${gitCliffVersion}`;
        }

        return fireflyLabel;
    }

    private async runCommand<TCommand extends CommandName>(
        commandName: TCommand,
        cliOptions: CLIOptions,
        workflowFactory: WorkflowFactory<TCommand>,
    ): Promise<void> {
        const mergedOptions = this.mergeAndNormalizeOptions(cliOptions, commandName);
        const configResult = await this.loadConfig(commandName, mergedOptions);

        if (configResult.isErr()) {
            this.handleConfigError(configResult.error);
            return;
        }

        const finalConfig = { ...configResult.value, ...mergedOptions };
        const executorOptions = this.buildExecutorOptions(finalConfig);
        await new WorkflowExecutorService().run(commandName, executorOptions, workflowFactory);
    }

    private mergeAndNormalizeOptions(options: CLIOptions, commandName: CommandName): CLIOptions {
        const rawOptions = { ...program.opts(), ...options };
        const normalized = this.normalizer.normalize(rawOptions, commandName);

        const { releaseLatest, releasePreRelease, releaseDraft } = normalized;
        if (releasePreRelease === true || releaseDraft === true) {
            normalized.releaseLatest = false;
        }
        if (releaseLatest === true) {
            normalized.releasePreRelease = false;
            normalized.releaseDraft = false;
        }

        return normalized;
    }

    private buildExecutorOptions(mergedOptions: CLIOptions): WorkflowExecutorOptions {
        return {
            dryRun: mergedOptions.dryRun ?? false,
            verbose: mergedOptions.verbose ?? false,
            rollbackStrategy: "reverse",
            continueOnError: false,
            config: mergedOptions,
        };
    }

    private loadConfig(commandName: CommandName, mergedOptions: CLIOptions): FireflyAsyncResult<FireflyConfig> {
        const configLoader = new ConfigLoaderService({
            configFile: mergedOptions.config,
            overrides: mergedOptions,
            commandName,
        });

        return configLoader.load();
    }

    private handleConfigError(error: FireflyError): void {
        if (error.cause instanceof ZodError) {
            logger.error(error.cause.issues.map((i) => i.message).join("; "));
        }
    }
}
