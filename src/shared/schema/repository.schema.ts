import z from "zod";

/**
 * Repository identifier in 'owner/repo' format or empty string.
 * Used for validating GitHub-style repository references.
 */
export const RepositorySchema = z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Repository must be in 'owner/repo' format")
    .or(z.literal(""))
    .default("")
    .describe("Repository identifier in 'owner/repo' format or empty string.");
