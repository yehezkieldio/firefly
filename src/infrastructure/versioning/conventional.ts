import { Bumper, type BumperRecommendation } from "conventional-recommended-bump";
import { Ok, ok, ResultAsync } from "neverthrow";
import type { ReleaseType } from "semver";
import type { ArtemisContext } from "#/application/context";
import { CWD } from "#/infrastructure/constants";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";
import { incrementVersion } from "#/infrastructure/versioning/strategy";

interface CommitReference {
    readonly raw: string;
    readonly action: string | null;
    readonly owner: string | null;
    readonly repository: string | null;
    readonly issue: string;
    readonly prefix: string;
}

interface CommitNote {
    readonly title: string;
    readonly text: string;
}

interface CommitBase {
    readonly merge: string | null;
    readonly revert: Record<string, string | null> | null;
    readonly header: string | null;
    readonly body: string | null;
    readonly footer: string | null;
    readonly notes: readonly CommitNote[];
    readonly mentions: readonly string[];
    readonly references: readonly CommitReference[];
}

type Commit = CommitBase & Record<string, string | null>;

const CONVENTIONAL_OPTIONS = {
    headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
    headerCorrespondence: ["type", "scope", "subject"],
    noteKeywords: ["BREAKING CHANGE"],
    revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
    revertCorrespondence: ["header", "hash"],
    breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/
};

interface Analysis {
    breakings: number;
    features: number;
}

export function generateAutomaticVersion(context: ArtemisContext): ResultAsync<string, Error> {
    const basePipeline: ResultAsync<BumperRecommendation, Error> = getBumper();
    const pipelineWithSpacing: ResultAsync<BumperRecommendation, Error> = context.options.bumpStrategy
        ? basePipeline
        : basePipeline.andTee((): void => console.log(" "));

    return pipelineWithSpacing
        .andTee((recommendation: BumperRecommendation): void => logger.info(recommendation.reason))
        .andThen((recommendation: BumperRecommendation): Ok<string, never> => determineVersion(context, recommendation))
        .andTee((version: string): void => logger.verbose(`Selected version bump: ${version}`))
        .mapErr((e: Error): Error => new Error(`Failed to generate automatic version: ${e.message}`));
}

function determineVersion(context: ArtemisContext, recommendation: BumperRecommendation): Ok<string, never> {
    let nextVersion: string;

    if (context.options.releaseType === "prerelease") {
        nextVersion = incrementVersion(context, "prerelease");
    } else {
        const releaseType: ReleaseType =
            recommendation.level === 0 ? "major" : recommendation.level === 1 ? "minor" : "patch";
        if (context.options.preReleaseId) {
            nextVersion = incrementVersion(context, `pre${releaseType}` as ReleaseType);
        } else {
            nextVersion = incrementVersion(context, releaseType);
        }
    }

    return ok(nextVersion);
}

function getBumper(): ResultAsync<BumperRecommendation, Error> {
    return ResultAsync.fromPromise(
        new Bumper()
            .commits({ path: CWD }, CONVENTIONAL_OPTIONS)
            .bump((commits: Commit[]): Promise<BumperRecommendation> => Promise.resolve(analyzeBumpLevel(commits))),
        (e: unknown): Error => createErrorFromUnknown(e, "Failed to analyze conventional commits")
    );
}

function analyzeBumpLevel(commits: readonly Commit[]): BumperRecommendation {
    const analysis: Analysis = commits.reduce(
        (acc: Analysis, commit: Commit): Analysis => ({
            breakings: acc.breakings + commit.notes.length,
            features: acc.features + (commit.type === "feat" ? 1 : 0)
        }),
        { breakings: 0, features: 0 }
    );

    const level: 0 | 1 | 2 = analysis.breakings > 0 ? 0 : analysis.features > 0 ? 1 : 2;

    return {
        level,
        reason: `There ${analysis.breakings === 1 ? "is" : "are"} ${analysis.breakings} BREAKING CHANGE${analysis.breakings === 1 ? "" : "S"} and ${analysis.features} features`
    };
}
