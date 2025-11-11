import { err, ok } from "neverthrow";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";
import type { WorkflowContext } from "./workflow-context";

export class ContextBuilder<
    TConfig = Record<string, unknown>,
    TData extends Record<string, unknown> = Record<string, unknown>,
> {
    private readonly configValue: TConfig;
    private readonly dataValue: TData;

    private constructor(config: TConfig, data: TData) {
        this.configValue = config;
        this.dataValue = data;
    }

    static create<C = Record<string, unknown>>(): ContextBuilder<C, Record<string, unknown>> {
        return new ContextBuilder({} as C, {});
    }

    static forTesting(): ContextBuilder<Record<string, unknown>, Record<string, unknown>> {
        return new ContextBuilder({}, {});
    }

    withConfig<TNewConfig>(config: TNewConfig): ContextBuilder<TNewConfig, TData> {
        return new ContextBuilder(config, this.dataValue);
    }

    withMockConfig(config: Partial<TConfig>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder({ ...this.configValue, ...config }, this.dataValue);
    }

    withData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return new ContextBuilder(this.configValue, { ...this.dataValue, [key]: value } as TData & Record<K, V>);
    }

    withMockData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return this.withData(key, value);
    }

    withMultipleData(data: Partial<TData>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.configValue, { ...this.dataValue, ...data });
    }

    build(): WorkflowContext<TConfig, TData> {
        const startTime = new Date();
        const frozenConfig = Object.freeze({ ...this.configValue });
        const frozenData = Object.freeze({ ...this.dataValue });

        return {
            startTime,
            config: frozenConfig,
            data: frozenData,
            get: <K extends keyof TData>(key: K): FireflyResult<TData[K]> => {
                if (!(key in frozenData)) {
                    return err(
                        createFireflyError({
                            code: "VALIDATION",
                            message: `Key "${String(key)}" not found in context`,
                            source: "context/context-builder",
                        })
                    );
                }
                return ok(frozenData[key]);
            },
            fork: <K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData> => {
                const updatedData = { ...frozenData, [key]: value };
                return {
                    startTime,
                    config: frozenConfig,
                    data: Object.freeze(updatedData),
                    get: <Key extends keyof TData>(k: Key): FireflyResult<TData[Key]> => {
                        if (!(k in updatedData)) {
                            return err(
                                createFireflyError({
                                    code: "VALIDATION",
                                    message: `Key "${String(k)}" not found in context`,
                                    source: "context/context-builder",
                                })
                            );
                        }
                        return ok(updatedData[k]);
                    },
                    fork: <K2 extends keyof TData>(key2: K2, value2: TData[K2]): WorkflowContext<TConfig, TData> => {
                        const nestedUpdatedData = { ...updatedData, [key2]: value2 };
                        return createNestedContext(startTime, frozenConfig, nestedUpdatedData);
                    },
                    forkMultiple: (updates: Partial<TData>): WorkflowContext<TConfig, TData> => {
                        const nestedUpdatedData = { ...updatedData, ...updates };
                        return createNestedContext(startTime, frozenConfig, nestedUpdatedData);
                    },
                    has: <Key extends keyof TData>(k: Key): boolean => k in updatedData,
                    snapshot: (): Readonly<TData> => Object.freeze({ ...updatedData }) as Readonly<TData>,
                };
            },
            forkMultiple: (updates: Partial<TData>): WorkflowContext<TConfig, TData> => {
                const updatedData = { ...frozenData, ...updates };
                return {
                    startTime,
                    config: frozenConfig,
                    data: Object.freeze(updatedData),
                    get: <Key extends keyof TData>(k: Key): FireflyResult<TData[Key]> => {
                        if (!(k in updatedData)) {
                            return err(
                                createFireflyError({
                                    code: "VALIDATION",
                                    message: `Key "${String(k)}" not found in context`,
                                    source: "context/context-builder",
                                })
                            );
                        }
                        return ok(updatedData[k]);
                    },
                    fork: <K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData> => {
                        const nestedUpdatedData = { ...updatedData, [key]: value };
                        return createNestedContext(startTime, frozenConfig, nestedUpdatedData);
                    },
                    forkMultiple: (nestedUpdates: Partial<TData>): WorkflowContext<TConfig, TData> => {
                        const nestedUpdatedData = { ...updatedData, ...nestedUpdates };
                        return createNestedContext(startTime, frozenConfig, nestedUpdatedData);
                    },
                    has: <Key extends keyof TData>(k: Key): boolean => k in updatedData,
                    snapshot: (): Readonly<TData> => Object.freeze({ ...updatedData }) as Readonly<TData>,
                };
            },
            has: <K extends keyof TData>(key: K): boolean => key in frozenData,
            snapshot: (): Readonly<TData> => frozenData,
        };
    }
}

function createNestedContext<TConfig, TData extends Record<string, unknown>>(
    startTime: Date,
    config: Readonly<TConfig>,
    data: TData
): WorkflowContext<TConfig, TData> {
    const frozenData = Object.freeze({ ...data });
    return {
        startTime,
        config,
        data: frozenData,
        get: <K extends keyof TData>(key: K): FireflyResult<TData[K]> => {
            if (!(key in frozenData)) {
                return err(
                    createFireflyError({
                        code: "VALIDATION",
                        message: `Key "${String(key)}" not found in context`,
                        source: "context/context-builder",
                    })
                );
            }
            return ok(frozenData[key]);
        },
        fork: <K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData> => {
            const updatedData = { ...frozenData, [key]: value };
            return createNestedContext(startTime, config, updatedData);
        },
        forkMultiple: (updates: Partial<TData>): WorkflowContext<TConfig, TData> => {
            const updatedData = { ...frozenData, ...updates };
            return createNestedContext(startTime, config, updatedData);
        },
        has: <K extends keyof TData>(key: K): boolean => key in frozenData,
        snapshot: (): Readonly<TData> => frozenData,
    };
}
