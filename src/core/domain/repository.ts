// Regex constant to avoid recreation
const GIT_EXTENSION_REGEX = /\.git$/;

export interface RepositoryInfo {
    owner: string;
    name: string;
    url: string;
    branch: string;
    remote: string;
}

export class Repository {
    readonly owner: string;
    readonly name: string;
    readonly url: string;
    readonly branch: string;
    readonly remote: string;

    constructor(info: RepositoryInfo) {
        this.owner = info.owner;
        this.name = info.name;
        this.url = info.url;
        this.branch = info.branch;
        this.remote = info.remote;
    }

    static fromString(
        repoString: string,
        branch = "main",
        remote = "origin"
    ): Repository {
        const parts = repoString.split("/");
        if (parts.length !== 2) {
            throw new Error(
                `Invalid repository format: ${repoString}. Expected format: owner/repo`
            );
        }

        const [owner, name] = parts;

        if (owner === undefined || name === undefined) {
            throw new Error(
                `Invalid repository format: ${repoString}. Both owner and name are required`
            );
        }

        const url = `https://github.com/${owner}/${name}.git`;

        return new Repository({
            owner,
            name,
            url,
            branch,
            remote,
        });
    }

    toString(): string {
        return `${this.owner}/${this.name}`;
    }

    getCloneUrl(): string {
        return this.url;
    }

    getWebUrl(): string {
        return this.url.replace(GIT_EXTENSION_REGEX, "");
    }

    getIssuesUrl(): string {
        return `${this.getWebUrl()}/issues`;
    }

    getReleasesUrl(): string {
        return `${this.getWebUrl()}/releases`;
    }

    getCompareUrl(from: string, to: string): string {
        return `${this.getWebUrl()}/compare/${from}...${to}`;
    }

    toJSON(): object {
        return {
            owner: this.owner,
            name: this.name,
            url: this.url,
            branch: this.branch,
            remote: this.remote,
        };
    }
}
