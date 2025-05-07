import type { ArtemisOptions as _ArtemisOptions } from "#/infrastructure/config";

type ArtemisOptions = Partial<_ArtemisOptions>;

/**
 * Defines the configuration for the Artemis release process.
 */
export function defineConfig(options: Partial<ArtemisOptions>): Partial<ArtemisOptions> {
    return options;
}

export type { ArtemisOptions };
