import { GitRemoteService } from "#/modules/git/services/git-remote.service";
import { GitStagingService } from "#/modules/git/services/git-staging.service";
import { GitStatusService } from "#/modules/git/services/git-status.service";

export class GitProvider {
    private _remote?: GitRemoteService;
    private _status?: GitStatusService;
    private _staging?: GitStagingService;

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
}
