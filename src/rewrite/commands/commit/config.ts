import z from "zod";

/**
 * Commit command configuration schema.
 */
export const CommitConfigSchema = z.object({
    /**
     * Path to cliff.toml for parsing commit types.
     */
    cliffConfigPath: z.string().default("cliff.toml"),

    /**
     * Default commit types if cliff.toml not found.
     */
    defaultCommitTypes: z
        .array(
            z.object({
                type: z.string(),
                description: z.string(),
                emoji: z.string().optional(),
            }),
        )
        .default([
            { type: "feat", description: "A new feature", emoji: "✨" },
            { type: "fix", description: "A bug fix", emoji: "🐛" },
            { type: "docs", description: "Documentation changes", emoji: "📚" },
            { type: "style", description: "Code style changes (formatting, etc.)", emoji: "💎" },
            { type: "refactor", description: "Code refactoring", emoji: "♻️" },
            { type: "perf", description: "Performance improvements", emoji: "⚡" },
            { type: "test", description: "Adding or updating tests", emoji: "🧪" },
            { type: "build", description: "Build system changes", emoji: "🏗️" },
            { type: "ci", description: "CI/CD changes", emoji: "🤖" },
            { type: "chore", description: "Other changes that don't modify src/test files", emoji: "🔧" },
        ]),

    /**
     * Whether to show emoji in type selection.
     */
    showEmoji: z.boolean().default(true),

    /**
     * Whether to prompt for scope.
     */
    promptForScope: z.boolean().default(true),

    /**
     * Whether to prompt for commit body.
     */
    promptForBody: z.boolean().default(true),

    /**
     * Whether to prompt for footer.
     */
    promptForFooter: z.boolean().default(false),

    /**
     * Whether to prompt for breaking changes.
     */
    promptForBreaking: z.boolean().default(true),

    /**
     * Maximum subject length.
     */
    maxSubjectLength: z.number().int().positive().default(72),

    /**
     * Maximum body line length.
     */
    maxBodyLineLength: z.number().int().positive().default(100),

    /**
     * Whether to validate commit format before committing.
     */
    validateFormat: z.boolean().default(true),

    /**
     * Whether to auto-stage changes before committing.
     */
    autoStage: z.boolean().default(false),

    /**
     * Whether to show preview before committing.
     */
    showPreview: z.boolean().default(true),

    /**
     * Whether to require confirmation before committing.
     */
    requireConfirmation: z.boolean().default(true),
});

export type CommitConfig = z.infer<typeof CommitConfigSchema>;
