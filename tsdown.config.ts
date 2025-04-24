import { defineConfig } from "tsdown/config";
import pkg from "./package.json" with { type: "json" };

const config: Array<ReturnType<typeof defineConfig>> = [
    defineConfig({
        entry: "./src/index.ts",
        platform: "neutral",
        dts: true,
        format: "esm",
        external: Object.keys(pkg.dependencies)
    }),
    defineConfig({
        entry: "./src/cli.ts",
        platform: "neutral",
        dts: false,
        format: "esm",
        external: Object.keys(pkg.dependencies).concat(["node:path"]),
        minify: true
    })
];

export default config;
