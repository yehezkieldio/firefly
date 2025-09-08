import type { Command } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import { ConfigSchemaProvider } from "#/modules/configuration/config-schema.provider";
import { CommandRegistry } from "#/platform/cli/registry";
import type { FireflyConfig } from "#/platform/config";

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

export function createCLI(): Command {
    const registry = new CommandRegistry();
    registry.register(ConfigSchemaProvider.get("release"), createReleaseWorkflow);

    return registry.create(ConfigSchemaProvider.base());
}
