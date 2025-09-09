import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class GitHistoryService {
    async lastTagOrNull(): Promise<FireflyResult<string | null>> {
        logger.verbose("GitHistoryService: Fetching last tag (or null if none exist)");

        const tagResult = await executeGitCommand(["describe", "--tags", "--abbrev=0"]);
        if (tagResult.isErr()) {
            // If no tags found, return null instead of error
            if (tagResult.error.message.includes("No names found")) {
                return ok(null);
            }
            return err(tagResult.error);
        }

        const tag = tagResult.value.trim();

        logger.verbose(`GitHistoryService: Last tag found - ${tag}`);
        return ok(tag || null);
    }

    async commitsSince(tagOrCommit?: string | null): Promise<FireflyResult<string[]>> {
        logger.verbose(`GitHistoryService: Fetching commits since ${tagOrCommit || "the beginning"}`);

        let args: string[];

        if (tagOrCommit) {
            args = ["rev-list", `${tagOrCommit}..HEAD`];
        } else {
            // If no tag provided, get all commits
            args = ["rev-list", "HEAD"];
        }

        const commitsResult = await executeGitCommand(args);
        if (commitsResult.isErr()) return err(commitsResult.error);

        const commits = commitsResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        logger.verbose(`GitHistoryService: Found ${commits.length} commits since ${tagOrCommit || "the beginning"}`);
        return ok(commits);
    }

    async commitDetails(hash: string): Promise<FireflyResult<string>> {
        const existsResult = await this.commitExists(hash);
        if (existsResult.isErr()) return err(existsResult.error);

        if (!existsResult.value) {
            return err(
                createFireflyError({
                    code: "NOT_FOUND",
                    message: `Commit "${hash}" does not exist.`,
                    source: "git/git-history-service",
                }),
            );
        }

        const format = ["hash:%H", "date:%ci", "author:%an <%ae>", "subject:%s", "body:%b", "notes:%N"].join("%n");

        const detailsResult = await executeGitCommand(["show", "--no-patch", `--format=${format}`, hash]);
        if (detailsResult.isErr()) return err(detailsResult.error);

        logger.verbose(`GitHistoryService: Fetched details for commit ${hash}`);
        return ok(detailsResult.value.trim());
    }

    async commitExists(hash: string): Promise<FireflyResult<boolean>> {
        const catFileResult = await executeGitCommand(["cat-file", "-e", hash]);
        if (catFileResult.isErr()) {
            // If cat-file fails, the commit doesn't exist
            return ok(false);
        }

        return ok(true);
    }

    async getCommitsBetween(fromCommit: string, toCommit: string): Promise<FireflyResult<string[]>> {
        logger.verbose(`GitHistoryService: Fetching commits between ${fromCommit} and ${toCommit}`);
        const commitsResult = await executeGitCommand(["rev-list", `${fromCommit}..${toCommit}`]);
        if (commitsResult.isErr()) return err(commitsResult.error);

        const commits = commitsResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        logger.verbose(`GitHistoryService: Found ${commits.length} commits between ${fromCommit} and ${toCommit}`);
        return ok(commits);
    }

    async getTagsContainingCommit(hash: string): Promise<FireflyResult<string[]>> {
        logger.verbose(`GitHistoryService: Fetching tags containing commit ${hash}`);

        const tagsResult = await executeGitCommand(["tag", "--contains", hash]);
        if (tagsResult.isErr()) return err(tagsResult.error);

        const tags = tagsResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        logger.verbose(`GitHistoryService: Found ${tags.length} tags containing commit ${hash}`);
        return ok(tags);
    }

    async getCommitCount(since?: string): Promise<FireflyResult<number>> {
        logger.verbose(`GitHistoryService: Fetching commit count since ${since || "the beginning"}`);

        let args: string[];

        if (since) {
            args = ["rev-list", "--count", `${since}..HEAD`];
        } else {
            args = ["rev-list", "--count", "HEAD"];
        }

        const countResult = await executeGitCommand(args);
        if (countResult.isErr()) return err(countResult.error);

        const count = Number.parseInt(countResult.value.trim(), 10);
        if (Number.isNaN(count)) {
            return err(
                createFireflyError({
                    code: "UNEXPECTED",
                    message: "Failed to parse commit count.",
                    source: "git/git-history-service",
                }),
            );
        }

        logger.verbose(`GitHistoryService: Commit count since ${since || "the beginning"} is ${count}`);
        return ok(count);
    }

    async isAncestor(ancestor: string, descendant: string): Promise<FireflyResult<boolean>> {
        logger.verbose(`GitHistoryService: Checking if ${ancestor} is an ancestor of ${descendant}`);

        const mergeBaseResult = await executeGitCommand(["merge-base", "--is-ancestor", ancestor, descendant]);
        if (mergeBaseResult.isErr()) {
            // If merge-base fails, it's not an ancestor
            return ok(false);
        }

        logger.verbose(`GitHistoryService: ${ancestor} is an ancestor of ${descendant}`);
        return ok(true);
    }
}
