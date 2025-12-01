#!/usr/bin/env bun

if (!process.versions.bun) {
    console.error(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again."
    );
    process.exit(1);
}

import { RuntimeEnv } from "#/core/environment/runtime-env";
import { logger } from "#/infrastructure/logging";
import pkg from "../../package.json" with { type: "json" };

/**
 * Main CLI bootstrap function.
 */
async function main(): Promise<void> {
    // Ensure help is shown if no command is provided
    if (process.argv.length === 2) {
        process.argv.push("-h");
    }

    RuntimeEnv.initialize({
        version: pkg.version,
        description: pkg.description,
        gitCliffVersion: pkg.dependencies["git-cliff"]?.replace("^", "") || "unknown",
    });

    const { createFireflyCLI } = await import("#/cli/program");
    createFireflyCLI()
        .parseAsync(process.argv)
        .catch((error) => {
            logger.error("Fatal error:", error);
            process.exit(1);
        });
}

main();
