import { ImmutableWorkflowContext, type WorkflowContext } from "./workflow-context";

export class ContextBuilder<
    TConfig = Record<string, unknown>,
    TData extends Record<string, unknown> = Record<string, unknown>,
> {
    private readonly config: TConfig;
    private readonly data: Partial<TData>;

    private constructor(config: TConfig, data: Partial<TData>) {
        this.config = config;
        this.data = data;
    }

    static create<TC = Record<string, unknown>>(): ContextBuilder<TC, Record<string, unknown>> {
        return new ContextBuilder({} as TC, {});
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
        return new ContextBuilder(this.config, { ...this.data, [key]: value } as Partial<TData & Record<K, V>>);
    }

    withMockData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return this.withData(key, value);
    }

    withMultipleData(data: Partial<TData>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.config, { ...this.data, ...data });
    }

    build(): WorkflowContext<TConfig, TData> {
        return ImmutableWorkflowContext.create<TConfig, TData>(this.config, this.data);
    }
}
