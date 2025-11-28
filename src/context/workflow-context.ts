import { err, ok } from "neverthrow";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

export interface WorkflowContext<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly data: Readonly<TData>;

    get<K extends keyof TData>(key: K): FireflyResult<TData[K]>;
    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData>;
    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData>;
    has<K extends keyof TData>(key: K): boolean;
    snapshot(): Readonly<TData>;
}

export class ImmutableWorkflowContext<
    TConfig = unknown,
    TData extends Record<string, unknown> = Record<string, unknown>,
> implements WorkflowContext<TConfig, TData>
{
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly data: Readonly<TData>;

    private constructor(startTime: Date, config: TConfig, data: TData) {
        this.startTime = startTime;
        this.config = Object.freeze({ ...config });
        this.data = Object.freeze({ ...data });
    }

    /**
     * Create a new workflow context.
     */
    static create<TC, TD extends Record<string, unknown> = Record<string, unknown>>(
        config: TC,
        initialData?: Partial<TD>
    ): WorkflowContext<TC, TD> {
        const startTime = new Date();
        const data = (initialData ?? {}) as TD;

        return new ImmutableWorkflowContext<TC, TD>(startTime, config, data);
    }

    get<K extends keyof TData>(key: K): FireflyResult<TData[K]> {
        if (!(key in this.data)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Key "${String(key)}" not found in context`,
                    source: "context/workflow-context",
                })
            );
        }

        return ok(this.data[key]);
    }

    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData> {
        const updatedData = { ...this.data, [key]: value };
        return new ImmutableWorkflowContext<TConfig, TData>(this.startTime, this.config as TConfig, updatedData);
    }

    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData> {
        const updatedData = { ...this.data, ...updates };
        return new ImmutableWorkflowContext<TConfig, TData>(this.startTime, this.config as TConfig, updatedData);
    }

    has<K extends keyof TData>(key: K): boolean {
        return key in this.data;
    }

    snapshot(): Readonly<TData> {
        return this.data;
    }
}
