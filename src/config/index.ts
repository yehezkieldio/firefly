import type { FireflyConfig } from "#/cli/config/config.schema";

/**
 * Helper function to define a type-safe Firefly configuration.
 *
 * Provides IntelliSense autocompletion and type checking for config files.
 *
 * @param options - The configuration options
 * @returns The same options (identity function for type inference)
 */
export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
