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
 * Asynchronous factory function for lazy-loaded service modules.
 * @template T - The service interface type.
 */
type ServiceFactoryAsync<T> = (basePath: string) => Promise<T>;

export interface ServiceDefinition<T> {
    /**
     * Asynchronous factory function to create the service instance.
     */
    readonly factory: ServiceFactoryAsync<T>;

    /**
     * Human-readable description of the service.
     */
    readonly description?: string;
}
