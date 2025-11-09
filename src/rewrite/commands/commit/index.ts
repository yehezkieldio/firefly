import { okAsync } from "neverthrow";
import { createCommand } from "#/rewrite/command-registry/command-types";
import { TaskBuilder } from "#/rewrite/task-system/task-builder";
import { logger } from "#/shared/logger";
import { type CommitConfig, CommitConfigSchema } from "./config";
import type { CommitData } from "./types";

/**
 * Commit command - Interactive conventional commit creation with guided prompts.
 *
 * This is a scaffold implementation. Full implementation to be completed.
 */
export const commitCommand = createCommand<CommitConfig, CommitData>({
    meta: {
        name: "commit",
        description: "Interactive conventional commit creation with guided prompts",
        configSchema: CommitConfigSchema,
        examples: [
            "firefly commit",
            "firefly commit --auto-stage",
            "firefly commit --no-prompt-for-body",
            "firefly commit --no-show-emoji",
        ],
    },

    buildTasks(_context) {
        /**
         * Task flow for commit command:
         *
         * 1. Check prerequisites (git repo, staged changes)
         * 2. Load commit types (from cliff.toml or defaults)
         * 3. Prompt for commit type
         * 4. Prompt for scope (optional)
         * 5. Prompt for subject/message
         * 6. Prompt for body (optional)
         * 7. Prompt for breaking changes
         * 8. Prompt for footer (optional)
         * 9. Validate commit message format
         * 10. Show preview
         * 11. Confirm and commit
         */

        const tasks = [
            // Prerequisites
            TaskBuilder.create("commit-preflight")
                .description("Validate git repository and staged changes")
                .execute((ctx) => {
                    logger.info("✓ Prerequisites validated");
                    // TODO: Implement checks
                    // - Check if git repo
                    // - Check for staged changes (or auto-stage)
                    return okAsync(ctx);
                })
                .build(),

            // Load commit types
            TaskBuilder.create("load-commit-types")
                .description("Load commit types from cliff.toml or use defaults")
                .dependsOn("commit-preflight")
                .execute((ctx) => {
                    logger.info("Loading commit types...");
                    // TODO: Parse cliff.toml [git] commit_parsers
                    // Extract types and their descriptions
                    // Fall back to defaults if not found
                    const mockTypes = [
                        { type: "feat", description: "A new feature", emoji: "✨" },
                        { type: "fix", description: "A bug fix", emoji: "🐛" },
                        { type: "docs", description: "Documentation", emoji: "📚" },
                    ];
                    return okAsync(ctx.fork("commitTypes", mockTypes));
                })
                .build(),

            // Prompt for type
            TaskBuilder.create("prompt-type")
                .description("Prompt user to select commit type")
                .dependsOn("load-commit-types")
                .execute((ctx) => {
                    logger.info("Select commit type:");
                    // TODO: Interactive prompt
                    // Display types with emoji and descriptions
                    // Use arrow keys to select
                    logger.info("  Selected: feat");
                    return okAsync(ctx.fork("selectedType", "feat"));
                })
                .build(),

            // Prompt for scope
            TaskBuilder.create("prompt-scope")
                .description("Prompt user for optional scope")
                .dependsOn("prompt-type")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).promptForScope)
                .execute((ctx) => {
                    logger.info("Enter scope (optional): core");
                    // TODO: Interactive input
                    // Allow empty for no scope
                    return okAsync(ctx.fork("scope", "core"));
                })
                .build(),

            // Prompt for subject
            TaskBuilder.create("prompt-subject")
                .description("Prompt user for commit subject")
                .dependsOn("prompt-scope")
                .execute((ctx) => {
                    logger.info("Enter commit message: add new feature");
                    // TODO: Interactive input with validation
                    // Enforce max length
                    // Show character count
                    return okAsync(ctx.fork("subject", "add new feature"));
                })
                .build(),

            // Prompt for body
            TaskBuilder.create("prompt-body")
                .description("Prompt user for optional commit body")
                .dependsOn("prompt-subject")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).promptForBody)
                .execute((ctx) => {
                    logger.info("Enter commit body (optional): ");
                    // TODO: Multi-line input
                    // Press Enter twice to finish
                    return okAsync(ctx.fork("body", ""));
                })
                .build(),

            // Prompt for breaking changes
            TaskBuilder.create("prompt-breaking")
                .description("Prompt if this is a breaking change")
                .dependsOn("prompt-body")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).promptForBreaking)
                .execute((ctx) => {
                    logger.info("Is this a breaking change? (y/N): n");
                    // TODO: Yes/No prompt
                    return okAsync(ctx.fork("breaking", false));
                })
                .build(),

            // Prompt for footer
            TaskBuilder.create("prompt-footer")
                .description("Prompt user for optional footer")
                .dependsOn("prompt-breaking")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).promptForFooter)
                .execute((ctx) => {
                    logger.info("Enter footer (optional): ");
                    // TODO: Input for footer (e.g., closes #123)
                    return okAsync(ctx.fork("footer", ""));
                })
                .build(),

            // Build commit message
            TaskBuilder.create("build-message")
                .description("Build conventional commit message")
                .dependsOn("prompt-footer")
                .execute((ctx) => {
                    const data = ctx.snapshot() as CommitData;
                    let message = "";

                    // Format: type(scope): subject
                    message += data.selectedType;
                    if (data.scope) {
                        message += `(${data.scope})`;
                    }
                    if (data.breaking) {
                        message += "!";
                    }
                    message += `: ${data.subject}`;

                    // Add body if provided
                    if (data.body) {
                        message += `\n\n${data.body}`;
                    }

                    // Add footer if provided
                    if (data.footer) {
                        message += `\n\n${data.footer}`;
                    }

                    // Add breaking change notice if needed
                    if (data.breaking) {
                        message += "\n\nBREAKING CHANGE: This commit introduces breaking changes.";
                    }

                    logger.info("\n📝 Generated commit message:");
                    logger.info(message);

                    return okAsync(ctx.fork("commitMessage", message));
                })
                .build(),

            // Validate message
            TaskBuilder.create("validate-message")
                .description("Validate conventional commit format")
                .dependsOn("build-message")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).validateFormat)
                .execute((ctx) => {
                    logger.info("✓ Commit message validated");
                    // TODO: Validate format
                    // - Check conventional commit pattern
                    // - Verify subject length
                    // - Check body line lengths
                    return okAsync(ctx.fork("validated", true));
                })
                .build(),

            // Show preview and confirm
            TaskBuilder.create("confirm-commit")
                .description("Show preview and confirm commit")
                .dependsOn("validate-message")
                .skipWhen((ctx) => !(ctx.config as CommitConfig).requireConfirmation)
                .execute((ctx) => {
                    logger.info("\nProceed with commit? (Y/n): y");
                    // TODO: Confirmation prompt
                    return okAsync(ctx);
                })
                .build(),

            // Commit changes
            TaskBuilder.create("execute-commit")
                .description("Execute git commit")
                .dependsOn("confirm-commit")
                .execute((ctx) => {
                    const message = ctx.get("commitMessage");
                    if (message.isOk()) {
                        logger.info("✓ Changes committed");
                        // TODO: git commit -m "message"
                        return okAsync(ctx.fork("commitSha", "abc123"));
                    }
                    return okAsync(ctx);
                })
                .withUndo((_ctx) => {
                    logger.warn("⟲ Rolling back commit");
                    // TODO: git reset HEAD~1
                    return okAsync();
                })
                .build(),
        ];

        return okAsync(tasks);
    },

    beforeExecute(context) {
        logger.info("\n💬 Commit Command - Interactive conventional commit creation");
        logger.info(`  Prompt for scope: ${context.config.promptForScope}`);
        logger.info(`  Prompt for body: ${context.config.promptForBody}`);
        logger.info(`  Show emoji: ${context.config.showEmoji}\n`);
        return okAsync();
    },

    afterExecute(result, context) {
        if (result.success) {
            logger.success(`\n✨ Commit completed in ${result.executionTimeMs}ms`);

            const commitSha = context.snapshot().commitSha;
            if (commitSha) {
                logger.success(`  Commit: ${commitSha}`);
            }
        }
        return okAsync();
    },
});
