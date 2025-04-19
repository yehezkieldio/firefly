import { createTokenAuth } from "@octokit/auth-token";
import { Octokit } from "@octokit/core";
import { ResultAsync } from "neverthrow";
import { logger } from "#/lib/logger";
import { createErrorFromUnknown } from "#/lib/utils";

export const OctokitRequestHeaders = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json"
};

const ARTEMIS_USER_AGENT = "Artemis (https://github.com/yehezkieldio/artemis)";

export function createOctokit(token: string): ResultAsync<Octokit, Error> {
    function createOctokitInstance(token: string): Octokit {
        const octokitWithDefaults: typeof Octokit = Octokit.defaults({
            userAgent: ARTEMIS_USER_AGENT
        });

        return new octokitWithDefaults({ auth: token });
    }

    function authenticateWithGithub(token: string): ResultAsync<{ token: string }, Error> {
        return ResultAsync.fromPromise(
            createTokenAuth(token)(),
            (error: unknown): Error => createErrorFromUnknown(error)
        );
    }

    return authenticateWithGithub(token)
        .map((auth: { token: string }): Octokit => {
            return createOctokitInstance(auth.token);
        })
        .mapErr((error: Error): Error => {
            logger.verbose(error.message);
            return error;
        });
}
