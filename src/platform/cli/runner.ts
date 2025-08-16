import { program } from "commander";
import { colors } from "consola/utils";
import { ZodError } from "zod";
import type { CommandName, __FireflyConfig } from "#/modules/configuration/application/schema-registry.service";
import { ConfigLoader } from "#/modules/configuration/infrastructure/services/config-loader.service";
import {
    type WorkflowFactory,
    type WorkflowRunnerOptions,
    WorkflowRunnerService,
} from "#/modules/orchestration/application/workflow-runner.service";
import type { CLIOptions } from "#/platform/cli/commander";
import { logger } from "#/shared/logger";
import pkg from "../../../package.json" with { type: "json" };

export class CLIRunner {
    constructor(private readonly cwd = process.cwd()) {}

    async run<TCommand extends CommandName>(
        commandName: TCommand,
        options: CLIOptions,
        workflowFactory: WorkflowFactory<TCommand>,
    ): Promise<void> {
        logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${pkg.version}`)}`);

        const mergedOptions = this.mergeOptions(options);
        const configResult = await this.loadConfig(commandName, mergedOptions);

        if (configResult.isErr()) {
            this.handleConfigError(configResult.error);
            return;
        }

        const config = configResult.value;
        const runnerOptions = this.buildRunnerOptions(config, mergedOptions);

        const runner = new WorkflowRunnerService();
        await runner.run(commandName, runnerOptions, workflowFactory);
    }

    private mergeOptions(options: CLIOptions): CLIOptions {
        const globalOptions = program.opts();
        return { ...globalOptions, ...options };
    }

    private loadConfig(commandName: CommandName, mergedOptions: CLIOptions) {
        const loader = new ConfigLoader({
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

    private buildRunnerOptions(config: Partial<__FireflyConfig>, mergedOptions: CLIOptions): WorkflowRunnerOptions {
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
