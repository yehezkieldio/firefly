import z from "zod";

/**
 * Repository identifiers in 'owner/repo' format or empty string.
 */
export const RepositorySchema = z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Repository must be in 'owner/repo' format")
    .or(z.literal(""))
    .default("")
    .describe("Repository identifier in 'owner/repo' format or empty string.");
