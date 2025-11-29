/**
 * Context Builder Module
 *
 * Provides a fluent builder API for constructing workflow contexts.
 * Useful for both production workflows and testing scenarios.
 *
 * @module context/context-builder
 */

import { type ResolvedServices, resolveAllServices, type ServiceKey } from "#/services/service-registry";
import { ImmutableWorkflowContext, type WorkflowContext } from "./workflow-context";

/** Default services type when using all available services */
type DefaultServices = ResolvedServices<ServiceKey>;

/** Base constraint for workflow data */
type WorkflowData = Record<string, unknown>;

/**
 * Fluent builder for constructing workflow contexts.
 *
 * Provides a chainable API for configuring contexts with:
 * - Custom configuration objects
 * - Initial data values
 * - Service overrides (useful for testing)
 * - Base path for service instantiation
 *
 * @template TConfig - Type of the workflow configuration
 * @template TData - Type of the workflow data
 * @template TServices - Type of the resolved services
 *
 * @example
 * ```typescript
 * // Production usage:
 * const context = ContextBuilder.create<ReleaseConfig>("/path/to/project")
 *   .withConfig({ version: "1.0.0", dryRun: false })
 *   .withData("startedBy", "user@example.com")
 *   .build();
 *
 * // Testing with mock services:
 * const testContext = ContextBuilder.forTesting()
 *   .withConfig({ version: "test" })
 *   .withServices(mockServices)
 *   .build();
 * ```
 */
export class ContextBuilder<
    TConfig = WorkflowData,
    TData extends WorkflowData = WorkflowData,
    TServices = DefaultServices,
> {
    readonly #config: TConfig;
    readonly #data: Partial<TData>;
    readonly #servicesOverride?: TServices;
    readonly #basePath: string;

    private constructor(config: TConfig, data: Partial<TData>, basePath: string, services?: TServices) {
        this.#config = config;
        this.#data = data;
        this.#basePath = basePath;
        this.#servicesOverride = services;
    }

    /**
     * Creates a new builder for production use.
     * @template TC - Configuration type
     * @param basePath - Base path for service instantiation (defaults to cwd)
     */
    static create<TC = WorkflowData>(
        basePath: string = process.cwd()
    ): ContextBuilder<TC, WorkflowData, DefaultServices> {
        return new ContextBuilder({} as TC, {}, basePath);
    }

    /**
     * Creates a builder configured for testing scenarios.
     * Uses current working directory as base path.
     */
    static forTesting(): ContextBuilder<WorkflowData, WorkflowData, DefaultServices> {
        return new ContextBuilder({}, {}, process.cwd());
    }

    /**
     * Sets the workflow configuration.
     * @template TNewConfig - New configuration type
     * @param config - The configuration object
     */
    withConfig<TNewConfig>(config: TNewConfig): ContextBuilder<TNewConfig, TData, TServices> {
        return new ContextBuilder(config, this.#data, this.#basePath, this.#servicesOverride);
    }

    /**
     * Merges partial configuration with existing config.
     * Useful for overriding specific config values in tests.
     * @param config - Partial configuration to merge
     */
    withMockConfig(config: Partial<TConfig>): ContextBuilder<TConfig, TData, TServices> {
        return new ContextBuilder({ ...this.#config, ...config }, this.#data, this.#basePath, this.#servicesOverride);
    }

    /**
     * Adds a single data value to the context.
     * @template K - Key type (string)
     * @template V - Value type
     * @param key - Data key
     * @param value - Data value
     */
    withData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>, TServices> {
        return new ContextBuilder(
            this.#config,
            { ...this.#data, [key]: value } as Partial<TData & Record<K, V>>,
            this.#basePath,
            this.#servicesOverride as TServices
        );
    }

    /**
     * Alias for withData, semantically clearer for test scenarios.
     * @template K - Key type (string)
     * @template V - Value type
     * @param key - Data key
     * @param value - Mock data value
     */
    withMockData<K extends string, V>(key: K, value: V): ContextBuilder<TConfig, TData & Record<K, V>, TServices> {
        return this.withData(key, value);
    }

    /**
     * Adds multiple data values at once.
     * @param data - Object containing key-value pairs to add
     */
    withMultipleData(data: Partial<TData>): ContextBuilder<TConfig, TData, TServices> {
        return new ContextBuilder(this.#config, { ...this.#data, ...data }, this.#basePath, this.#servicesOverride);
    }

    /**
     * Sets the base path for service instantiation.
     * @param basePath - Absolute path to the project root
     */
    withBasePath(basePath: string): ContextBuilder<TConfig, TData, TServices> {
        return new ContextBuilder(this.#config, this.#data, basePath, this.#servicesOverride);
    }

    /**
     * Overrides the services with custom implementations.
     * Useful for injecting mock services in tests.
     * @template TNewServices - New services type
     * @param services - Custom service implementations
     */
    withServices<TNewServices>(services: TNewServices): ContextBuilder<TConfig, TData, TNewServices> {
        return new ContextBuilder(this.#config, this.#data, this.#basePath, services);
    }

    /**
     * Builds the final workflow context.
     * If no services were overridden, resolves all services from the base path.
     * @returns Configured WorkflowContext instance
     */
    build(): WorkflowContext<TConfig, TData, TServices> {
        const services = this.#servicesOverride ?? (resolveAllServices(this.#basePath) as TServices);

        return ImmutableWorkflowContext.create<TConfig, TData, TServices>(this.#config, services, this.#data);
    }
}
