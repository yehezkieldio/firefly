import z from "zod";
import { SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import { logger } from "#/shared/logger";

const outputPath = process.argv[2];
if (!outputPath) {
    console.error("Usage: bun scripts/generate-json-schema.ts <output-path>");
    process.exit(1);
}

const configSchema = SchemaRegistry.getConfigSchema();
const schema = z.toJSONSchema(configSchema.partial(), {
    target: "draft-4",
    io: "input",
});

await Bun.write(outputPath, JSON.stringify(schema, null, 2));
await Bun.$`bunx --bun biome format --write ${outputPath}`.quiet();

logger.success(`JSON schema written to ${outputPath}`);
