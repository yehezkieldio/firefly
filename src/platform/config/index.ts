import type { _FireflyConfig } from "#/modules/configuration/application/config-schema.provider";

export type FireflyConfig = Partial<_FireflyConfig>;

/**
 * Configuration helper function for file-based configuration.
 */
export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
