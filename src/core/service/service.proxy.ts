import { ResultAsync } from "neverthrow";
import {
    ALL_SERVICE_KEYS,
    type ResolvedServices,
    SERVICE_DEFINITIONS,
    type ServiceKey,
    type ServiceKeys,
    type ServiceKeysFromArray,
    type ServiceRegistry,
} from "#/core/service/service.registry";
import type { ServiceFactoryContext } from "#/core/service/service.types";

/**
 * Tracks services currently being resolved to detect circular dependencies.
 */
type ResolutionContext = {
    readonly basePath: string;
    readonly resolving: Set<ServiceKey>;
    readonly resolved: Map<ServiceKey, object>;
};

/**
 * Creates a new resolution context for tracking service instantiation.
 * @internal
 */
function createResolutionContext(basePath: string): ResolutionContext {
    return {
        basePath,
        resolving: new Set(),
        resolved: new Map(),
    };
}

/**
 * Resolves a service within a resolution context, with circular dependency detection.
 * @internal
 */
async function resolveServiceWithContext<K extends ServiceKey>(
    key: K,
    context: ResolutionContext
): Promise<ServiceRegistry[K]> {
    // Check if already resolved in this context
    const cached = context.resolved.get(key);
    if (cached) {
        return cached as ServiceRegistry[K];
    }

    // Check for circular dependency
    if (context.resolving.has(key)) {
        const chain = [...context.resolving, key].join(" -> ");
        return Promise.reject(new Error(`Circular service dependency detected:  ${chain}`));
    }

    // Mark as resolving
    context.resolving.add(key);

    const definition = SERVICE_DEFINITIONS[key];

    // Create the factory context with a bound getService
    const factoryContext: ServiceFactoryContext<ServiceRegistry> = {
        basePath: context.basePath,
        getService: <DK extends ServiceKey>(depKey: DK) => resolveServiceWithContext(depKey, context),
    };

    const instance = (await definition.factory(factoryContext)) as ServiceRegistry[K];

    // Mark as resolved and remove from resolving
    context.resolving.delete(key);
    context.resolved.set(key, instance as object);

    return instance;
}

/**
 * Creates a lazy proxy that defers async service instantiation until first access.
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
 * Resolves a specific set of services for use in a workflow context.
 *
 * @template TKeys - Tuple type of service keys to resolve
 * @param requiredServices - Array of service keys to resolve
 * @param basePath - Base path passed to service factories (usually the project root)
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
    basePath: string
): ResolvedServices<ServiceKeysFromArray<TKeys>> {
    const resolved: Record<string, unknown> = {};
    const context = createResolutionContext(basePath);

    for (const key of requiredServices) {
        resolved[key] = createLazyServiceProxy(() => resolveServiceWithContext(key, context));
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
    const resolved: Record<string, unknown> = {};
    const context = createResolutionContext(basePath);

    // Resolve services sequentially to properly track dependencies
    for (const key of requiredServices) {
        const service = await resolveServiceWithContext(key, context);
        resolved[key] = createSyncProxy(service as object);
    }

    return resolved as ResolvedServices<ServiceKeysFromArray<TKeys>>;
}

/**
 * Resolves all available services.
 *
 * @param basePath - Base path passed to service factories
 * @returns Object containing all resolved services
 */
export function resolveAllServices(basePath: string): ResolvedServices<ServiceKey> {
    return resolveServices(ALL_SERVICE_KEYS, basePath);
}

/**
 * Resolves a single service by key.
 *
 * @template K - The service key type
 * @param key - The service key to resolve
 * @param basePath - Base path passed to the service factory
 * @returns The resolved service instance
 */
export function resolveService<K extends ServiceKey>(key: K, basePath: string): ServiceRegistry[K] {
    const context = createResolutionContext(basePath);
    return createLazyServiceProxy(() => resolveServiceWithContext(key, context)) as ServiceRegistry[K];
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
    const context = createResolutionContext(basePath);
    const service = await resolveServiceWithContext(key, context);
    return createSyncProxy(service as object) as ServiceRegistry[K];
}
