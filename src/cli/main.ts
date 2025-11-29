#!/usr/bin/env bun
/**
 * Firefly CLI entry point.
 *
 * This is the main executable entry point for the Firefly CLI.
 * It validates the runtime environment, sets up environment variables,
 * and bootstraps the Commander.js program.
 *
 * @remarks
 * Firefly requires Bun as its runtime. This entry point validates
 * that requirement before proceeding.
 *
 * @module
 */

if (!process.versions.bun) {
    console.error(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again."
    );
    process.exit(1);
}

import { logger } from "#/utils/log";
import pkg from "../../package.json" with { type: "json" };

/**
 * Main CLI bootstrap function.
 *
 * Sets up the execution environment and launches the CLI:
 * 1. Auto-shows help when no command is provided
 * 2. Injects version information into environment variables
 * 3. Dynamically imports and executes the CLI program
 */
async function main(): Promise<void> {
    // Ensure help is shown if no command is provided
    if (process.argv.length === 2) {
        process.argv.push("-h");
    }

    process.env.FIREFLY_VERSION = pkg.version;
    process.env.FIREFLY_DESCRIPTION = pkg.description;
    process.env.FIREFLY_GIT_CLIFF_VERSION = pkg.dependencies["git-cliff"]?.replace("^", "") || "unknown";

    const { createFireflyCLI } = await import("#/cli/commander");
    createFireflyCLI()
        .parseAsync(process.argv)
        .catch((error) => {
            logger.error("Fatal error:", error);
            process.exit(1);
        });
}

main();
