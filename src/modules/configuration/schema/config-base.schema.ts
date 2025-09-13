import z from "zod";
import { RepositorySchema } from "#/shared/schema/repository.schema";

export const BaseConfigSchema = z.object({
    // ci: z.boolean().default(false).describe("Run in CI environment."),
    repository: RepositorySchema.describe("Repo in 'owner/repo' format, auto-detected if omitted."),
    verbose: z.boolean().default(false).describe("Enable verbose logging."),
    dryRun: z.boolean().default(false).describe("Simulate execution without changes."),
    branch: z.string().optional().describe("Branch to run on, defaults to current."),
});
