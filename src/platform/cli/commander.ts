import { program } from "commander";
import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
import { SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import { registerOptions } from "#/platform/cli/options";
import { CLIRunner } from "#/platform/cli/runner";
import type { FireflyConfig } from "#/platform/config";

export interface CLIOptions extends FireflyConfig {
    config?: string;
}

const runner = new CLIRunner();

export async function createCLI(description: string, version: string): Promise<typeof program> {
    program.name("firefly").description(description).version(version);

    // global options
    program.helpOption("-h, --help", "Display help information").helpCommand("help", "Display help for command");
    registerOptions(program, SchemaRegistry.getBaseSchema());

    // release command
    const release = program.command("release").description("Create a new release");
    registerOptions(release, SchemaRegistry.getConfigSchema("release"));
    release.action(async (options: CLIOptions) => {
        await runner.run("release", options, createReleaseWorkflow);
    });

    return program;
}
