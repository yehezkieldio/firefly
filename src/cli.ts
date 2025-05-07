#!/usr/bin/env bun

import { colors } from "consola/utils";
import { okAsync, Result, type ResultAsync } from "neverthrow";
import { createContext } from "#/application/context";
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

        const initialContext = createContext(options.value);

        return new Promise<void>((): ResultAsync<void, Error> => okAsync(undefined));
    });

    cli.configureOutput({
        writeErr(str: string): void {
            logger.error(str);
        }
    });

    cli.parse(Bun.argv);
}

await main();
