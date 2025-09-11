import { ok } from "neverthrow";
import { executeGhCommand } from "#/modules/github/utils/gh-command-executor.util";
import { logger } from "#/shared/logger";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitHubTokenService {
    async getToken(): Promise<FireflyResult<string>> {
        let token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
        if (token) {
            logger.verbose("GitHubTokenService: Using token from environment variable.");
            return ok(token);
        }

        logger.verbose(
            "GitHubTokenService: No token found in environment variables, attempting to retrieve via GitHub CLI.",
        );
        const tokenResult = await executeGhCommand(["auth", "token"]);
        if (tokenResult.isErr()) {
            return tokenResult;
        }

        token = tokenResult.value.trim();

        logger.verbose("GitHubTokenService: Successfully retrieved token via GitHub CLI.");
        return ok(token);
    }
}
