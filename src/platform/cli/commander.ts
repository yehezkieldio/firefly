import type { Command } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import { ConfigSchemaProvider } from "#/modules/configuration/application/config-schema.provider";
import { CLIManager } from "#/platform/cli/cli-manager.service";
import type { FireflyConfig } from "#/platform/config";

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

/**
 * Creates and configures the CLI.
 */
export function createCLI(description: string, version: string): Command {
    const manager = new CLIManager();

    const program = manager.create(description, version, ConfigSchemaProvider.getBase());

    manager.registerCommand(
        "release",
        "Bump a new version, generate a changelog, and publish the release.",
        ConfigSchemaProvider.getFor("release"),
        createReleaseWorkflow,
    );

    return program;
}
