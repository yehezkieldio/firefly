import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitConfigService {
    async get(key: string): Promise<FireflyResult<string>> {
        const valueResult = await executeGitCommand(["config", "--get", key]);
        if (valueResult.isErr()) return err(valueResult.error);

        const value = valueResult.value.trim();
        return ok(value);
    }

    async getGlobal(key: string): Promise<FireflyResult<string>> {
        const valueResult = await executeGitCommand(["config", "--global", "--get", key]);
        if (valueResult.isErr()) return err(valueResult.error);

        const value = valueResult.value.trim();
        return ok(value);
    }

    async getWithFallback(key: string): Promise<FireflyResult<string>> {
        const localResult = await this.get(key);
        if (localResult.isOk()) return localResult;

        const globalResult = await this.getGlobal(key);
        if (globalResult.isOk()) return globalResult;

        return err(
            createFireflyError({
                code: "NOT_FOUND",
                message: `Config key "${key}" not found in local or global config.`,
            }),
        );
    }

    async canSign(): Promise<FireflyResult<boolean>> {
        const gpgSignResult = await this.getWithFallback("commit.gpgSign");
        if (gpgSignResult.isErr()) {
            if (gpgSignResult.error.code === "NOT_FOUND") return ok(false);
            return err(gpgSignResult.error);
        }

        const signingKeyResult = await this.getWithFallback("user.signingKey");
        if (signingKeyResult.isErr()) {
            if (signingKeyResult.error.code === "NOT_FOUND") return ok(false);
            return err(signingKeyResult.error);
        }

        const gpgSign = gpgSignResult.value.toLowerCase();
        const signingKey = signingKeyResult.value;

        const canSign = (gpgSign === "true" || gpgSign === "1") && signingKey.length > 0;
        return ok(canSign);
    }

    async canSignTag(): Promise<FireflyResult<boolean>> {
        const tagSignResult = await this.getWithFallback("tag.gpgSign");
        if (tagSignResult.isOk()) {
            const tagSign = tagSignResult.value.toLowerCase();
            if (tagSign === "true" || tagSign === "1") {
                return this.canSign();
            }
            return ok(false);
        }

        return this.canSign();
    }
}
