import type { GitCliffConfigService } from "#/infrastructure/services/git-cliff-config.service";

export class ChangelogPostProcessor {
    constructor(private cliffService: GitCliffConfigService) {}

    async process(rawChangelog: string): Promise<string> {
        return await this.cliffService.removeHeaderFromChangelog(rawChangelog);
    }
}
