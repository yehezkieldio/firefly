import { okAsync } from "neverthrow";
import { createCommand } from "#/rewrite/command-registry/command-types";
import { TaskBuilder } from "#/rewrite/task-system/task-builder";
import { logger } from "#/shared/logger";
import { type AutocommitConfig, AutocommitConfigSchema } from "./config";
import type { AutocommitData } from "./types";

/**
 * Autocommit command - AI-generated conventional commit messages.
 *
 * This is a scaffold implementation. Full implementation to be completed.
 */
export const autocommitCommand = createCommand<AutocommitConfig, AutocommitData>({
    meta: {
        name: "autocommit",
        description: "AI-generated conventional commit messages using Azure AI or other LLM providers",
        configSchema: AutocommitConfigSchema,
        examples: [
            "firefly autocommit",
            "firefly autocommit --provider openai",
            "firefly autocommit --no-require-approval",
            "firefly autocommit --auto-stage",
        ],
    },

    buildTasks(_context) {
        /**
         * Task flow for autocommit command:
         *
         * 1. Check prerequisites (git repo, API credentials)
         * 2. Load system prompt (from .github/copilot-commit-instructions.md)
         * 3. Get staged changes (or auto-stage if configured)
         * 4. Generate efficient diff for AI
         * 5. Gather context (recent commits, file types)
         * 6. Call AI provider to generate commit message
         * 7. Parse and validate generated message
         * 8. Display message to user
         * 9. Prompt for approval/editing
         * 10. Commit changes with generated message
         */

        const tasks = [
            // Prerequisites
            TaskBuilder.create("autocommit-preflight")
                .description("Validate git repository and API credentials")
                .execute((ctx) => {
                    logger.info("✓ Prerequisites validated");
                    // TODO: Implement checks
                    // - Check if git repo
                    // - Check API key exists (env or config)
                    // - Validate API endpoint
                    return okAsync(ctx);
                })
                .build(),

            // Load system prompt
            TaskBuilder.create("load-system-prompt")
                .description("Load custom system prompt for AI")
                .dependsOn("autocommit-preflight")
                .execute((ctx) => {
                    logger.info("System prompt loaded");
                    // TODO: Read .github/copilot-commit-instructions.md
                    // Or use default prompt
                    return okAsync(ctx);
                })
                .build(),

            // Get staged changes
            TaskBuilder.create("get-staged-changes")
                .description("Analyze staged changes")
                .dependsOn("load-system-prompt")
                .execute((ctx) => {
                    logger.info("Analyzing staged changes...");
                    // TODO: Get staged files
                    // - git diff --staged
                    // - Parse file changes
                    // - Generate efficient diff (limit size)
                    const mockStaged = [
                        {
                            path: "src/example.ts",
                            status: "modified",
                            diff: "+  function example() {\n-  // old code\n+  // new code",
                        },
                    ];
                    return okAsync(ctx.fork("stagedFiles", mockStaged));
                })
                .build(),

            // Gather context
            TaskBuilder.create("gather-context")
                .description("Gather recent commits and context")
                .dependsOn("get-staged-changes")
                .skipWhen((ctx) => !(ctx.config as AutocommitConfig).includeRecentCommits)
                .execute((ctx) => {
                    logger.info("Gathering commit context...");
                    // TODO: Get recent commits
                    // - git log --format="%s" -n 5
                    return okAsync(ctx);
                })
                .build(),

            // Generate commit message with AI
            TaskBuilder.create("generate-message")
                .description("Generate conventional commit message using AI")
                .dependsOn("gather-context")
                .execute((ctx) => {
                    logger.info("🤖 Generating commit message with AI...");
                    // TODO: Call AI provider
                    // - Format prompt with diff and context
                    // - Call Azure AI / OpenAI / Anthropic API
                    // - Parse response
                    // - Validate conventional commit format
                    const mockMessage = {
                        type: "feat",
                        scope: "example",
                        subject: "add new example function",
                        body: "Implements new functionality for example use case",
                        breaking: false,
                    };
                    return okAsync(ctx.fork("generatedMessage", mockMessage));
                })
                .build(),

            // Display and approve
            TaskBuilder.create("display-message")
                .description("Display generated message and get approval")
                .dependsOn("generate-message")
                .skipWhen((ctx) => !(ctx.config as AutocommitConfig).requireApproval)
                .execute((ctx) => {
                    const message = ctx.get("generatedMessage");
                    if (message.isOk()) {
                        const msg = message.value as AutocommitData["generatedMessage"];
                        logger.info("\n📝 Generated commit message:");
                        logger.info(`  ${msg?.type}${msg?.scope ? `(${msg.scope})` : ""}: ${msg?.subject}`);
                        if (msg?.body) {
                            logger.info(`\n  ${msg.body}`);
                        }
                    }
                    // TODO: Prompt for approval
                    // TODO: Allow editing if configured
                    logger.info("\n✓ Message approved");
                    return okAsync(ctx.fork("approved", true));
                })
                .build(),

            // Commit changes
            TaskBuilder.create("commit-changes")
                .description("Commit changes with generated message")
                .dependsOn("display-message")
                .execute((ctx) => {
                    logger.info("✓ Changes committed");
                    // TODO: git commit with generated message
                    return okAsync(ctx.fork("commitSha", "xyz789"));
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
        logger.info("\n🤖 Autocommit Command - Starting AI-powered commit generation");
        logger.info(`  Provider: ${context.config.provider}`);
        logger.info(`  Require approval: ${context.config.requireApproval}`);
        logger.info(`  Allow edit: ${context.config.allowEdit}\n`);
        return okAsync();
    },

    afterExecute(result, context) {
        if (result.success) {
            logger.success(`\n✨ Autocommit completed in ${result.executionTimeMs}ms`);

            const commitSha = context.snapshot().commitSha;
            if (commitSha) {
                logger.success(`  Commit: ${commitSha}`);
            }
        }
        return okAsync();
    },
});
