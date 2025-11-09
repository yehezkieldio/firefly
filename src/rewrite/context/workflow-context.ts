import { err, ok } from "neverthrow";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

/**
 * Immutable workflow execution context.
 * Data is stored in an immutable structure and forked for modifications.
 */
export interface WorkflowContext<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    readonly executionId: string;
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly data: Readonly<TData>;

    /**
     * Get a value from the context data.
     */
    get<K extends keyof TData>(key: K): FireflyResult<TData[K]>;

    /**
     * Create a new context with updated data (immutable fork).
     */
    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData>;

    /**
     * Create a new context with multiple updates (immutable fork).
     */
    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData>;

    /**
     * Check if a key exists in the context data.
     */
    has<K extends keyof TData>(key: K): boolean;

    /**
     * Create a snapshot of current data.
     */
    snapshot(): Readonly<TData>;
}

export class ImmutableWorkflowContext<
    TConfig = unknown,
    TData extends Record<string, unknown> = Record<string, unknown>,
> implements WorkflowContext<TConfig, TData>
{
    readonly executionId: string;
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly data: Readonly<TData>;

    private constructor(executionId: string, startTime: Date, config: TConfig, data: TData) {
        this.executionId = executionId;
        this.startTime = startTime;
        this.config = Object.freeze({ ...config });
        this.data = Object.freeze({ ...data });
    }

    /**
     * Create a new workflow context.
     */
    static create<TConfig, TData extends Record<string, unknown> = Record<string, unknown>>(
        config: TConfig,
        initialData?: Partial<TData>,
    ): WorkflowContext<TConfig, TData> {
        const executionId = Bun.randomUUIDv7();
        const startTime = new Date();
        const data = (initialData ?? {}) as TData;

        return new ImmutableWorkflowContext<TConfig, TData>(executionId, startTime, config, data);
    }

    get<K extends keyof TData>(key: K): FireflyResult<TData[K]> {
        if (!(key in this.data)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Key "${String(key)}" not found in context`,
                    source: "rewrite/context/workflow-context",
                }),
            );
        }

        return ok(this.data[key]);
    }

    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData> {
        const updatedData = { ...this.data, [key]: value };
        return new ImmutableWorkflowContext<TConfig, TData>(
            this.executionId,
            this.startTime,
            this.config as TConfig,
            updatedData,
        );
    }

    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData> {
        const updatedData = { ...this.data, ...updates };
        return new ImmutableWorkflowContext<TConfig, TData>(
            this.executionId,
            this.startTime,
            this.config as TConfig,
            updatedData,
        );
    }

    has<K extends keyof TData>(key: K): boolean {
        return key in this.data;
    }

    snapshot(): Readonly<TData> {
        return this.data;
    }
}
