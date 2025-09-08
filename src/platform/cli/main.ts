#!/usr/bin/env bun

if (!process.versions.bun) {
    console.error(
        "Firefly is designed to run with Bun. Please install Bun if you haven't already and run the command again.",
    );
    process.exit(1);
}

import "#/application/context";
import { createCLI } from "#/platform/cli/commander";
import pkg from "../../../package.json" with { type: "json" };

async function main(): Promise<void> {
    // Ensure help is shown if no command is provided
    if (process.argv.length === 2) {
        process.argv.push("-h");
    }

    process.env.FIREFLY_VERSION = pkg.version;
    process.env.FIREFLY_DESCRIPTION = pkg.description;
    process.env.FIREFLY_GIT_CLIFF_VERSION = pkg.dependencies["git-cliff"].replace("^", "");

    const cli = createCLI();
    await cli.parseAsync(process.argv);
}

main();
