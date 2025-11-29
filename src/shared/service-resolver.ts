import { createFileSystemService } from "#/shared/fs";
import { createGitService } from "#/shared/git";
import type {
    ResolvedServices,
    ServiceKey,
    ServiceKeys,
    ServiceKeysFromArray,
    ServiceRegistry,
} from "#/shared/interfaces";

/**
 * Factory functions for creating each service type.
 * Add new service factories here when expanding the registry.
 */
const serviceFactories: Record<ServiceKey, (basePath: string) => ServiceRegistry[ServiceKey]> = {
    fs: createFileSystemService,
    git: createGitService,
};

/**
 * Resolves only the requested services from the registry.
 * Creates service instances lazily based on the required keys.
 *
 * @param requiredServices - Array of service keys to resolve
 * @param basePath - Base path for service initialization
 * @returns Object containing only the requested services
 *
 * @example
 * ```ts
 * const services = resolveServices(['fs', 'git'] as const, '/path/to/project');
 * // services: { fs: IFileSystemService, git: IGitService }
 * ```
 */
export function resolveServices<const TKeys extends ServiceKeys>(
    requiredServices: TKeys,
    basePath: string
): ResolvedServices<ServiceKeysFromArray<TKeys>> {
    const resolved = {} as Record<ServiceKey, unknown>;

    for (const key of requiredServices) {
        const factory = serviceFactories[key];
        resolved[key] = factory(basePath);
    }

    return resolved as ResolvedServices<ServiceKeysFromArray<TKeys>>;
}

/**
 * Creates a full service registry with all available services.
 * Use this when you need all services or for legacy compatibility.
 *
 * @param basePath - Base path for service initialization
 * @returns Complete service registry
 */
export function createFullServiceRegistry(basePath: string): ServiceRegistry {
    return {
        fs: createFileSystemService(basePath),
        git: createGitService(basePath),
    };
}
