import type { BumperRecommendation } from "conventional-recommended-bump";
import type { Commit } from "#/core/domain/commit";

interface Analysis {
    breakings: number;
    features: number;
}

export class CommitAnalyzerService {
    analyze(commits: readonly Commit[]): BumperRecommendation {
        const analysis = this.analyzeCommits(commits);
        const level: 0 | 1 | 2 = analysis.breakings > 0 ? 0 : analysis.features > 0 ? 1 : 2;

        return {
            level,
            releaseType: level === 0 ? "major" : level === 1 ? "minor" : "patch",
            commits: [...commits],
            reason: `There ${analysis.breakings === 1 ? "is" : "are"} ${analysis.breakings} BREAKING CHANGE${analysis.breakings === 1 ? "" : "S"} and ${analysis.features} features`,
        };
    }

    private analyzeCommits(commits: readonly Commit[]): Analysis {
        return commits.reduce(
            (acc: Analysis, commit: Commit): Analysis => ({
                breakings: acc.breakings + commit.notes.length,
                features: acc.features + (commit.type === "feat" ? 1 : 0),
            }),
            { breakings: 0, features: 0 }
        );
    }
}
