import { LogLevels } from "consola";
import { ResultAsync, err, ok } from "neverthrow";
import type { VersionChoicesArgs, VersionChoicesService } from "#/modules/semver/services/version-choices.service";
import { logger } from "#/shared/logger";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult, FireflyResult } from "#/shared/utils/result.util";

export class VersionChoicePrompter {
    constructor(private readonly versionChoicesService: VersionChoicesService) {}

    async run(options: VersionChoicesArgs): Promise<FireflyResult<string>> {
        if (!options.currentVersion) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "Current version is required to generate version choices",
                    source: "semver/version-choice-prompter",
                }),
            );
        }

        logger.verbose("VersionChoicePrompter: Generating version choices...");
        const choicesResult = this.versionChoicesService.createVersionChoices(options);
        if (choicesResult.isErr()) {
            return err(choicesResult.error);
        }

        const choices = choicesResult.value;
        if (choices.length === 0) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "No version choices available",
                    source: "semver/version-choice-prompter",
                }),
            );
        }

        logger.verbose("VersionChoicePrompter: Prompting user for version selection.");
        const prompt = await this.prompt(choices);
        if (prompt.isErr()) {
            return err(prompt.error);
        }

        const selectedVersion = prompt.value;
        if (!selectedVersion || selectedVersion === "") {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: "No version selected",
                    source: "semver/version-choice-prompter",
                }),
            );
        }
        logger.verbose(`VersionChoicePrompter: User selected version: '${selectedVersion}'`);

        return ok(selectedVersion);
    }

    private async prompt(choices: PromptSelectChoice[]): Promise<FireflyResult<string>> {
        const defaultChoice = choices[0];
        if (!defaultChoice) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: "No default version choice found",
                    source: "semver/version-choice-prompter",
                }),
            );
        }

        const prompter = await this.createPrompter(choices, defaultChoice.value);
        if (prompter.isErr()) {
            return err(prompter.error);
        }
        if (logger.level === LogLevels.verbose) prompter.andTee(() => logger.log(""));

        return prompter.andThen((version) => this.validateVersion(version, choices));
    }

    private createPrompter(choices: PromptSelectChoice[], defaultValue: string): FireflyAsyncResult<string> {
        const prompt = logger.prompt("Select version bump", {
            type: "select",
            options: choices,
            initial: defaultValue,
            cancel: "reject",
        });

        return ResultAsync.fromPromise(prompt, (e) => createFireflyError(toFireflyError(e)));
    }

    private validateVersion(version: string, availableChoices: PromptSelectChoice[]): FireflyResult<string> {
        const validVersions = availableChoices.map((choice) => choice.value);
        if (!validVersions.includes(version)) {
            return err(
                createFireflyError({
                    code: "INVALID",
                    message: `Invalid version selected: ${version}. Valid options: ${validVersions.join(", ")}`,
                    source: "semver/version-choice-prompter",
                }),
            );
        }

        return ok(version);
    }
}
