import { GitHubTokenService } from "#/modules/github/services/gh-token.service";

export class GitHubProvider {
    private static _instance: GitHubProvider;

    private _token?: GitHubTokenService;

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
}
