import type { CommandName, FinalConfigFor } from "#/modules/configuration/application/schema-registry.service";
import {
    type ContextDataFor,
    getContextSchema,
    hasContextSchema,
} from "#/modules/orchestration/core/contracts/context-data.schema";
import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyResult, fireflyErr, fireflyOk } from "#/shared/utils/result.util";
import { validateWithResult } from "#/shared/utils/result-factory.util";

/**
 * Type-safe, command-specific context implementation.
 * Provides narrowed context data and configuration access based on the command type.
 */
export class ScopedContext<TCommand extends CommandName>
    implements OrchestrationContext<ContextDataFor<TCommand>, TCommand>
{
    readonly executionId: string;
    readonly startTime: Date;
    readonly command: TCommand;

    private state: ContextDataFor<TCommand>;
    private readonly schema: ReturnType<typeof getContextSchema<TCommand>>;

    protected constructor(
        command: TCommand,
        initial: ContextDataFor<TCommand>,
        schema: ReturnType<typeof getContextSchema<TCommand>>,
        executionId?: string,
    ) {
        this.command = command;
        this.executionId = executionId ?? crypto.randomUUID();
        this.startTime = new Date();
        this.state = initial;
        this.schema = schema;
    }

    /**
     * Create a new narrowed context instance for a specific command.
     */
    static create<TCommand extends CommandName>(
        command: TCommand,
        initial: unknown,
        executionId?: string,
    ): FireflyResult<ScopedContext<TCommand>> {
        if (!hasContextSchema(command)) {
            return fireflyErr(
                createFireflyError({
                    code: "VALIDATION",
                    message: `No schema found for command: ${command}`,
                    source: "application",
                }),
            );
        }

        const schema = getContextSchema(command);
        const parsed = validateWithResult(schema, initial, `${command}-context`);
        if (parsed.isErr()) {
            return fireflyErr(parsed.error);
        }

        return fireflyOk(new ScopedContext(command, parsed.value as ContextDataFor<TCommand>, schema, executionId));
    }

    get<K extends keyof ContextDataFor<TCommand>>(key: K): FireflyResult<ContextDataFor<TCommand>[K]> {
        if (!(key in this.state)) {
            return fireflyErr(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Key '${String(key)}' not found in context`,
                    source: "application",
                }),
            );
        }
        return fireflyOk(this.state[key]);
    }

    set<K extends keyof ContextDataFor<TCommand>>(key: K, value: ContextDataFor<TCommand>[K]): FireflyResult<void> {
        const newState = { ...this.state, [key]: value };
        const parsed = validateWithResult(this.schema, newState, `${this.command}-context`);
        if (parsed.isErr()) {
            return fireflyErr(parsed.error);
        }
        this.state = parsed.value as ContextDataFor<TCommand>;
        return fireflyOk();
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
        const emptyState = {
            command: this.command,
            executionId: this.executionId,
            startTime: this.startTime,
        } as ContextDataFor<TCommand>;

        const parsed = validateWithResult(this.schema, emptyState, `${this.command}-context`);
        if (parsed.isErr()) {
            return fireflyErr(parsed.error);
        }
        this.state = parsed.value as ContextDataFor<TCommand>;
        return fireflyOk();
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
}
