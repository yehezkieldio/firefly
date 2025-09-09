import { err, ok } from "neverthrow";
import type { GitConfigService } from "#/modules/git/services/git-config.service";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitTagService {
    constructor(private readonly config: GitConfigService) {}

    async createTag(tagName: string, message?: string, dryRun?: boolean): Promise<FireflyResult<void>> {
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

        return ok();
    }

    async deleteLocal(tagName: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const deleteResult = await executeGitCommand(["tag", "-d", tagName], { dryRun });
        if (deleteResult.isErr()) return err(deleteResult.error);

        return ok();
    }

    async exists(tagName: string): Promise<FireflyResult<boolean>> {
        const tagResult = await executeGitCommand(["tag", "-l", tagName]);
        if (tagResult.isErr()) {
            // If the command fails, we assume the tag doesn't exist
            return ok(false);
        }

        const tagOutput = tagResult.value.trim();
        const tagExists = tagOutput === tagName;

        return ok(tagExists);
    }

    async listTags(): Promise<FireflyResult<string[]>> {
        const tagsResult = await executeGitCommand(["tag", "-l"]);
        if (tagsResult.isErr()) return err(tagsResult.error);

        const tags = tagsResult.value
            .trim()
            .split("\n")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        return ok(tags);
    }

    async getTagMessage(tagName: string): Promise<FireflyResult<string>> {
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

        return ok(messageResult.value.trim());
    }
}
