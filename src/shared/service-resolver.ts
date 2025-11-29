import {
    type ResolvedServices,
    SERVICE_DEFINITIONS,
    type ServiceKey,
    type ServiceKeys,
    type ServiceKeysFromArray,
    type ServiceRegistry,
} from "#/shared/service-definitions";

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

export interface ResolveServicesOptions {
    readonly lazy?: boolean;
}

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
            // Create lazy proxy - service instantiated on first access
            resolved[key] = createLazyServiceProxy(() => definition.factory(basePath));
        } else {
            // Eager instantiation
            resolved[key] = definition.factory(basePath);
        }
    }

    return resolved as ResolvedServices<ServiceKeysFromArray<TKeys>>;
}

export function resolveAllServices(
    basePath: string,
    options: ResolveServicesOptions = {}
): ResolvedServices<ServiceKey> {
    const allKeys = Object.keys(SERVICE_DEFINITIONS) as ServiceKey[];
    return resolveServices(allKeys, basePath, options);
}

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

// Re-export types for convenience
export type {
    ResolvedServices,
    ServiceKey,
    ServiceKeys,
    ServiceKeysFromArray,
    ServiceRegistry,
} from "#/shared/service-definitions";
