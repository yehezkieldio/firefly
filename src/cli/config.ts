import z from "zod";
import { ReleaseConfigSchema } from "#/commands/release/config";

export const GlobalOptionsSchema = z.object({
    dryRun: z.boolean().optional().describe("Run without making actual changes."),
    verbose: z.boolean().optional().describe("Enable verbose logging output."),
    enableRollback: z.boolean().optional().describe("Automatically rollback on failure."),
});

export type GlobalOptions = z.infer<typeof GlobalOptionsSchema>;

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

export function defineConfig<T extends FireflyConfig>(options: T): T {
    return options;
}
