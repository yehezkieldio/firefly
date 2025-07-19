#!/usr/bin/env bun

import { createCLI } from "#/infrastructure/cli/commander";

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
