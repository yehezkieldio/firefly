#!/usr/bin/env bun

if (!process.versions.bun) {
    logger.fatal(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again.",
    );
    process.exit(1);
}

import "#/application/context";

import { createCLI } from "#/platform/cli/commander";
import { logger } from "#/shared/logger";
import pkg from "../../../package.json" with { type: "json" };

async function main(): Promise<void> {
    const cli = await createCLI(pkg.description, pkg.version);
    await cli.parseAsync(process.argv);
}

main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
});
