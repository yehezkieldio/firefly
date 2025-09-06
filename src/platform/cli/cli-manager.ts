import { program } from "commander";
import { colors } from "consola/utils";
import { ZodError, type ZodObject, type ZodRawShape } from "zod";
import { ConfigLoaderService } from "#/modules/configuration/config-loader.service";
import type { CommandName } from "#/modules/configuration/config-schema.provider";
import {
    type WorkflowExecutorOptions,
    WorkflowExecutorService,
    type WorkflowFactory,
} from "#/modules/orchestration/workflow-executor.service";
import type { CLIOptions } from "#/platform/cli/cli-commander";
import { CLIOptionNormalizer } from "#/platform/cli/option-normalizer";
import { CLIOptionRegistrar } from "#/platform/cli/option-registrar";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";

export class CLIManager {
    private readonly optionRegistrar = new CLIOptionRegistrar();
    private readonly optionNormalizer = new CLIOptionNormalizer();

    private version = "";

    create<T extends ZodRawShape>(description: string, version: string, schema: ZodObject<T>): typeof program {
        this.version = version;
        program.name("firefly").description(description).version(version);
        program.helpOption("-h, --help", "Display help information").helpCommand("help", "Display help for command");
        this.optionRegistrar.registerOptions(program, schema);

        return program;
    }

    registerCommand<TCommand extends CommandName, TShape extends ZodRawShape>(
        name: TCommand,
        description: string,
        schema: ZodObject<TShape>,
        workflowFactory: WorkflowFactory<TCommand>,
    ): void {
        const cmd = program.command(name).description(description);
        const gitCliffVersion = `powered by git-cliff ${colors.dim(`v${process.env.FIREFLY_GIT_CLIFF_VERSION ?? "0"}`)}`;

        this.optionRegistrar.registerOptions(cmd, schema);

        cmd.action((options: CLIOptions) => {
            if (name === "release") {
                logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${this.version}`)} ${gitCliffVersion}`);
            } else {
                logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${this.version}`)}`);
            }

            return this.run(name, options, workflowFactory);
        });
    }

    private async run<TCommand extends CommandName>(
        commandName: TCommand,
        options: CLIOptions,
        workflowFactory: WorkflowFactory<TCommand>,
    ): Promise<void> {
        const rawMergedOptions = { ...program.opts(), ...options };
        const mergedOptions = this.optionNormalizer.normalize(rawMergedOptions, commandName);

        const configResult = await this.loadConfig(commandName, mergedOptions);
        if (configResult.isErr()) return this.handleConfigError(configResult.error);

        const runnerOptions = this.buildRunnerOptions(configResult.value, mergedOptions);
        logger.log(JSON.stringify(runnerOptions.config, null, 2));
        await new WorkflowExecutorService().run(commandName, runnerOptions, workflowFactory);
    }

    private loadConfig(commandName: CommandName, mergedOptions: CLIOptions) {
        const loader = new ConfigLoaderService({
            configFile: mergedOptions.config,
            overrides: mergedOptions,
            commandName,
        });
        return loader.load();
    }

    private handleConfigError(error: unknown): void {
        if (error instanceof ZodError) {
            const messages = error.issues.map((issue) => issue.message);
            logger.error(messages.join("; "));
        }
    }

    private buildRunnerOptions(config: FireflyConfig, mergedOptions: CLIOptions): WorkflowExecutorOptions {
        const enabledFeatures = ["bump", "changelog", "commit", "push", "git", "github"].filter((feature) => {
            if (mergedOptions.skipBump && feature === "bump") return false;
            if (mergedOptions.skipChangelog && feature === "changelog") return false;
            if (mergedOptions.skipCommit && feature === "commit") return false;
            if (mergedOptions.skipPush && feature === "push") return false;
            if (mergedOptions.skipGit && feature === "git") return false;
            if (mergedOptions.skipGitHubRelease && feature === "github") return false;
            return true;
        });

        return {
            dryRun: config.dryRun ?? false,
            verbose: config.verbose ?? false,
            enabledFeatures,
            rollbackStrategy: "reverse",
            continueOnError: false,
            config,
        };
    }
}
