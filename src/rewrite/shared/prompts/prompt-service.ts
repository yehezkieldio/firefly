import { input, select, confirm, editor } from "@inquirer/prompts";
import { ResultAsync } from "neverthrow";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Option for select prompt.
 */
export interface SelectOption<T = string> {
    value: T;
    name?: string;
    description?: string;
    disabled?: boolean | string;
}

/**
 * Prompt service for interactive CLI prompts.
 * Used by all commands for user interaction.
 */
export class PromptService {
    /**
     * Prompt for text input.
     */
    text(options: {
        message: string;
        default?: string;
        required?: boolean;
        validate?: (value: string) => boolean | string;
    }): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(
            input({
                message: options.message,
                default: options.default,
                required: options.required,
                validate: options.validate,
            }),
            (error: any) =>
                createFireflyError({
                    message: `Prompt failed: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Prompt for selection from options.
     */
    select<T = string>(options: {
        message: string;
        choices: SelectOption<T>[];
        default?: T;
    }): FireflyAsyncResult<T> {
        return ResultAsync.fromPromise(
            select<T>({
                message: options.message,
                choices: options.choices.map((choice) => ({
                    value: choice.value,
                    name: choice.name,
                    description: choice.description,
                    disabled: choice.disabled,
                })),
                default: options.default,
            }),
            (error: any) =>
                createFireflyError({
                    message: `Select prompt failed: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Prompt for confirmation.
     */
    confirm(options: { message: string; default?: boolean }): FireflyAsyncResult<boolean> {
        return ResultAsync.fromPromise(
            confirm({
                message: options.message,
                default: options.default ?? true,
            }),
            (error: any) =>
                createFireflyError({
                    message: `Confirm prompt failed: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Prompt for multi-line text input using editor.
     */
    editor(options: {
        message: string;
        default?: string;
        postfix?: string;
        waitForUseInput?: boolean;
    }): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(
            editor({
                message: options.message,
                default: options.default,
                postfix: options.postfix || ".txt",
                waitForUseInput: options.waitForUseInput ?? true,
            }),
            (error: any) =>
                createFireflyError({
                    message: `Editor prompt failed: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Prompt for version selection.
     */
    selectVersion(options: {
        currentVersion: string;
        suggestedVersions: { patch: string; minor: string; major: string };
        custom?: boolean;
    }): FireflyAsyncResult<string> {
        const choices: SelectOption<string>[] = [
            {
                value: options.suggestedVersions.patch,
                name: `Patch (${options.suggestedVersions.patch})`,
                description: "Backwards compatible bug fixes",
            },
            {
                value: options.suggestedVersions.minor,
                name: `Minor (${options.suggestedVersions.minor})`,
                description: "New features, backwards compatible",
            },
            {
                value: options.suggestedVersions.major,
                name: `Major (${options.suggestedVersions.major})`,
                description: "Breaking changes",
            },
        ];

        if (options.custom) {
            choices.push({
                value: "custom",
                name: "Custom",
                description: "Enter a custom version",
            });
        }

        return this.select({
            message: `Current version is ${options.currentVersion}. Select new version:`,
            choices,
        }).andThen((selected) => {
            if (selected === "custom") {
                return this.text({
                    message: "Enter custom version:",
                    required: true,
                    validate: (value) => {
                        const valid = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(value);
                        return valid || "Invalid semver format (e.g., 1.0.0, 1.0.0-alpha.1, 1.0.0+build.1)";
                    },
                });
            }
            return ResultAsync.fromSafePromise(Promise.resolve(selected));
        });
    }

    /**
     * Prompt for commit type selection.
     */
    selectCommitType(
        types: Array<{ type: string; description?: string; emoji?: string }>,
    ): FireflyAsyncResult<string> {
        const choices: SelectOption<string>[] = types.map((t) => ({
            value: t.type,
            name: t.emoji ? `${t.emoji} ${t.type}` : t.type,
            description: t.description,
        }));

        return this.select({
            message: "Select commit type:",
            choices,
        });
    }
}
