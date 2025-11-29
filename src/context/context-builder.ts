import { createFileSystemService } from "#/shared/fs";
import { createGitService } from "#/shared/git";
import type { WorkflowServices } from "#/shared/interfaces";
import { ImmutableWorkflowContext, type WorkflowContext } from "./workflow-context";

export class ContextBuilder<
    TConfig = Record<string, unknown>,
    TData extends Record<string, unknown> = Record<string, unknown>,
> {
    private readonly config: TConfig;
    private readonly data: Partial<TData>;
    private readonly servicesOverride?: WorkflowServices;
    private readonly basePath: string;

    private constructor(config: TConfig, data: Partial<TData>, basePath: string, services?: WorkflowServices) {
        this.config = config;
        this.data = data;
        this.basePath = basePath;
        this.servicesOverride = services;
    }

    static create<TC = Record<string, unknown>>(
        basePath: string = process.cwd()
    ): ContextBuilder<TC, Record<string, unknown>> {
        return new ContextBuilder({} as TC, {}, basePath);
    }

    static forTesting(): ContextBuilder<Record<string, unknown>, Record<string, unknown>> {
        return new ContextBuilder({}, {}, process.cwd());
    }

    withConfig<TNewConfig>(config: TNewConfig): ContextBuilder<TNewConfig, TData> {
        return new ContextBuilder(config, this.data, this.basePath, this.servicesOverride);
    }

    withMockConfig(config: Partial<TConfig>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder({ ...this.config, ...config }, this.data, this.basePath, this.servicesOverride);
    }

    withData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return new ContextBuilder(
            this.config,
            { ...this.data, [key]: value } as Partial<TData & Record<K, V>>,
            this.basePath,
            this.servicesOverride
        );
    }

    withMockData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>> {
        return this.withData(key, value);
    }

    withMultipleData(data: Partial<TData>): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.config, { ...this.data, ...data }, this.basePath, this.servicesOverride);
    }

    withBasePath(basePath: string): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.config, this.data, basePath, this.servicesOverride);
    }

    withServices(services: WorkflowServices): ContextBuilder<TConfig, TData> {
        return new ContextBuilder(this.config, this.data, this.basePath, services);
    }

    build(): WorkflowContext<TConfig, TData> {
        const services = this.servicesOverride ?? {
            fs: createFileSystemService(this.basePath),
            git: createGitService(this.basePath),
        };

        return ImmutableWorkflowContext.create<TConfig, TData>(this.config, services, this.data);
    }
}
