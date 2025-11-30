declare const ServiceKeyBrand: unique symbol;

/**
 * A branded type representing a unique service key.
 */
export type BrandedServiceKey<K extends string = string> = K & { readonly [ServiceKeyBrand]: K };

/**
 * Factory function signature for creating service instances.
 * @template T - The service interface type.
 */
export type ServiceFactory<T> = (basePath: string) => T;

/**
 * Function signature for resolving dependent services within a factory.
 * For service-to-service dependencies.
 *
 * @template TRegistry - The service registry type mapping keys to service types
 * @template K - The service key to resolve
 */
export type ServiceResolver<TRegistry> = <K extends keyof TRegistry>(key: K) => Promise<TRegistry[K]>;

/**
 * Context passed to service factories during instantiation.
 * Provides access to dependencies and configuration.
 */
export interface ServiceFactoryContext<TRegistry> {
    /**
     * Base path for the service (usually the project root).
     */
    readonly basePath: string;

    /**
     * Resolves another service by key. Use this to declare dependencies.
     * Circular dependencies will throw an error.
     */
    readonly getService: ServiceResolver<TRegistry>;
}

/**
 * Asynchronous factory function for lazy-loaded service modules.
 * @template T - The service interface type.
 * @template TRegistry - The service registry type for dependency resolution
 */
export type ServiceFactoryAsync<T, TRegistry = Record<string, unknown>> = (
    context: ServiceFactoryContext<TRegistry>
) => Promise<T>;

export interface ServiceDefinition<T, TRegistry = Record<string, unknown>> {
    /**
     * Asynchronous factory function to create the service instance.
     */
    readonly factory: ServiceFactoryAsync<T, TRegistry>;

    /**
     * Human-readable description of the service.
     */
    readonly description?: string;

    /**
     * Optional list of service keys this service depends on.
     * TODO: Implement dependency validation based on this field. As of now, it's informational only.
     */
    readonly dependencies?: readonly (keyof TRegistry)[];
}
