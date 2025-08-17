import { type Command, InvalidArgumentError, program } from "commander";
import { colors } from "consola/utils";
import z, { ZodError, type ZodObject, type ZodRawShape } from "zod";
import type { CommandName } from "#/modules/configuration/application/config-schema.registry";
import { ConfigLoader } from "#/modules/configuration/infrastructure/services/config-loader.service";
import {
    type WorkflowFactory,
    type WorkflowRunnerOptions,
    WorkflowRunnerService,
} from "#/modules/orchestration/application/workflow-runner.service";
import type { CLIOptions } from "#/platform/cli/commander";
import type { FireflyConfig } from "#/platform/config";
import { logger } from "#/shared/logger";

export class CLIService {
    /**
     * Creates a new CLI instance.
     */
    create<T extends ZodRawShape>(description: string, version: string, schema: ZodObject<T>): typeof program {
        logger.info(`${colors.magenta("firefly")} ${colors.dim(`v${version}`)}`);

        program.name("firefly").description(description).version(version);
        program.helpOption("-h, --help", "Display help information").helpCommand("help", "Display help for command");
        this.registerOptions(program, schema);

        return program;
    }

    /**
     * Registers a new command.
     */
    registerCommand<TCommand extends CommandName>(
        name: TCommand,
        description: string,
        schema: ZodObject,
        workflowFactory: WorkflowFactory<TCommand>,
    ): void {
        const cmd = program.command(name).description(description);
        this.registerOptions(cmd, schema);
        cmd.action((options: CLIOptions) => this.run(name, options, workflowFactory));
    }

    /**
     * Registers command-line options for a command from a Zod schema.
     */
    private registerOptions<T extends ZodRawShape>(cmd: Command, schema: ZodObject<T>): void {
        const shape = schema.shape;

        const toKebab = (s: string) =>
            s
                .replace(/GitHub/g, "Github") // Handle "GitHub" as a special case first
                .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert dash between lowercase and uppercase
                .toLowerCase()
                .replace(/_/g, "-");

        const getInternalDef = (
            field: z.ZodType,
        ): { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] } => {
            const zodContainer = (field as unknown as { _zod?: { def?: unknown } })._zod;
            if (zodContainer?.def)
                return zodContainer.def as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
            const legacy = (field as unknown as { _def?: unknown })._def;
            return (legacy ?? {}) as { innerType?: z.ZodType; schema?: z.ZodType; values?: readonly string[] };
        };

        const unwrapSchema = (field: z.ZodType): z.ZodType => {
            if (field instanceof z.ZodDefault) {
                const inner = getInternalDef(field).innerType;
                return inner ? unwrapSchema(inner) : field;
            }

            if (field instanceof z.ZodOptional) {
                const inner = getInternalDef(field).innerType;
                return inner ? unwrapSchema(inner) : field;
            }

            if (field instanceof z.ZodUnknown) {
                const schema = getInternalDef(field).schema;
                return schema ? unwrapSchema(schema) : field;
            }

            return field;
        };

        const isBooleanField = (rawField: z.ZodType): boolean => {
            const def = getInternalDef(rawField);
            const inner = (def.innerType ?? def.schema) as z.ZodType | undefined;
            return inner instanceof z.ZodBoolean;
        };

        const getEnumChoices = (field: z.ZodType): readonly string[] => {
            const def = getInternalDef(field);
            return def.values ?? [];
        };

        for (const [key, rawField] of Object.entries(shape)) {
            if (!rawField) continue;

            const field = unwrapSchema(rawField as unknown as z.ZodType);
            const optionName = toKebab(key);

            let parsedDefault: unknown;
            const single = z.object({ [key]: rawField }).partial();
            const parseResult = single.safeParse({});
            if (parseResult.success) {
                parsedDefault = (parseResult.data as Record<string, unknown>)[key];
            }

            const description = (rawField as unknown as { description?: string }).description ?? "";

            if (isBooleanField(rawField as unknown as z.ZodType)) {
                cmd.option(`--${optionName}`, description);
                continue;
            }

            if (field instanceof z.ZodNumber) {
                const parser = (input: string) => {
                    const num = Number(input);
                    if (Number.isNaN(num))
                        throw new InvalidArgumentError(`Invalid number for --${optionName}: ${input}`);
                    const result = (rawField as unknown as z.ZodType).safeParse(num);
                    if (!result.success) throw new InvalidArgumentError(result.error.message);
                    return result.data;
                };
                cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as number | undefined);
                continue;
            }

            if (field instanceof z.ZodEnum) {
                const choices = getEnumChoices(field);
                const parser = (input: string) => {
                    const result = (rawField as unknown as z.ZodType).safeParse(input);
                    if (!result.success)
                        throw new InvalidArgumentError(
                            `Invalid value for --${optionName}: ${input}. Allowed: ${choices.join(", ")}`,
                        );
                    return result.data;
                };
                cmd.option(
                    `--${optionName} <${optionName}>`,
                    `${description}${choices.length ? ` (choices: ${choices.join(", ")})` : ""}`,
                    parser,
                    parsedDefault as string | undefined,
                );
                continue;
            }

            if (field instanceof z.ZodString) {
                const parser = (input: string) => {
                    const result = (rawField as unknown as z.ZodType).safeParse(input);
                    if (!result.success) throw new InvalidArgumentError(result.error.message);
                    return result.data;
                };
                cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as string | undefined);
                continue;
            }

            const parser = (input: string) => {
                const result = (rawField as unknown as z.ZodType).safeParse(input);
                if (!result.success) throw new InvalidArgumentError(result.error.message);
                return result.data;
            };
            cmd.option(`--${optionName} <${optionName}>`, description, parser, parsedDefault as unknown);
        }
    }

    /**
     * Runs the specified command with the given options.
     */
    private async run<TCommand extends CommandName>(
        commandName: TCommand,
        options: CLIOptions,
        workflowFactory: WorkflowFactory<TCommand>,
    ): Promise<void> {
        const mergedOptions = { ...program.opts(), ...options };

        const configResult = await this.loadConfig(commandName, mergedOptions);
        if (configResult.isErr()) return this.handleConfigError(configResult.error);

        const runnerOptions = this.buildRunnerOptions(configResult.value, mergedOptions);
        await new WorkflowRunnerService().run(commandName, runnerOptions, workflowFactory);
    }

    /**
     * Loads the configuration for the given command.
     */
    private loadConfig(commandName: CommandName, mergedOptions: CLIOptions) {
        const loader = new ConfigLoader({
            configFile: mergedOptions.config,
            overrides: mergedOptions,
            commandName,
        });
        return loader.load();
    }

    /**
     * Handles configuration errors.
     */
    private handleConfigError(error: unknown): void {
        if (error instanceof ZodError) {
            const messages = error.issues.map((issue) => issue.message);
            logger.error(messages.join("; "));
        }
    }

    /**
     * Builds the options for the workflow runner.
     */
    private buildRunnerOptions(config: FireflyConfig, mergedOptions: CLIOptions): WorkflowRunnerOptions {
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
