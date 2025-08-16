import { err, ok } from "neverthrow";
import { GithubCliProviderAdapter } from "#/infrastructure/adapters/github-cli-provider.adapter";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class TokenService {
    async getGithubToken(adapter?: GithubCliProviderAdapter): Promise<FireflyResult<string>> {
        const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
        if (githubToken.trim()) {
            logger.verbose("TokenService: Found GitHub token in environment variables.");
            return ok(githubToken.trim());
        }
        logger.verbose("TokenService: No GitHub token found in environment variables, using GitHub CLI provider.");

        if (adapter !== undefined) {
            return await adapter.getToken();
        }

        const adapterResult = GithubCliProviderAdapter.create();
        if (adapterResult.isErr()) {
            return err(new ConfigurationError("Unable to create GitHub CLI provider", adapterResult.error));
        }
        const createdAdapter = adapterResult.value;

        const githubCliToken = await createdAdapter.getToken();
        if (githubCliToken.isErr()) {
            logger.error("TokenService: Failed to retrieve GitHub token from CLI provider", githubCliToken.error);
            return err(githubCliToken.error);
        }

        logger.verbose("TokenService: Successfully retrieved GitHub token from CLI provider.");
        return ok(githubCliToken.value.trim());
    }
}
