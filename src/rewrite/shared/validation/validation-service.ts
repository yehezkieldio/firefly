import { ok, err, type Result } from "neverthrow";
import { z } from "zod";
import { FireflyErr, type FireflyResult } from "#/shared/errors";

export interface ValidationError {
    field: string;
    message: string;
    value?: unknown;
}

export class ValidationService {
    validateVersion(version: string): FireflyResult<string> {
        const semverRegex = /^v?\d+\.\d+\.\d+(-[\da-z-]+(\.\da-z-]+)*)?(\+[\da-z-]+(\.\da-z-]+)*)?$/i;
        if (!semverRegex.test(version)) {
            return err(FireflyErr(`Invalid semantic version: ${version}`));
        }
        return ok(version);
    }

    validateCommitMessage(message: string): FireflyResult<boolean> {
        const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+/;
        if (!conventionalRegex.test(message)) {
            return err(FireflyErr("Invalid conventional commit format"));
        }
        return ok(true);
    }

    validateGitRef(ref: string): FireflyResult<string> {
        const invalidChars = /[\s~^:?*\[\\]/;
        if (invalidChars.test(ref) || ref.startsWith(".") || ref.endsWith(".") || ref.includes("..")) {
            return err(FireflyErr(`Invalid git reference: ${ref}`));
        }
        return ok(ref);
    }

    validateUrl(url: string): FireflyResult<string> {
        try {
            new URL(url);
            return ok(url);
        } catch {
            return err(FireflyErr(`Invalid URL: ${url}`));
        }
    }

    validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, ValidationError[]> {
        const result = schema.safeParse(data);
        if (!result.success) {
            const errors: ValidationError[] = result.error.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
                value: data,
            }));
            return err(errors);
        }
        return ok(result.data);
    }

    validateRequired(value: unknown, fieldName: string): FireflyResult<unknown> {
        if (value === undefined || value === null || value === "") {
            return err(FireflyErr(`${fieldName} is required`));
        }
        return ok(value);
    }

    validateRange(value: number, min: number, max: number, fieldName: string): FireflyResult<number> {
        if (value < min || value > max) {
            return err(FireflyErr(`${fieldName} must be between ${min} and ${max}`));
        }
        return ok(value);
    }
}
