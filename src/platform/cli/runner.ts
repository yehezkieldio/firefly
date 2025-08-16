import { program } from "commander";
import { LogLevels } from "consola";
import { colors } from "consola/utils";
import { ZodError } from "zod";
import type { CommandName, __FireflyConfig } from "#/modules/configuration/application/schema-registry.service";
import { ConfigLoader } from "#/modules/configuration/infrastructure/services/config-loader.service";
import {
    type WorkflowRunnerOptions,
    WorkflowRunnerService,
} from "#/modules/orchestration/application/workflow-runner.service";
import type { Workflow } from "#/modules/orchestration/core/contracts/workflow.interface";
import type { CLIOptions } from "#/platform/cli/commander";
import { logger } from "#/shared/logger";
import pkg from "../../../package.json" with { type: "json" };

export type WorkflowFactory = () => Workflow;

export class CLIRunner {
    constructor(private readonly cwd = process.cwd()) {}

    async run(commandName: CommandName, options: CLIOptions, workflowFactory: WorkflowFactory): Promise<void> {
        logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${pkg.version}`)}`);

        const mergedOptions = this.mergeOptions(options);

        const configResult = await this.loadConfig(commandName, mergedOptions);
        if (configResult.isErr()) {
            this.handleConfigError(configResult.error);
            return;
        }

        const config = configResult.value;
        if (config.verbose) {
            logger.level = LogLevels.verbose;
        }

        const runnerOptions = this.buildRunnerOptions(config, mergedOptions);

        const runner = new WorkflowRunnerService();
        await runner.run(runnerOptions, (context) => {
            const setConfigResult = context.set("config", config);
            if (setConfigResult.isErr()) {
                logger.error("Failed to set config in application context", setConfigResult.error);
            }
            return workflowFactory();
        });
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
