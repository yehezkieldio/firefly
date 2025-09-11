import { GitHubReleaseService } from "#/modules/github/services/gh-release.service";
import { GitHubTokenService } from "#/modules/github/services/gh-token.service";

export class GitHubProvider {
    private static _instance: GitHubProvider;

    private _token?: GitHubTokenService;
    private _release?: GitHubReleaseService;

    private constructor() {}

    static getInstance(): GitHubProvider {
        if (!GitHubProvider._instance) {
            GitHubProvider._instance = new GitHubProvider();
        }
        return GitHubProvider._instance;
    }

    get token(): GitHubTokenService {
        if (!this._token) {
            this._token = new GitHubTokenService();
        }
        return this._token;
    }

    get release(): GitHubReleaseService {
        if (!this._release) {
            this._release = new GitHubReleaseService();
        }
        return this._release;
    }
}
