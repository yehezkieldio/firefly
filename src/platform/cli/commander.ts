import type { Command } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import { SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import { CLIService } from "#/platform/cli/cli.service";
import type { FireflyConfig } from "#/platform/config";

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

/**
 * Creates and configures the CLI.
 */
export function createCLI(description: string, version: string): Command {
    const cliService = new CLIService();

    const program = cliService.create(description, version);

    cliService.registerCommand(
        "release",
        "Release a new version.",
        SchemaRegistry.getConfigSchema("release"),
        createReleaseWorkflow,
    );

    return program;
}
