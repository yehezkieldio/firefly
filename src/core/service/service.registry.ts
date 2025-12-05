/**
 * Provides the service locator pattern for dependency injection across the workflow system.
 * Services are lazily instantiated on first access via Proxy.
 *
 * Important note on service method return types:
 * The lazy proxy wraps service calls in a `ResultAsync` chain.
 * For runtime and typing consistency, public service APIs should
 * return `FireflyAsyncResult<T>` rather than `FireflyResult<T>`.
 *
 * If an implementation is synchronous, wrap the response using `FireflyOkAsync` / `FireflyErrAsync`.
 * This avoids confusing type mismatches where TypeScript signatures say "synchronous"
 * but the proxy returns `ResultAsync` at runtime.
 *
 * Adding a new service:
 * 1. Create the service interface in `./src/services/contracts/`
 * 2. Create the service implementation in its own file in `./src/services/implementations/`
 * 3. Add the factory to `SERVICE_DEFINITIONS` below
 *
 */

import type { BrandedServiceKey, ServiceDefinition, ServiceFactoryContext } from "#/core/service/service.types";
import type { ICommitAnalysisService } from "#/services/contracts/commit-analysis.interface";
import type { IFileSystemService } from "#/services/contracts/filesystem.interface";
import type { IGitService } from "#/services/contracts/git.interface";
import type { IPackageJsonService } from "#/services/contracts/package-json.interface";
import type { IVersionBumperService } from "#/services/contracts/version-bumper.interface";
import type { IVersionStrategyService } from "#/services/contracts/version-strategy.interface";

// Forward declaration for ServiceRegistry type used in factory context
type ServiceRegistryType = {
    readonly fs: IFileSystemService;
    readonly packageJson: IPackageJsonService;
    readonly git: IGitService;
    readonly versionBumper: IVersionBumperService;
    readonly versionStrategy: IVersionStrategyService;
    readonly commitAnalysis: ICommitAnalysisService;
};

/**
 * Helper function to define a service with proper type inference.
 * @internal
 */
function defineService<T>(definition: ServiceDefinition<T, ServiceRegistryType>) {
    return definition satisfies ServiceDefinition<T, ServiceRegistryType>;
}

/**
 * Registry of all available services and their factories.
 * Each service is lazily loaded via dynamic `import()`.
 */
export const SERVICE_DEFINITIONS = {
    fs: defineService<IFileSystemService>({
        factory: async ({ basePath }: ServiceFactoryContext<ServiceRegistryType>) => {
            const { createFileSystemService } = await import("#/services/implementations/filesystem.service");
            return createFileSystemService(basePath);
        },
    }),
    packageJson: defineService<IPackageJsonService>({
        dependencies: ["fs"],
        factory: async ({ getService }) => {
            const fs = await getService("fs");
            const { createPackageJsonService } = await import("#/services/implementations/package-json.service");
            return createPackageJsonService(fs);
        },
    }),
    git: defineService<IGitService>({
        factory: async ({ basePath }) => {
            const { createGitService } = await import("#/services/implementations/git.service");
            return createGitService(basePath);
        },
    }),
    versionBumper: defineService<IVersionBumperService>({
        factory: async () => {
            const { createVersionBumperService } = await import("#/services/implementations/version-bumper.service");
            return createVersionBumperService();
        },
    }),
    versionStrategy: defineService<IVersionStrategyService>({
        dependencies: ["versionBumper"],
        factory: async ({ getService }) => {
            const versionBumper = await getService("versionBumper");
            const { createVersionStrategyService } = await import(
                "#/services/implementations/version-strategy.service"
            );
            return createVersionStrategyService(versionBumper);
        },
    }),
    commitAnalysis: defineService<ICommitAnalysisService>({
        dependencies: ["git"],
        factory: async ({ getService }) => {
            const git = await getService("git");
            const { createCommitAnalysisService } = await import("#/services/implementations/commit-analysis.service");
            return createCommitAnalysisService(git);
        },
    }),
} as const satisfies Record<string, ServiceDefinition<unknown, ServiceRegistryType>>;

/**
 *  Union of all available service keys
 */
export type ServiceKey = keyof typeof SERVICE_DEFINITIONS;

/**
 * Branded service key for runtime-validated service keys
 */
export type ValidatedServiceKey = BrandedServiceKey<ServiceKey>;

/**
 * Array of all service keys for iteration
 */
export const ALL_SERVICE_KEYS = Object.keys(SERVICE_DEFINITIONS) as ServiceKey[];

/**
 * Complete registry mapping service keys to their resolved types.
 */
export type ServiceRegistry = {
    readonly [K in ServiceKey]: (typeof SERVICE_DEFINITIONS)[K] extends ServiceDefinition<infer T, infer _TRegistry>
        ? T
        : never;
};

/**
 * Readonly array type for service key declarations in commands
 */
export type ServiceKeys = readonly ServiceKey[];

/**
 * Extracts the union type of keys from a readonly service key array
 */
export type ServiceKeysFromArray<T extends ServiceKeys> = T[number];

/**
 * Creates a partial service registry with only the specified keys
 */
export type ResolvedServices<K extends ServiceKey> = Readonly<Pick<ServiceRegistry, K>>;

/**
 * Compile-time validation that a string is a valid service key
 */
export type ValidateServiceKey<K extends string> = K extends ServiceKey ? BrandedServiceKey<K> : never;

/**
 * Default services type when all services are resolved.
 * Use this as the default generic parameter for contexts.
 */
export type DefaultServices = ResolvedServices<ServiceKey>;

/**
 * Helper to define a tuple of service keys with proper type inference.
 * Use this to get editor autocomplete for valid service keys.
 *
 * Example:
 * const RELEASE_SERVICES = defineServiceKeys("fs");
 */
export function defineServiceKeys<const Keys extends readonly ServiceKey[]>(...keys: Keys): Keys {
    return keys;
}

/**
 * Validates and brands a service key at runtime.
 *
 * @param key - The string to validate as a service key
 * @returns The branded service key, or undefined if invalid
 */
export function validateServiceKey(key: string): ValidatedServiceKey | undefined {
    return key in SERVICE_DEFINITIONS ? (key as ValidatedServiceKey) : undefined;
}
