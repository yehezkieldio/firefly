import { GitRemoteService } from "#/modules/git/services/git-remote.service";
import { GitStatusService } from "#/modules/git/services/git-status.service";

export class GitProvider {
    readonly remote = new GitRemoteService();
    readonly status = new GitStatusService();
}
