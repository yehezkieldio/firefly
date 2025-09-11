import { GitBranchService } from "#/modules/git/services/git-branch.service";
import { GitCommitService } from "#/modules/git/services/git-commit.service";
import { GitConfigService } from "#/modules/git/services/git-config.service";
import { GitHistoryService } from "#/modules/git/services/git-history.service";
import { GitPushService } from "#/modules/git/services/git-push.service";
import { GitRemoteService } from "#/modules/git/services/git-remote.service";
import { GitRepositoryService } from "#/modules/git/services/git-repository.service";
import { GitRollbackService } from "#/modules/git/services/git-rollback.service";
import { GitStagingService } from "#/modules/git/services/git-staging.service";
import { GitStatusService } from "#/modules/git/services/git-status.service";
import { GitTagService } from "#/modules/git/services/git-tag.service";
import { RepositoryParseService } from "#/modules/git/utils/repository-parse.service";

export class GitProvider {
    private static _instance: GitProvider;

    private _config?: GitConfigService;
    private _remote?: GitRemoteService;
    private _status?: GitStatusService;
    private _staging?: GitStagingService;
    private _commit?: GitCommitService;
    private _tag?: GitTagService;
    private _push?: GitPushService;
    private _rollback?: GitRollbackService;
    private _repository?: GitRepositoryService;
    private _branch?: GitBranchService;
    private _history?: GitHistoryService;
    private _repositoryParse?: RepositoryParseService;

    private constructor() {}

    static getInstance(): GitProvider {
        if (!GitProvider._instance) {
            GitProvider._instance = new GitProvider();
        }
        return GitProvider._instance;
    }

    get config(): GitConfigService {
        if (!this._config) {
            this._config = new GitConfigService();
        }
        return this._config;
    }

    get remote(): GitRemoteService {
        if (!this._remote) {
            this._remote = new GitRemoteService();
        }
        return this._remote;
    }

    get status(): GitStatusService {
        if (!this._status) {
            this._status = new GitStatusService();
        }
        return this._status;
    }

    get staging(): GitStagingService {
        if (!this._staging) {
            this._staging = new GitStagingService();
        }
        return this._staging;
    }

    get commit(): GitCommitService {
        if (!this._commit) {
            this._commit = new GitCommitService(this.config);
        }
        return this._commit;
    }

    get tag(): GitTagService {
        if (!this._tag) {
            this._tag = new GitTagService(this.config);
        }
        return this._tag;
    }

    get push(): GitPushService {
        if (!this._push) {
            this._push = new GitPushService();
        }
        return this._push;
    }

    get rollback(): GitRollbackService {
        if (!this._rollback) {
            this._rollback = new GitRollbackService(this.push, this.tag, this.history);
        }
        return this._rollback;
    }

    get repository(): GitRepositoryService {
        if (!this._repository) {
            this._repository = new GitRepositoryService();
        }
        return this._repository;
    }

    get branch(): GitBranchService {
        if (!this._branch) {
            this._branch = new GitBranchService();
        }
        return this._branch;
    }

    get history(): GitHistoryService {
        if (!this._history) {
            this._history = new GitHistoryService();
        }
        return this._history;
    }

    get repositoryParse(): RepositoryParseService {
        if (!this._repositoryParse) {
            this._repositoryParse = new RepositoryParseService();
        }
        return this._repositoryParse;
    }
}
