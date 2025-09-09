import { err, ok } from "neverthrow";
import type { GitConfigService } from "#/modules/git/services/git-config.service";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitTagService {
    constructor(private readonly config: GitConfigService) {}

    async createTag(tagName: string, message?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(`GitTagService: Creating tag ${tagName} with message: ${message ? "yes" : "no"}`);

        const canSignTagResult = await this.config.canSignTag();
        if (canSignTagResult.isErr()) return err(canSignTagResult.error);
        const shouldSign = canSignTagResult.value;

        const args = ["tag"];

        if (shouldSign) {
            args.push("-s");
        } else {
            args.push("-a");
        }

        args.push(tagName);

        if (message) {
            args.push("-m", message);
        }

        const createTagResult = await executeGitCommand(args, { dryRun });
        if (createTagResult.isErr()) return err(createTagResult.error);

        logger.verbose(`GitTagService: Tag ${tagName} created successfully`);
        return ok();
    }

    async deleteLocal(tagName: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        logger.verbose(`GitTagService: Deleting local tag ${tagName}`);

        const deleteResult = await executeGitCommand(["tag", "-d", tagName], { dryRun });
        if (deleteResult.isErr()) return err(deleteResult.error);

        logger.verbose(`GitTagService: Tag ${tagName} deleted successfully`);
        return ok();
    }

    async exists(tagName: string): Promise<FireflyResult<boolean>> {
        logger.verbose(`GitTagService: Checking if tag ${tagName} exists`);

        const tagResult = await executeGitCommand(["tag", "-l", tagName]);
        if (tagResult.isErr()) {
            // If the command fails, we assume the tag doesn't exist
            return ok(false);
        }

        const tagOutput = tagResult.value.trim();
        const tagExists = tagOutput === tagName;

        logger.verbose(`GitTagService: Tag ${tagName} exists: ${tagExists}`);
        return ok(tagExists);
    }

    async listTags(): Promise<FireflyResult<string[]>> {
        logger.verbose("GitTagService: Listing all tags");

        const tagsResult = await executeGitCommand(["tag", "-l"]);
        if (tagsResult.isErr()) return err(tagsResult.error);

        const tags = tagsResult.value
            .trim()
            .split("\n")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        logger.verbose(`GitTagService: Found ${tags.length} tags`);
        return ok(tags);
    }

    async getTagMessage(tagName: string): Promise<FireflyResult<string>> {
        logger.verbose(`GitTagService: Getting message for tag ${tagName}`);

        const tagExistsResult = await this.exists(tagName);
        if (tagExistsResult.isErr()) return err(tagExistsResult.error);
        if (!tagExistsResult.value) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Tag "${tagName}" does not exist.`,
                    source: "git/git-tag-service",
                }),
            );
        }

        const messageResult = await executeGitCommand(["tag", "-l", "--format=%(contents)", tagName]);
        if (messageResult.isErr()) return err(messageResult.error);

        logger.verbose(`GitTagService: Retrieved message for tag ${tagName}`);
        return ok(messageResult.value.trim());
    }
}
