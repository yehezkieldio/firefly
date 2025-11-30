import { ResultAsync } from "neverthrow";
import type { ServiceDefinition } from "#/core/service/service.types";
import {
    ALL_SERVICE_KEYS,
    type ResolvedServices,
    SERVICE_DEFINITIONS,
    type ServiceKey,
    type ServiceKeys,
    type ServiceKeysFromArray,
    type ServiceRegistry,
} from "#/core/service/service-registry";

/**
 * Creates a lazy proxy that defers async service instantiation until first access.
 *
 * This optimization prevents unnecessary service creation when a service
 * is declared as required but never actually used in a particular code path.
 * Methods return ResultAsync values that chain the service instantiation.
 *
 * @template T - The service interface type
 * @param factory - Async function that creates the actual service instance
 * @returns A proxy that behaves like the service but instantiates lazily
 * @internal
 */
function createLazyServiceProxy<T extends object>(factory: () => Promise<T>): T {
    let instancePromise: Promise<T> | undefined;
    let instance: T | undefined;

    const ensureInstance = async (): Promise<T> => {
        if (instance) return instance;
        instancePromise ??= factory();
        instance = await instancePromise;
        return instance;
    };

    const handler: ProxyHandler<object> = {
        get(_target, prop, receiver) {
            // Return a function that returns a ResultAsync chaining the service instantiation
            return (...args: unknown[]) =>
                ResultAsync.fromSafePromise(ensureInstance()).andThen((resolved: T) => {
                    const value = Reflect.get(resolved, prop, receiver);
                    return typeof value === "function" ? value.apply(resolved, args) : value;
                });
        },
        has(_target, prop) {
            // For has checks, we need to initialize synchronously if possible
            if (instance) return Reflect.has(instance, prop);
            // Return true optimistically for known service methods
            return true;
        },
        ownKeys(_target) {
            if (instance) return Reflect.ownKeys(instance);
            return [];
        },
        getOwnPropertyDescriptor(_target, prop) {
            return instance ? Reflect.getOwnPropertyDescriptor(instance, prop) : void 0;
        },
    };

    return new Proxy({}, handler) as T;
}

/**
 * Creates a synchronous lazy proxy for already-resolved service instances.
 * Used when lazy loading is disabled.
 *
 * @template T - The service interface type
 * @param instance - The resolved service instance
 * @returns The instance wrapped for consistent API
 * @internal
 */
function createSyncProxy<T extends object>(instance: T): T {
    return instance;
}

/**
 * Options for service resolution.
 */
export interface ResolveServicesOptions {
    /**
     * When true (default), services are wrapped in lazy proxies
     * and only instantiated on first property access.
     */
    readonly lazy?: boolean;
}

/**
 * Resolves a specific set of services for use in a workflow context.
 *
 * @template TKeys - Tuple type of service keys to resolve
 * @param requiredServices - Array of service keys to resolve
 * @param basePath - Base path passed to service factories (usually the project root)
 * @param options - Resolution options (lazy loading, etc.)
 * @returns Object containing the resolved services
 *
 * @example
 * ```typescript
 * const services = resolveServices(["fs", "git"] as const, "/path/to/project");
 * await services.fs.read("package.json");
 * ```
 */
export function resolveServices<const TKeys extends ServiceKeys>(
    requiredServices: TKeys,
    basePath: string,
    options: ResolveServicesOptions = {}
): ResolvedServices<ServiceKeysFromArray<TKeys>> {
    const { lazy = true } = options;
    const resolved = {} as Record<ServiceKey, unknown>;

    for (const key of requiredServices) {
        const definition = SERVICE_DEFINITIONS[key] as ServiceDefinition<object>;

        if (lazy) {
            resolved[key] = createLazyServiceProxy(() => definition.factory(basePath));
        } else {
            // For non-lazy mode, we still return a lazy proxy but it will be
            // initialized on first access. True eager loading would require
            // this function to be async.
            resolved[key] = createLazyServiceProxy(() => definition.factory(basePath));
        }
    }

    return resolved as ResolvedServices<ServiceKeysFromArray<TKeys>>;
}

/**
 * Resolves a specific set of services eagerly (async).
 * Use this when you need all services initialized before proceeding.
 *
 * @template TKeys - Tuple type of service keys to resolve
 * @param requiredServices - Array of service keys to resolve
 * @param basePath - Base path passed to service factories
 * @returns Promise resolving to object containing the resolved services
 */
export async function resolveServicesAsync<const TKeys extends ServiceKeys>(
    requiredServices: TKeys,
    basePath: string
): Promise<ResolvedServices<ServiceKeysFromArray<TKeys>>> {
    const resolved = {} as Record<ServiceKey, unknown>;

    await Promise.all(
        requiredServices.map(async (key) => {
            const definition = SERVICE_DEFINITIONS[key as ServiceKey];
            const service = await definition.factory(basePath);
            resolved[key] = createSyncProxy(service as object);
        })
    );

    return resolved as ResolvedServices<ServiceKeysFromArray<TKeys>>;
}

/**
 * Resolves all available services.
 *
 * @param basePath - Base path passed to service factories
 * @param options - Resolution options
 * @returns Object containing all resolved services
 */
export function resolveAllServices(
    basePath: string,
    options: ResolveServicesOptions = {}
): ResolvedServices<ServiceKey> {
    return resolveServices(ALL_SERVICE_KEYS, basePath, options);
}

/**
 * Resolves a single service by key.
 *
 * @template K - The service key type
 * @param key - The service key to resolve
 * @param basePath - Base path passed to the service factory
 * @param options - Resolution options
 * @returns The resolved service instance
 */
export function resolveService<K extends ServiceKey>(
    key: K,
    basePath: string,
    _options: ResolveServicesOptions = {}
): ServiceRegistry[K] {
    const definition = SERVICE_DEFINITIONS[key] as ServiceDefinition<ServiceRegistry[K]>;
    return createLazyServiceProxy(() => definition.factory(basePath)) as ServiceRegistry[K];
}

/**
 * Resolves a single service by key eagerly (async).
 *
 * @template K - The service key type
 * @param key - The service key to resolve
 * @param basePath - Base path passed to the service factory
 * @returns Promise resolving to the service instance
 */
export async function resolveServiceAsync<K extends ServiceKey>(key: K, basePath: string): Promise<ServiceRegistry[K]> {
    const definition = SERVICE_DEFINITIONS[key] as ServiceDefinition<ServiceRegistry[K]>;
    const service = await definition.factory(basePath);
    return createSyncProxy(service as object) as ServiceRegistry[K];
}
