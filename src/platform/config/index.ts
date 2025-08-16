import type { __FireflyConfig } from "#/modules/configuration/application/schema-registry.service";

export type FireflyConfig = Partial<__FireflyConfig>;

/**
 * Optional helper function to define Firefly configuration.
 */
export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
