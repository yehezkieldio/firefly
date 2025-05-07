#!/usr/bin/env bun

import { colors } from "consola/utils";
import { okAsync, type ResultAsync } from "neverthrow";
import { cli } from "#/infrastructure/commander";
import type { ArtemisOptions } from "#/infrastructure/config";
import { logger } from "#/infrastructure/logging";
import pkg from "../package.json" with { type: "json" };

export async function main(): Promise<void> {
    cli.action((options: ArtemisOptions): Promise<void> => {
        logger.log(`${colors.magenta("artemis")} ${colors.dim(`v${pkg.version}`)}`);
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
