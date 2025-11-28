import { defineConfig } from "tsdown/config";

export default defineConfig([
    {
        entry: "./src/cli/config.ts",
        platform: "neutral",
        nodeProtocol: "strip",
    },
    {
        entry: "./src/cli/main.ts",
        platform: "neutral",
        dts: false,
        nodeProtocol: "strip",
        minify: true,
    },
]);
