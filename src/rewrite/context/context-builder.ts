import { type WorkflowContext } from "./workflow-context";

export class ContextBuilder<TConfig = Record<string, unknown>, TData = Record<string, unknown>> {
    private config: TConfig;
    private data: TData;

    private constructor(config: TConfig, data: TData) {
        this.config = config;
        this.data = data;
    }

    static create<TConfig = Record<string, unknown>>(): ContextBuilder<TConfig, Record<string, unknown>> {
        return new ContextBuilder({} as TConfig, {});
    }

    static forTesting(): ContextBuilder<Record<string, unknown>, Record<string, unknown>> {
        return new ContextBuilder({}, {});
    }

    withConfig<TNewConfig>(config: TNewConfig): ContextBuilder<TNewConfig, TData> {
        return new ContextBuilder(config, this.data);
    }

    withMockConfig(config: Partial<TConfig>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder({ ...this.config, ...config }, this.data);
    }

    withData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return new ContextBuilder(this.config, { ...this.data, [key]: value } as TData & Record<K, V>);
    }

    withMockData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return this.withData(key, value);
    }

    withMultipleData(data: Partial<TData>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.config, { ...this.data, ...data });
    }

    build(): WorkflowContext<TConfig, TData> {
        return {
            config: this.config,
            data: this.data,
            fork: <K extends string, V>(key: K, value: V) => {
                return {
                    config: this.config,
                    data: { ...this.data, [key]: value } as TData & Record<K, V>,
                    fork: () => {
                        throw new Error("Cannot fork from forked context");
                    },
                    forkMultiple: () => {
                        throw new Error("Cannot fork from forked context");
                    },
                } as WorkflowContext<TConfig, TData & Record<K, V>>;
            },
            forkMultiple: (updates: Partial<TData>) => {
                return {
                    config: this.config,
                    data: { ...this.data, ...updates },
                    fork: () => {
                        throw new Error("Cannot fork from forked context");
                    },
                    forkMultiple: () => {
                        throw new Error("Cannot fork from forked context");
                    },
                } as WorkflowContext<TConfig, TData>;
            },
        };
    }
}
