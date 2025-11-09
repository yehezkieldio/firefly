import { ok, okAsync } from "neverthrow";
import z from "zod";
import { createCommand } from "#/rewrite/command-registry/command-types";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import { createTask } from "#/rewrite/task-system/task-types";
import { logger } from "#/shared/logger";

/**
 * Demo command configuration schema.
 */
const DemoConfigSchema = z.object({
    message: z.string().default("Hello from rewritten Firefly!"),
    count: z.number().int().positive().default(3),
    skipValidation: z.boolean().default(false),
});

type DemoConfig = z.infer<typeof DemoConfigSchema>;

/**
 * Demo workflow runtime data.
 */
interface DemoData extends Record<string, unknown> {
    validated?: boolean;
    processedItems?: number;
}

/**
 * Demo command showcasing the new architecture.
 */
export const demoCommand = createCommand<DemoConfig, DemoData>({
    meta: {
        name: "demo",
        description: "Demo command showcasing the rewritten architecture",
        configSchema: DemoConfigSchema,
        examples: ['firefly demo --message "Custom message" --count 5', "firefly demo --skip-validation"],
    },

    buildTasks(context: WorkflowContext<DemoConfig, DemoData>) {
        const tasks = [
            // Task 1: Validation
            createTask({
                meta: {
                    id: "demo-validate",
                    description: "Validate demo prerequisites",
                },
                shouldSkip(ctx) {
                    const config = ctx.config as DemoConfig;
                    return ok({
                        shouldSkip: config.skipValidation,
                        reason: "Validation skipped by configuration",
                        skipToTasks: ["demo-process"],
                    });
                },
                execute(_ctx) {
                    logger.info("Running validation...");
                    // Simulate validation work
                    return okAsync(_ctx.fork("validated", true));
                },
            }),

            // Task 2: Process
            createTask({
                meta: {
                    id: "demo-process",
                    description: "Process demo items",
                    dependencies: ["demo-validate"],
                },
                execute(ctx) {
                    const config = ctx.config as DemoConfig;
                    logger.info(`Processing ${config.count} items...`);
                    for (let i = 1; i <= config.count; i++) {
                        logger.info(`  Item ${i}: ${config.message}`);
                    }
                    return okAsync(ctx.fork("processedItems", config.count));
                },
                undo(_ctx) {
                    logger.warn("Rolling back processing...");
                    return okAsync();
                },
            }),

            // Task 3: Finalize
            createTask({
                meta: {
                    id: "demo-finalize",
                    description: "Finalize demo workflow",
                    dependencies: ["demo-process"],
                },
                execute(ctx) {
                    const processedItems = ctx.get("processedItems");
                    if (processedItems.isOk()) {
                        logger.success(`Demo completed! Processed ${processedItems.value} items.`);
                    } else {
                        logger.success("Demo completed!");
                    }
                    return okAsync(ctx);
                },
            }),
        ];

        return okAsync(tasks);
    },

    beforeExecute(context) {
        logger.info("Starting demo command with configuration:");
        logger.info(`  Message: ${context.config.message}`);
        logger.info(`  Count: ${context.config.count}`);
        logger.info(`  Skip Validation: ${context.config.skipValidation}`);
        return okAsync();
    },

    afterExecute(result, _context) {
        if (result.success) {
            logger.success(`Demo workflow completed successfully in ${result.executionTimeMs}ms`);
            logger.info(`  Executed tasks: ${result.executedTasks.join(", ")}`);
            if (result.skippedTasks.length > 0) {
                logger.info(`  Skipped tasks: ${result.skippedTasks.join(", ")}`);
            }
        }
        return okAsync();
    },

    onError(error, _context) {
        logger.error(`Demo command failed: ${error.message}`);
        return okAsync();
    },
});
