#!/usr/bin/env bun

/**
 * Entry point for the rewritten Firefly CLI.
 * Run with: bun src/rewrite/cli/main.ts <command> [options]
 */

if (!process.versions.bun) {
    console.error(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again.",
    );
    process.exit(1);
}

import { logger } from "#/shared/logger";
import { createFireflyCLI } from "./commander";
import pkg from "../../../package.json" with { type: "json" };

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
    // Ensure help is shown if no command is provided
    if (process.argv.length === 2) {
        process.argv.push("-h");
    }

    // Set environment variables for version display
    process.env.FIREFLY_VERSION = pkg.version;
    process.env.FIREFLY_DESCRIPTION = pkg.description;
    process.env.FIREFLY_GIT_CLIFF_VERSION = pkg.dependencies["git-cliff"]?.replace("^", "") || "unknown";

    try {
        const cli = createFireflyCLI();
        await cli.parseAsync(process.argv);
    } catch (error) {
        logger.error("Fatal error:", error);
        process.exit(1);
    }
}

main();
