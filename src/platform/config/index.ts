import type { _FireflyConfig } from "#/modules/configuration/config-schema.provider";

export type FireflyConfig = Partial<_FireflyConfig>;

export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
