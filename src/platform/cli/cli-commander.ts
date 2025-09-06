import type { Command } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import { ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import { CLIManager } from "#/platform/cli/cli-manager";
import type { FireflyConfig } from "#/platform/config";

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

export function createCLI(description: string, version: string): Command {
    const manager = new CLIManager();
    const program = manager.create(description, version, ConfigSchemaProvider.base());

    manager.registerCommand(
        "release",
        "Bump a new version, generate a changelog, and publish the release",
        ConfigSchemaProvider.get("release"),
        createReleaseWorkflow,
    );

    return program;
}
