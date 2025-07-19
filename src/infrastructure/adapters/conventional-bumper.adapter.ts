import { Bumper, type BumperRecommendation } from "conventional-recommended-bump";
import type { Commit } from "#/core/domain/commit";
import { CommitAnalyzerService } from "#/core/services/commit-analyzer.service";
import { CONVENTIONAL_OPTIONS } from "#/shared/constants/conventional";

export class ConventionalBumperAdapter {
    private readonly bumper: Bumper;

    constructor(
        private readonly basePath: string = process.cwd(),
        private readonly analyzer: CommitAnalyzerService = new CommitAnalyzerService()
    ) {
        this.bumper = new Bumper();
    }

    async getBumpRecommendation(): Promise<BumperRecommendation> {
        const recommendation = await this.bumper
            .commits({ path: this.basePath }, CONVENTIONAL_OPTIONS)
            .bump((commits: Commit[]) => this.analyzer.analyze(commits));

        return recommendation as BumperRecommendation;
    }
}
