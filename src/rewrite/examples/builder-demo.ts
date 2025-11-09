#!/usr/bin/env bun

/**
 * Demo of the new Task Builder API
 * Run with: bun src/rewrite/examples/builder-demo.ts
 */

import { okAsync } from "neverthrow";
import z from "zod";
import { logger } from "#/shared/logger";
import { createCommand } from "../command-registry/command-types";
import { WorkflowOrchestrator } from "../execution/workflow-orchestrator";
import { TaskBuilder } from "../task-system/task-builder";

// Configuration schema
const BuilderDemoConfigSchema = z.object({
    skipValidation: z.boolean().default(false),
    itemCount: z.number().int().positive().default(3),
});

type BuilderDemoConfig = z.infer<typeof BuilderDemoConfigSchema>;

interface BuilderDemoData extends Record<string, unknown> {
    validated?: boolean;
    processed?: number;
}

/**
 * Demo command using the new Task Builder API
 */
const builderDemoCommand = createCommand<BuilderDemoConfig, BuilderDemoData>({
    meta: {
        name: "builder-demo",
        description: "Demonstrates the new Task Builder API",
        configSchema: BuilderDemoConfigSchema,
    },

    buildTasks(_context) {
        // Task 1: Validation using builder
        const validateTask = TaskBuilder.create("validate-step")
            .description("Validate prerequisites")
            .skipWhen((ctx) => (ctx.config as BuilderDemoConfig).skipValidation)
            .execute((ctx) => {
                logger.info("✓ Validation passed");
                return okAsync(ctx.fork("validated", true));
            })
            .build();

        // Task 2: Processing using builder
        const processTask = TaskBuilder.create("process-step")
            .description("Process items")
            .dependsOn("validate-step")
            .execute((ctx) => {
                const config = ctx.config as BuilderDemoConfig;
                logger.info(`Processing ${config.itemCount} items...`);
                for (let i = 1; i <= config.itemCount; i++) {
                    logger.info(`  [${i}/${config.itemCount}] Processing item ${i}`);
                }
                return okAsync(ctx.fork("processed", config.itemCount));
            })
            .withUndo((_ctx) => {
                logger.warn("⟲ Rolling back processing");
                return okAsync();
            })
            .build();

        // Task 3: Finalization using builder
        const finalizeTask = TaskBuilder.create("finalize-step")
            .description("Finalize workflow")
            .dependsOnAll("validate-step", "process-step")
            .execute((ctx) => {
                const processed = ctx.get("processed");
                if (processed.isOk()) {
                    logger.success(`✓ Completed! Processed ${processed.value} items`);
                } else {
                    logger.success("✓ Completed!");
                }
                return okAsync(ctx);
            })
            .build();

        return okAsync([validateTask, processTask, finalizeTask]);
    },

    beforeExecute(context) {
        logger.info("\n📦 Builder Demo - Starting workflow");
        logger.info(`  Skip validation: ${context.config.skipValidation}`);
        logger.info(`  Item count: ${context.config.itemCount}\n`);
        return okAsync();
    },

    afterExecute(result, _context) {
        if (result.success) {
            logger.info(`\n✨ Workflow completed in ${result.executionTimeMs}ms`);
            logger.info(`  Executed: ${result.executedTasks.length} tasks`);
            logger.info(`  Skipped: ${result.skippedTasks.length} tasks`);
        }
        return okAsync();
    },
});

async function runBuilderDemo() {
    logger.info("=".repeat(60));
    logger.info("Task Builder API Demo");
    logger.info("=".repeat(60));

    // Demo 1: Normal execution
    logger.info("\n--- Demo 1: Normal Execution ---");
    const orchestrator1 = new WorkflowOrchestrator({ verbose: true });
    await orchestrator1.executeCommand(builderDemoCommand, {
        skipValidation: false,
        itemCount: 3,
    });

    // Demo 2: Skip validation
    logger.info("\n--- Demo 2: Skip Validation ---");
    const orchestrator2 = new WorkflowOrchestrator({ verbose: true });
    await orchestrator2.executeCommand(builderDemoCommand, {
        skipValidation: true,
        itemCount: 2,
    });

    logger.info("\n" + "=".repeat(60));
    logger.success("Builder Demo completed!");
    logger.info("=".repeat(60));
}

runBuilderDemo().catch((error) => {
    logger.error("Demo failed:", error);
    process.exit(1);
});
