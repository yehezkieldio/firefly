import { err, ok } from "neverthrow";
import type { WorkflowServices } from "#/shared/interfaces";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

export interface WorkflowContext<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly data: Readonly<TData>;
    readonly services: WorkflowServices;

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
    readonly services: WorkflowServices;

    private constructor(startTime: Date, config: TConfig, data: TData, services: WorkflowServices) {
        this.startTime = startTime;
        this.config = Object.freeze({ ...config });
        this.data = Object.freeze({ ...data });
        this.services = services;
    }

    static create<TC, TD extends Record<string, unknown> = Record<string, unknown>>(
        config: TC,
        services: WorkflowServices,
        initialData?: Partial<TD>
    ): WorkflowContext<TC, TD> {
        const startTime = new Date();
        const data = (initialData ?? {}) as TD;

        return new ImmutableWorkflowContext<TC, TD>(startTime, config, data, services);
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
        return new ImmutableWorkflowContext<TConfig, TData>(
            this.startTime,
            this.config as TConfig,
            updatedData,
            this.services
        );
    }

    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData> {
        const updatedData = { ...this.data, ...updates };
        return new ImmutableWorkflowContext<TConfig, TData>(
            this.startTime,
            this.config as TConfig,
            updatedData,
            this.services
        );
    }

    has<K extends keyof TData>(key: K): boolean {
        return key in this.data;
    }

    snapshot(): Readonly<TData> {
        return this.data;
    }
}
