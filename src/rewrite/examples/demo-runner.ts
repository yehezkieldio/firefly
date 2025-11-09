#!/usr/bin/env bun

/**
 * Demo runner for the rewritten architecture.
 * Run with: bun src/rewrite/examples/demo-runner.ts
 */

import { LogLevels } from "consola";
import { logger } from "#/shared/logger";
import { WorkflowOrchestrator } from "../execution/workflow-orchestrator";
import { demoCommand } from "./demo-command";

async function runDemo() {
    logger.level = LogLevels.verbose;
    logger.info("=".repeat(60));
    logger.info("Firefly Rewrite - Demo Runner");
    logger.info("=".repeat(60));

    // Verify command is available (in real use, it would be registered in a central registry)
    logger.success(`Using command: ${demoCommand.meta.name}`);
    logger.info("");

    // Demo 1: Normal execution
    logger.info("-".repeat(60));
    logger.info("Demo 1: Normal Execution");
    logger.info("-".repeat(60));

    const orchestrator1 = new WorkflowOrchestrator({
        enableRollback: true,
        verbose: true,
    });

    const result1 = await orchestrator1.executeCommand(demoCommand, {
        message: "Processing item",
        count: 3,
        skipValidation: false,
    });

    if (result1.isErr()) {
        logger.error("Execution failed:", result1.error);
    }

    logger.info("");

    // Demo 2: Skip validation
    logger.info("-".repeat(60));
    logger.info("Demo 2: Skip Validation");
    logger.info("-".repeat(60));

    const orchestrator2 = new WorkflowOrchestrator({
        enableRollback: true,
        verbose: true,
    });

    const result2 = await orchestrator2.executeCommand(demoCommand, {
        message: "Quick processing",
        count: 2,
        skipValidation: true,
    });

    if (result2.isErr()) {
        logger.error("Execution failed:", result2.error);
    }

    logger.info("");

    // Demo 3: Dry run mode
    logger.info("-".repeat(60));
    logger.info("Demo 3: Dry Run Mode");
    logger.info("-".repeat(60));

    const orchestrator3 = new WorkflowOrchestrator({
        dryRun: true,
        enableRollback: true,
        verbose: true,
    });

    const result3 = await orchestrator3.executeCommand(demoCommand, {
        message: "Dry run test",
        count: 5,
        skipValidation: false,
    });

    if (result3.isErr()) {
        logger.error("Execution failed:", result3.error);
    }

    logger.info("");
    logger.info("=".repeat(60));
    logger.success("Demo completed!");
    logger.info("=".repeat(60));
}

runDemo().catch((error) => {
    logger.error("Unhandled error:", error);
    process.exit(1);
});
