import { ResultAsync } from "neverthrow";
import { toFireflyError, type FireflyAsyncResult } from "#/shared/errors";

export interface CreateReleaseOptions {
    tag: string;
    name?: string;
    body?: string;
    draft?: boolean;
    prerelease?: boolean;
    targetCommitish?: string;
}

export interface ReleaseInfo {
    id: string;
    htmlUrl: string;
    tag: string;
    name: string;
    draft: boolean;
    prerelease: boolean;
}

type Platform = "github" | "gitlab";

export class PlatformReleaseService {
    private platform: Platform;

    constructor(
        private readonly owner: string,
        private readonly repo: string,
        private readonly token: string,
        platform?: Platform,
    ) {
        this.platform = platform || this.detectPlatform();
    }

    createRelease(options: CreateReleaseOptions): FireflyAsyncResult<ReleaseInfo> {
        return ResultAsync.fromPromise(
            this.executeCreateRelease(options),
            (error) => toFireflyError(error, "Failed to create release"),
        );
    }

    private async executeCreateRelease(options: CreateReleaseOptions): Promise<ReleaseInfo> {
        if (this.platform === "github") {
            return this.createGitHubRelease(options);
        } else {
            return this.createGitLabRelease(options);
        }
    }

    private async createGitHubRelease(options: CreateReleaseOptions): Promise<ReleaseInfo> {
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tag_name: options.tag,
                name: options.name || options.tag,
                body: options.body || "",
                draft: options.draft || false,
                prerelease: options.prerelease || false,
                target_commitish: options.targetCommitish,
            }),
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            id: data.id.toString(),
            htmlUrl: data.html_url,
            tag: data.tag_name,
            name: data.name,
            draft: data.draft,
            prerelease: data.prerelease,
        };
    }

    private async createGitLabRelease(options: CreateReleaseOptions): Promise<ReleaseInfo> {
        const projectId = `${this.owner}%2F${this.repo}`;
        const url = `https://gitlab.com/api/v4/projects/${projectId}/releases`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": this.token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tag_name: options.tag,
                name: options.name || options.tag,
                description: options.body || "",
                ref: options.targetCommitish,
            }),
        });

        if (!response.ok) {
            throw new Error(`GitLab API error: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            id: data.tag_name,
            htmlUrl: data._links.self,
            tag: data.tag_name,
            name: data.name,
            draft: false,
            prerelease: false,
        };
    }

    private detectPlatform(): Platform {
        // Simple heuristic - can be improved
        return "github";
    }
}
