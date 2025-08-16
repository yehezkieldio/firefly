import { LogLevels } from "consola";
import { err, errAsync, ok, ResultAsync } from "neverthrow";
import type { VersionChoicesArgs } from "#/core/services/semver.service";
import { VersionChoicesService } from "#/core/services/version-choices.service";
import type { PromptSelectChoice } from "#/shared/types/prompt-select-choice.type";
import { VersionInferenceError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";

export class VersionChoicePrompter {
    private readonly versionChoicesService: VersionChoicesService;

    constructor(versionChoiceService: VersionChoicesService = new VersionChoicesService()) {
        this.versionChoicesService = versionChoiceService;
    }

    async generateVersionChoices(options: VersionChoicesArgs): Promise<FireflyResult<string>> {
        logger.verbose("VersionChoicePrompter: Generating version choices...");
        if (!options.currentVersion) {
            return errAsync(new VersionInferenceError("Current version is required to generate version choices."));
        }

        const choicesResult = this.versionChoicesService.createVersionChoices(options);
        if (choicesResult.isErr()) {
            return errAsync(choicesResult.error);
        }

        const versions = choicesResult.value;
        logger.verbose(
            `VersionChoicePrompter: Version choices generated: [${versions.map((v) => v.value).join(", ")}]`,
        );
        if (versions.length === 0) {
            return errAsync(new VersionInferenceError("No version choices available."));
        }

        const promptResult = await this.promptUser(versions);
        if (promptResult.isErr()) {
            return errAsync(promptResult.error);
        }

        const selectedVersion = promptResult.value;
        logger.verbose(`VersionChoicePrompter: User selected version: '${selectedVersion}'`);
        if (!selectedVersion) {
            return errAsync(new VersionInferenceError("No version selected."));
        }

        logger.verbose(`VersionChoicePrompter: Returning selected version: '${selectedVersion}'`);
        return ok(selectedVersion);
    }

    private async promptUser(versions: PromptSelectChoice[]): Promise<FireflyResult<string>> {
        logger.verbose("VersionChoicePrompter: Prompting user to select a version...");
        if (versions.length === 0) {
            return err(new VersionInferenceError("No versions available to select."));
        }

        const promptResult = await this.createPrompt(versions);
        if (promptResult.isErr()) {
            return err(promptResult.error);
        }
        if (logger.level === LogLevels.verbose) promptResult.andTee(() => logger.log(""));

        const selectedVersion = promptResult.value;
        logger.verbose(`VersionChoicePrompter: User input received: '${selectedVersion}'`);
        if (!selectedVersion || typeof selectedVersion !== "string") {
            return err(new VersionInferenceError("Invalid version selected."));
        }

        const validationResult = this.validateSelectedVersion(selectedVersion, versions);
        if (validationResult.isErr()) {
            return err(validationResult.error);
        }

        logger.verbose(`VersionChoicePrompter: Version '${validationResult.value}' validated successfully.`);
        return ok(validationResult.value);
    }

    private createPrompt(versions: PromptSelectChoice[]): AsyncFireflyResult<string> {
        logger.verbose("VersionChoicePrompter: Creating prompt for version selection");
        const firstVersion = versions[0];
        if (!firstVersion) {
            return errAsync(new VersionInferenceError("No versions available to select."));
        }

        const prompt = logger.prompt("Select version bump", {
            type: "select",
            options: versions,
            initial: firstVersion.value,
            cancel: "reject",
        });

        return ResultAsync.fromPromise(prompt, (e) => new VersionInferenceError("Failed to prompt user", e as Error));
    }

    private validateSelectedVersion(
        selectedVersion: string,
        availableVersions: PromptSelectChoice[],
    ): FireflyResult<string> {
        logger.verbose(`VersionChoicePrompter: Validating selected version: '${selectedVersion}'`);
        const validVersions = availableVersions.map((v) => v.value);

        if (!validVersions.includes(selectedVersion)) {
            return err(
                new VersionInferenceError(
                    `Invalid version selected: ${selectedVersion}. Valid options: ${validVersions.join(", ")}`,
                ),
            );
        }

        logger.verbose(`VersionChoicePrompter: Version '${selectedVersion}' is valid.`);
        return ok(selectedVersion);
    }
}
