import type { FireflyConfig as _FireflyConfig } from "#/infrastructure/config/schema";

export type FireflyConfig = Partial<_FireflyConfig>;
export type FireflyConfigNonPartial = FireflyConfig;

export function defineConfig(options: Partial<FireflyConfig>): Partial<FireflyConfig> {
    return options;
}
