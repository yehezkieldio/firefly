/**
 * Adding a new service:
 * 1. Create the service interface in interfaces.ts
 * 2. Create the service implementation in its own file
 * 3. Add the factory to SERVICE_DEFINITIONS below
 */

import type { IFileSystemService, IGitService } from "#/shared/interfaces";

export type ServiceFactory<T> = (basePath: string) => T;

export interface ServiceDefinition<T> {
    readonly factory: ServiceFactory<T>;
    readonly description: string;
}

function defineService<T>(definition: ServiceDefinition<T>): ServiceDefinition<T> {
    return definition;
}

export const SERVICE_DEFINITIONS = {
    fs: defineService<IFileSystemService>({
        factory: (basePath) => {
            const { createFileSystemService } = require("#/shared/fs") as {
                createFileSystemService: ServiceFactory<IFileSystemService>;
            };
            return createFileSystemService(basePath);
        },
        description: "File system operations (read, write, exists)",
    }),

    git: defineService<IGitService>({
        factory: (basePath) => {
            const { createGitService } = require("#/shared/git") as {
                createGitService: ServiceFactory<IGitService>;
            };
            return createGitService(basePath);
        },
        description: "Git operations (commit, tag, push, status)",
    }),
} as const;

export type ServiceKey = keyof typeof SERVICE_DEFINITIONS;
export const ALL_SERVICE_KEYS = Object.keys(SERVICE_DEFINITIONS) as ServiceKey[];

export type ServiceRegistry = {
    readonly [K in ServiceKey]: (typeof SERVICE_DEFINITIONS)[K] extends ServiceDefinition<infer T> ? T : never;
};

/**
 * Readonly array of service keys for const assertions in commands.
 */
export type ServiceKeys = readonly ServiceKey[];

/**
 * Extract service keys from a readonly array type.
 */
export type ServiceKeysFromArray<T extends ServiceKeys> = T[number];

/**
 * Pick only the specified services from the registry.
 */
export type ResolvedServices<K extends ServiceKey> = Readonly<Pick<ServiceRegistry, K>>;

/**
 * Validate that a service key exists at compile time.
 * Returns never if the key is invalid.
 */
export type ValidateServiceKey<K extends string> = K extends ServiceKey ? K : never;
