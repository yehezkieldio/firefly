#!/usr/bin/env bun

import { colors } from "consola/utils";
import { Result, ResultAsync } from "neverthrow";
import { createContext } from "#/application/context";
import { ReleaseOrchestrator } from "#/application/services/release-orchestrator";
import { createFileConfig } from "#/infrastructure/c12";
import { cli } from "#/infrastructure/commander";
import { type ArtemisOptions, mergeOptions } from "#/infrastructure/config";
import { logger } from "#/infrastructure/logging";
import pkg from "../package.json" with { type: "json" };

export async function main(): Promise<void> {
    cli.action(async (cliOptions: ArtemisOptions): Promise<void> => {
        logger.info(`${colors.magenta("artemis")} ${colors.dim(`v${pkg.version}`)}`);

        const fileConfig: Result<ArtemisOptions, Error> = await createFileConfig();
        if (fileConfig.isErr()) {
            return logger.error(fileConfig.error.message);
        }

        const options: Result<ArtemisOptions, Error> = mergeOptions(cliOptions, fileConfig.value);
        if (options.isErr()) {
            return logger.error(options.error.message);
        }

        const initialContext = await createContext(options.value);
        if (initialContext.isErr()) {
            return logger.error(initialContext.error.message);
        }

        const orchestrator = new ReleaseOrchestrator();
        return new Promise<void>((): ResultAsync<void, Error> => orchestrator.run(initialContext.value));
    });

    cli.configureOutput({
        writeErr(str: string): void {
            logger.error(str);
        }
    });

    cli.parse(Bun.argv);
}

await main();
