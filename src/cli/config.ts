import z from "zod";
import { ReleaseConfigSchema } from "#/commands/release/config";

/**
 * Global CLI options available across all commands.
 */
export const GlobalOptionsSchema = z.object({
    dryRun: z.boolean().optional().describe("Run without making actual changes."),
    verbose: z.boolean().optional().describe("Enable verbose logging output."),
    enableRollback: z.boolean().optional().describe("Automatically rollback on failure."),
});

export type GlobalOptions = z.infer<typeof GlobalOptionsSchema>;

/**
 * Unified Firefly configuration schema.
 * Combines global options with command-specific configurations.
 */
export const FireflyConfigSchema = z
    .object({
        ...GlobalOptionsSchema.shape,
        release: ReleaseConfigSchema.optional().describe("Release command configuration."),
    })
    .describe("Firefly CLI configuration.");

export type FireflyConfig = z.infer<typeof FireflyConfigSchema>;

export function toJSONSchema() {
    return z.toJSONSchema(FireflyConfigSchema, {
        io: "input",
        target: "draft-7",
    });
}

/**
 * Type-safe helper for defining Firefly configuration.
 * Provides IDE autocompletion and type checking.
 */
export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
