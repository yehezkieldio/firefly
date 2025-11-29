import { createFileSystemService } from "#/shared/fs";
import { createGitService } from "#/shared/git";
import type {
    ResolvedServices,
    ServiceKey,
    ServiceKeys,
    ServiceKeysFromArray,
    ServiceRegistry,
} from "#/shared/interfaces";

// TODO: Add new service factories here and keep in sync with ServiceRegistry interface
const serviceFactories: Record<ServiceKey, (basePath: string) => ServiceRegistry[ServiceKey]> = {
    fs: createFileSystemService,
    git: createGitService,
};

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
