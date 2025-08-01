import { defineConfig } from "tsdown/config";

export default defineConfig([
    {
        entry: "./src/infrastructure/config/index.ts",
        platform: "neutral",
        nodeProtocol: "strip",
    },
    {
        entry: "./src/infrastructure/cli/main.ts",
        platform: "neutral",
        dts: false,
        nodeProtocol: "strip",
        minify: true,
    },
]);
