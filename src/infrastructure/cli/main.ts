#!/usr/bin/env bun

if (!process.versions.bun) {
    logger.fatal(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again."
    );
    process.exit(1);
}

import { createCLI } from "#/infrastructure/cli/commander";
import { logger } from "#/shared/utils/logger.util";

async function main(): Promise<void> {
    try {
        const cli = await createCLI();
        await cli.parseAsync(process.argv);
    } catch (error) {
        console.error("Fatal error:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
