import z from "zod";
import { ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import { logger } from "#/shared/logger";

const outputPath = process.argv[2];
if (!outputPath) {
    console.error("Usage: bun scripts/generate-json-schema.ts <output-path>");
    process.exit(1);
}

const _schema = ConfigSchemaProvider.get().partial();
const schema = z.toJSONSchema(_schema, {
    target: "draft-7",
    io: "input",
});

await Bun.write(outputPath, JSON.stringify(schema, null, 2));
await Bun.$`bunx --bun biome format --write ${outputPath}`.quiet();

logger.success(`JSON schema written to ${outputPath}`);
