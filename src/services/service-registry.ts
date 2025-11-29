/**
 * Service Registry Module
 *
 * Provides the service locator pattern for dependency injection across the workflow system.
 * Services are lazily instantiated on first access via Proxy for optimal performance.
 *
 * ## Adding a new service:
 * 1. Create the service interface in `interfaces.ts`
 * 2. Create the service implementation in its own file (e.g., `my-service.ts`)
 * 3. Add the factory to `SERVICE_DEFINITIONS` below
 *
 * @module services/service-registry
 */

import { ResultAsync } from "neverthrow";
import type { IFileSystemService, IGitService } from "#/services/interfaces";

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/** Branded type symbol for compile-time service key validation */
declare const ServiceKeyBrand: unique symbol;

/**
 * Branded service key type.
 * Provides compile-time safety to prevent arbitrary strings from being used as service keys.
 */
export type BrandedServiceKey<K extends string = string> = K & { readonly [ServiceKeyBrand]: K };

// ============================================================================
// Service Factory Types
// ============================================================================

/**
 * Factory function signature for creating service instances.
 * @template T - The service interface type
 */
export type ServiceFactory<T> = (basePath: string) => T;

/**
 * Async factory function for lazy-loaded service modules.
 * @template T - The service interface type
 */
type AsyncServiceFactory<T> = (basePath: string) => Promise<T>;

/**
 * Definition of a service including its factory and metadata.
 * @template T - The service interface type
 */
export interface ServiceDefinition<T> {
    /** Async factory function that creates the service instance */
    readonly factory: AsyncServiceFactory<T>;
    /** Human-readable description of the service's purpose */
    readonly description: string;
}

/**
 * Helper function to define a service with proper type inference.
 * Uses `satisfies` for better type narrowing.
 * @internal
 */
function defineService<T>(definition: ServiceDefinition<T>) {
    return definition satisfies ServiceDefinition<T>;
}

// ============================================================================
// Service Definitions
// ============================================================================

/**
 * Registry of all available services and their factories.
 *
 * Each service is lazily loaded via dynamic `import()` to avoid circular dependencies
 * and improve startup performance.
 */
export const SERVICE_DEFINITIONS = {
    /**
     * File system service for read/write operations.
     * Supports dry-run mode for safe testing.
     */
    fs: defineService<IFileSystemService>({
        factory: async (basePath) => {
            const { createFileSystemService } = await import("#/services/fs-service");
            return createFileSystemService(basePath);
        },
        description: "File system operations (read, write, exists)",
    }),

    /**
     * Git service for version control operations.
     * Supports dry-run mode for safe testing.
     */
    git: defineService<IGitService>({
        factory: async (basePath) => {
            const { createGitService } = await import("#/services/git-service");
            return createGitService(basePath);
        },
        description: "Git operations (commit, tag, push, status)",
    }),
} as const satisfies Record<string, ServiceDefinition<unknown>>;

// ============================================================================
// Service Type Utilities
// ============================================================================

/** Union of all available service keys (e.g., "fs" | "git") */
export type ServiceKey = keyof typeof SERVICE_DEFINITIONS;

/** Branded service key for runtime-validated service keys */
export type ValidatedServiceKey = BrandedServiceKey<ServiceKey>;

/** Array of all service keys for iteration */
export const ALL_SERVICE_KEYS = Object.keys(SERVICE_DEFINITIONS) as ServiceKey[];

/**
 * Complete registry mapping service keys to their resolved types.
 * Uses conditional type inference for type-safe service resolution.
 */
export type ServiceRegistry = {
    readonly [K in ServiceKey]: (typeof SERVICE_DEFINITIONS)[K] extends ServiceDefinition<infer T> ? T : never;
};

/** Readonly array type for service key declarations in commands */
export type ServiceKeys = readonly ServiceKey[];

/** Extracts the union type of keys from a readonly service key array */
export type ServiceKeysFromArray<T extends ServiceKeys> = T[number];

/** Creates a partial service registry with only the specified keys */
export type ResolvedServices<K extends ServiceKey> = Readonly<Pick<ServiceRegistry, K>>;

/** Compile-time validation that a string is a valid service key */
export type ValidateServiceKey<K extends string> = K extends ServiceKey ? BrandedServiceKey<K> : never;

/**
 * Default services type when all services are resolved.
 * Use this as the default generic parameter for contexts.
 */
export type DefaultServices = ResolvedServices<ServiceKey>;

/**
 * Validates and brands a service key at runtime.
 * @param key - The string to validate as a service key
 * @returns The branded service key, or undefined if invalid
 */
export function validateServiceKey(key: string): ValidatedServiceKey | undefined {
    return key in SERVICE_DEFINITIONS ? (key as ValidatedServiceKey) : undefined;
}

// ============================================================================
// Lazy Proxy Factory
// ============================================================================

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

// ============================================================================
// Service Resolution Functions
// ============================================================================

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
 * Services are loaded via dynamic import to avoid circular dependencies.
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
