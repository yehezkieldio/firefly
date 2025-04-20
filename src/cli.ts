#!/usr/bin/env bun

import { type Command, createCommand } from "commander";
import { colors } from "consola/utils";
import type { ResultAsync } from "neverthrow";
import { logger } from "#/lib/logger";
import { validateBumpStrategy, validateReleaseType } from "#/lib/utils";
import { createPipeline } from "#/pipelines/main";
import type { ArtemisOptions } from "#/types";
import pkg from "../package.json" with { type: "json" };

const cli: Command = createCommand();

cli.name("artemis")
    .description(pkg.description)
    .version(pkg.version, "--version", "Display version information")
    .helpOption("-h, --help", "Display help information")
    .option("--verbose", "Enable verbose output", false)
    .option("--dry-run", "Enable dry run mode", false)
    .option("-b, --bump-strategy [strategy]", "Specify the bumping strategy", validateBumpStrategy, "")
    .option("-r, --release-type [type]", "Specify the release type", validateReleaseType, "")
    .option("-p, --pre-release-id [id]", "Specify the pre-release identifier", "")
    .option("-B, --pre-release-base [base]", "Specify the pre-release base version", "")
    .option("--skip-bump", "Skip the version bump in the changelog", false)
    .option("--skip-changelog", "Skip the changelog generation step", false)
    .option("--skip-github-release", "Skip the GitHub release step", false)
    .option("--skip-commit", "Skip the commit creation step", false)
    .option("--skip-tag", "Skip the version tag creation step", false)
    .option("--skip-push", "Skip the push step", false)
    .option("--github-release-draft", "Create a draft GitHub release", false)
    .option("--github-release-prerelease", "Create a pre-release GitHub release", false)
    .option("--github-release-latest", "Create a latest GitHub release", true)
    .action((options: ArtemisOptions): Promise<void> => {
        logger.log(`${colors.magenta("artemis")} ${colors.dim(`v${pkg.version}`)}`);
        return new Promise<void>((): ResultAsync<void, Error> => createPipeline(options));
    })
    .configureOutput({
        writeErr(str: string): void {
            logger.error(str);
        }
    });

cli.parse(Bun.argv);
