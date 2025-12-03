import z from "zod";
import { FireflyConfigSchema } from "#/cli/config/config.schema";
import { logger } from "#/infrastructure/logging";

const outputPath = process.argv[2];
if (!outputPath) {
    console.error("Usage: bun scripts/generate-json-schema.ts <output-path>");
    process.exit(1);
}

const schema = z.toJSONSchema(FireflyConfigSchema, {
    target: "draft-7",
    io: "input",
});

await Bun.write(outputPath, JSON.stringify(schema, null, 2));
await Bun.$`bunx --bun biome format --write ${outputPath}`.quiet();

logger.success(`JSON schema written to ${outputPath}`);
