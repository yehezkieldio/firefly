import z from "zod";

/**
 * Autocommit command configuration schema.
 */
export const AutocommitConfigSchema = z.object({
    /**
     * AI provider to use (azure-ai, openai, anthropic, etc.).
     */
    provider: z.enum(["azure-ai", "openai", "anthropic"]).default("azure-ai"),

    /**
     * API endpoint for the AI provider.
     */
    apiEndpoint: z.string().optional(),

    /**
     * API key for authentication (can also use env var).
     */
    apiKey: z.string().optional(),

    /**
     * Model/deployment name to use.
     */
    model: z.string().optional(),

    /**
     * Temperature for AI generation (0-1).
     */
    temperature: z.number().min(0).max(1).default(0.3),

    /**
     * Maximum tokens for response.
     */
    maxTokens: z.number().int().positive().default(500),

    /**
     * Path to custom system prompt file.
     * Default: .github/copilot-commit-instructions.md
     */
    systemPromptPath: z.string().default(".github/copilot-commit-instructions.md"),

    /**
     * Whether to include file diffs in the AI prompt.
     */
    includeDiff: z.boolean().default(true),

    /**
     * Maximum diff length to include (characters).
     */
    maxDiffLength: z.number().int().positive().default(10_000),

    /**
     * Whether to detect breaking changes.
     */
    detectBreakingChanges: z.boolean().default(true),

    /**
     * Conventional commit types to consider.
     */
    commitTypes: z
        .array(z.string())
        .default(["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore"]),

    /**
     * Whether to prompt for approval before committing.
     */
    requireApproval: z.boolean().default(true),

    /**
     * Whether to allow editing the generated message.
     */
    allowEdit: z.boolean().default(true),

    /**
     * Whether to automatically stage all changes.
     */
    autoStage: z.boolean().default(false),

    /**
     * Whether to include context from recent commits.
     */
    includeRecentCommits: z.boolean().default(true),

    /**
     * Number of recent commits to include as context.
     */
    recentCommitsCount: z.number().int().min(0).max(20).default(5),
});

export type AutocommitConfig = z.infer<typeof AutocommitConfigSchema>;
