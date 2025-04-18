import { generateDeclaration } from "dets";
import pkg from "../package.json" with { type: "json" };

const startTime: number = performance.now();

await Bun.$`rm -rf dist`;
await Bun.build({
    entrypoints: ["./src/index.ts", "./src/cli.ts"],
    root: "src",
    outdir: "dist",
    minify: true,
    target: "bun",
    external: Object.keys(pkg.dependencies),
    format: "esm"
});

const types: string = await generateDeclaration({
    noModuleDeclaration: true,
    files: ["src/**/*.ts"],
    types: ["src/index.ts"],
    name: "",
    root: process.cwd()
});

await Bun.write("dist/index.d.ts", types);

const endTime: number = performance.now();
const buildTime: string = ((endTime - startTime) / 1000).toFixed(2);

console.log(`Build completed in ${buildTime}s`);
