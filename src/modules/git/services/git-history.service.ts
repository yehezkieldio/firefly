import { err, ok } from "neverthrow";
import { executeGitCommand } from "#/modules/git/utils/git-command-executor.util";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export interface CommitInfo {
    hash: string;
    shortHash: string;
    subject: string;
    body: string;
    author: {
        name: string;
        email: string;
        date: string;
    };
    committer: {
        name: string;
        email: string;
        date: string;
    };
}

export class GitHistoryService {
    async lastTagOrNull(): Promise<FireflyResult<string | null>> {
        const tagResult = await executeGitCommand(["describe", "--tags", "--abbrev=0"]);
        if (tagResult.isErr()) {
            // If no tags found, return null instead of error
            if (tagResult.error.message.includes("No names found")) {
                return ok(null);
            }
            return err(tagResult.error);
        }

        const tag = tagResult.value.trim();
        return ok(tag || null);
    }

    async commitsSince(tagOrCommit?: string | null): Promise<FireflyResult<string[]>> {
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

        return ok(commits);
    }

    async commitDetails(hash: string): Promise<FireflyResult<CommitInfo>> {
        // Verify commit exists first
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

        // Get detailed commit information
        const format = [
            "%H", // full hash
            "%h", // abbreviated hash
            "%s", // subject
            "%b", // body
            "%an", // author name
            "%ae", // author email
            "%ad", // author date
            "%cn", // committer name
            "%ce", // committer email
            "%cd", // committer date
        ].join("%n");

        const detailsResult = await executeGitCommand(["show", "--no-patch", `--format=${format}`, hash]);
        if (detailsResult.isErr()) return err(detailsResult.error);

        const lines = detailsResult.value.trim().split("\n");

        if (lines.length < 10) {
            return err(
                createFireflyError({
                    code: "UNEXPECTED",
                    message: `Invalid git show output for commit "${hash}".`,
                    source: "git/git-history-service",
                }),
            );
        }

        const commitInfo: CommitInfo = {
            hash: lines[0] || "",
            shortHash: lines[1] || "",
            subject: lines[2] || "",
            body: lines[3] || "",
            author: {
                name: lines[4] || "",
                email: lines[5] || "",
                date: lines[6] || "",
            },
            committer: {
                name: lines[7] || "",
                email: lines[8] || "",
                date: lines[9] || "",
            },
        };

        return ok(commitInfo);
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
        const commitsResult = await executeGitCommand(["rev-list", `${fromCommit}..${toCommit}`]);
        if (commitsResult.isErr()) return err(commitsResult.error);

        const commits = commitsResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return ok(commits);
    }

    async getTagsContainingCommit(hash: string): Promise<FireflyResult<string[]>> {
        const tagsResult = await executeGitCommand(["tag", "--contains", hash]);
        if (tagsResult.isErr()) return err(tagsResult.error);

        const tags = tagsResult.value
            .trim()
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return ok(tags);
    }

    async getCommitCount(since?: string): Promise<FireflyResult<number>> {
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

        return ok(count);
    }

    async isAncestor(ancestor: string, descendant: string): Promise<FireflyResult<boolean>> {
        const mergeBaseResult = await executeGitCommand(["merge-base", "--is-ancestor", ancestor, descendant]);
        if (mergeBaseResult.isErr()) {
            // If merge-base fails, it's not an ancestor
            return ok(false);
        }

        return ok(true);
    }
}
