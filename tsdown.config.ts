import { defineConfig, type UserConfig, type UserConfigFn } from "tsdown/config";
import pkg from "./package.json" with { type: "json" };

const config: (UserConfig | UserConfigFn)[] = [
    defineConfig({
        entry: "./src/infrastructure/config/index.ts",
        platform: "neutral",
        dts: true,
        external: Object.keys(pkg.dependencies).concat(["node:path"]),
    }),
    defineConfig({
        entry: "./src/infrastructure/cli/main.ts",
        platform: "neutral",
        dts: false,
        external: Object.keys(pkg.dependencies).concat(["node:path"]),
        minify: true,
    }),
];

export default config;
