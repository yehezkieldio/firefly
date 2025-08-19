import type { Command } from "commander";
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

    return program;
}
