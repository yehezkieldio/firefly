import { defineConfig } from "tsdown/config";

export default defineConfig([
    {
        entry: "./src/platform/config/index.ts",
        platform: "neutral",
        nodeProtocol: "strip",
    },
    {
        entry: "./src/platform/cli/main.ts",
        platform: "neutral",
        dts: false,
        nodeProtocol: "strip",
        minify: true,
    },
]);
