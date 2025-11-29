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

import type { IFileSystemService, IGitService } from "#/services/interfaces";

// ============================================================================
// Service Factory Types
// ============================================================================

/**
 * Factory function signature for creating service instances.
 * @template T - The service interface type
 */
export type ServiceFactory<T> = (basePath: string) => T;

/**
 * Definition of a service including its factory and metadata.
 * @template T - The service interface type
 */
export interface ServiceDefinition<T> {
    /** Factory function that creates the service instance */
    readonly factory: ServiceFactory<T>;
    /** Human-readable description of the service's purpose */
    readonly description: string;
}

/**
 * Helper function to define a service with proper type inference.
 * @internal
 */
function defineService<T>(definition: ServiceDefinition<T>): ServiceDefinition<T> {
    return definition;
}

// ============================================================================
// Service Definitions
// ============================================================================

/**
 * Registry of all available services and their factories.
 *
 * Each service is lazily loaded via `require()` to avoid circular dependencies
 * and improve startup performance.
 */
export const SERVICE_DEFINITIONS = {
    /**
     * File system service for read/write operations.
     * Supports dry-run mode for safe testing.
     */
    fs: defineService<IFileSystemService>({
        factory: (basePath) => {
            const { createFileSystemService } = require("#/services/fs-service") as {
                createFileSystemService: ServiceFactory<IFileSystemService>;
            };
            return createFileSystemService(basePath);
        },
        description: "File system operations (read, write, exists)",
    }),

    /**
     * Git service for version control operations.
     * Supports dry-run mode for safe testing.
     */
    git: defineService<IGitService>({
        factory: (basePath) => {
            const { createGitService } = require("#/services/git-service") as {
                createGitService: ServiceFactory<IGitService>;
            };
            return createGitService(basePath);
        },
        description: "Git operations (commit, tag, push, status)",
    }),
} as const;

// ============================================================================
// Service Type Utilities
// ============================================================================

/** Union of all available service keys (e.g., "fs" | "git") */
export type ServiceKey = keyof typeof SERVICE_DEFINITIONS;

/** Array of all service keys for iteration */
export const ALL_SERVICE_KEYS = Object.keys(SERVICE_DEFINITIONS) as ServiceKey[];

/**
 * Complete registry mapping service keys to their resolved types.
 * @internal
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
export type ValidateServiceKey<K extends string> = K extends ServiceKey ? K : never;

/**
 * Default services type when all services are resolved.
 * Use this as the default generic parameter for contexts.
 */
export type DefaultServices = ResolvedServices<ServiceKey>;

// ============================================================================
// Lazy Proxy Factory
// ============================================================================

/**
 * Creates a lazy proxy that defers service instantiation until first access.
 *
 * This optimization prevents unnecessary service creation when a service
 * is declared as required but never actually used in a particular code path.
 *
 * @template T - The service interface type
 * @param factory - Function that creates the actual service instance
 * @returns A proxy that behaves like the service but instantiates lazily
 * @internal
 */
function createLazyServiceProxy<T extends object>(factory: () => T): T {
    let instance: T | undefined;

    const handler: ProxyHandler<object> = {
        get(_target, prop, receiver) {
            if (!instance) {
                instance = factory();
            }
            const value = Reflect.get(instance, prop, receiver);
            return typeof value === "function" ? value.bind(instance) : value;
        },
        has(_target, prop) {
            if (!instance) {
                instance = factory();
            }
            return Reflect.has(instance, prop);
        },
        ownKeys(_target) {
            if (!instance) {
                instance = factory();
            }
            return Reflect.ownKeys(instance);
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (!instance) {
                instance = factory();
            }
            return Reflect.getOwnPropertyDescriptor(instance, prop);
        },
    };

    return new Proxy({}, handler) as T;
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
        const definition = SERVICE_DEFINITIONS[key];

        if (lazy) {
            resolved[key] = createLazyServiceProxy(() => definition.factory(basePath));
        } else {
            resolved[key] = definition.factory(basePath);
        }
    }

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
    options: ResolveServicesOptions = {}
): ServiceRegistry[K] {
    const { lazy = true } = options;
    const definition = SERVICE_DEFINITIONS[key];

    if (lazy) {
        return createLazyServiceProxy(() => definition.factory(basePath)) as ServiceRegistry[K];
    }

    return definition.factory(basePath) as ServiceRegistry[K];
}
