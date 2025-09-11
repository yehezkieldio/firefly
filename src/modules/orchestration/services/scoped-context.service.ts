import { err, ok } from "neverthrow";
import type { CommandName, FinalConfigFor } from "#/modules/configuration/config-schema.provider";
import type { ContextDataFor } from "#/modules/orchestration/contracts/context-data";
import type { OrchestrationContext } from "#/modules/orchestration/contracts/orchestration.interface";
import { ContextDataSchemas, getContextSchema } from "#/modules/orchestration/utils/context-schema.util";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyResult, parseSchema } from "#/shared/utils/result.util";

export class ScopedContextService<TCommand extends CommandName>
    implements OrchestrationContext<ContextDataFor<TCommand>, TCommand>
{
    readonly executionId: string;
    readonly startTime: Date;
    readonly command: TCommand;
    private state: ContextDataFor<TCommand> & object;
    private readonly schema: NonNullable<ReturnType<typeof getContextSchema<TCommand>>>;

    protected constructor(
        command: TCommand,
        initial: ContextDataFor<TCommand>,
        schema: NonNullable<ReturnType<typeof getContextSchema<TCommand>>>,
        executionId?: string,
    ) {
        this.command = command;
        this.executionId = executionId ?? Bun.randomUUIDv7();
        this.startTime = new Date();
        this.state = initial;
        this.schema = schema;
    }

    static create<TCommand extends CommandName>(command: TCommand, initial: unknown, executionId?: string) {
        if (!ScopedContextService.hasContextSchema(command)) {
            return err(
                createFireflyError({
                    message: `No context schema found for command "${command}".`,
                    code: "NOT_FOUND",
                    source: "orchestration/scoped-context-service",
                }),
            );
        }

        const schema = getContextSchema(command);
        if (!schema) {
            return err(
                createFireflyError({
                    message: `No context schema found for command "${command}".`,
                    code: "NOT_FOUND",
                    source: "orchestration/scoped-context-service",
                }),
            );
        }

        const validation = parseSchema(schema, initial);
        if (validation.isErr()) {
            return err(validation.error);
        }

        return ok(new ScopedContextService(command, validation.value as ContextDataFor<TCommand>, schema, executionId));
    }

    static hasContextSchema(command: string): command is CommandName {
        return command in ContextDataSchemas;
    }

    getConfig(): TCommand extends CommandName ? FinalConfigFor<TCommand> : never {
        const config = (this.state as Record<string, unknown>).config;
        return config as TCommand extends CommandName ? FinalConfigFor<TCommand> : never;
    }

    setConfig(config: TCommand extends CommandName ? FinalConfigFor<TCommand> : never): FireflyResult<void> {
        return this.set(
            "config" as keyof ContextDataFor<TCommand>,
            config as ContextDataFor<TCommand>[keyof ContextDataFor<TCommand>],
        );
    }

    get<K extends keyof ContextDataFor<TCommand>>(key: K): FireflyResult<ContextDataFor<TCommand>[K]> {
        if (!(key in this.state)) {
            return err(
                createFireflyError({
                    message: `Key "${String(key)}" does not exist in the context state.`,
                    code: "NOT_FOUND",
                    source: "orchestration/scoped-context-service",
                }),
            );
        }

        return ok(this.state[key]);
    }

    set<K extends keyof ContextDataFor<TCommand>>(key: K, value: ContextDataFor<TCommand>[K]): FireflyResult<void> {
        const newState = { ...this.state, [key]: value };
        const validation = parseSchema(this.schema, newState);
        if (validation.isErr()) {
            return err(validation.error);
        }

        this.state = validation.value as ContextDataFor<TCommand>;
        return ok();
    }

    update<K extends keyof ContextDataFor<TCommand>>(
        key: K,
        updater: (current: ContextDataFor<TCommand>[K] | undefined) => ContextDataFor<TCommand>[K],
    ): FireflyResult<void> {
        const updatedValue = updater(this.state[key]);
        return this.set(key, updatedValue);
    }

    has<K extends keyof ContextDataFor<TCommand>>(key: K): boolean {
        return key in this.state && this.state[key] !== undefined;
    }

    snapshot(): Readonly<ContextDataFor<TCommand>> {
        return Object.freeze({ ...this.state });
    }

    clear(): FireflyResult<void> {
        const baseState = {
            command: this.command,
            executionId: this.executionId,
            startTime: this.startTime,
        };

        const validation = parseSchema(this.schema, baseState);
        if (validation.isErr()) {
            return err(validation.error);
        }

        this.state = validation.value as ContextDataFor<TCommand>;
        return ok();
    }

    getBasePath(): string {
        const basePath = (this.state as Record<string, unknown>).basePath;

        if (typeof basePath !== "string") {
            return process.cwd();
        }
        return basePath;
    }

    getCurrentVersion(): string {
        const currentVersion = (this.state as Record<string, unknown>).currentVersion;
        if (typeof currentVersion === "string") {
            return currentVersion;
        }
        return "0.0.0";
    }

    getNextVersion(): string {
        const nextVersion = (this.state as Record<string, unknown>).nextVersion;
        if (typeof nextVersion === "string") {
            return nextVersion;
        }
        return "0.0.0";
    }

    setCurrentVersion(version: string): FireflyResult<void> {
        return this.set(
            "currentVersion" as keyof ContextDataFor<TCommand>,
            version as ContextDataFor<TCommand>[keyof ContextDataFor<TCommand>],
        );
    }

    setNextVersion(version: string): FireflyResult<void> {
        return this.set(
            "nextVersion" as keyof ContextDataFor<TCommand>,
            version as ContextDataFor<TCommand>[keyof ContextDataFor<TCommand>],
        );
    }
}
