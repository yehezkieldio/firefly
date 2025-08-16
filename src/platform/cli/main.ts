#!/usr/bin/env bun

if (!process.versions.bun) {
    logger.fatal(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again.",
    );
    process.exit(1);
}

import { createCLI } from "#/platform/cli/commander";
import { logger } from "#/shared/logger";

async function main(): Promise<void> {
    const cli = await createCLI();
    await cli.parseAsync(process.argv);
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
