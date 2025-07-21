import type { BumperRecommendation } from "conventional-recommended-bump";
import { err, ok } from "neverthrow";
import type { ReleaseType } from "semver";
import { Version } from "#/core/domain/version";
import { SemverService } from "#/core/services/semver.service";
import type { PreReleaseBase } from "#/infrastructure/config/schema";
import { VersionError } from "#/shared/utils/error";
import type { FireflyResult } from "#/shared/utils/result";

export class VersionDeciderService {
    private readonly currentVersion: Version;
    private readonly preReleaseId?: string;
    private readonly preReleaseBase?: PreReleaseBase;
    private readonly bumper: SemverService;

    constructor(currentVersion: string, preReleaseId?: string, preReleaseBase?: PreReleaseBase) {
        this.currentVersion = new Version(currentVersion);
        this.preReleaseId = preReleaseId;
        this.preReleaseBase = preReleaseBase;
        this.bumper = new SemverService();
    }

    decideNextVersion(releaseType: ReleaseType, recommendation: BumperRecommendation): FireflyResult<string> {
        try {
            const nextVersion =
                releaseType === "prerelease"
                    ? this.createPreReleaseVersion()
                    : this.createStandardReleaseVersion(recommendation);

            return nextVersion;
        } catch (error) {
            return err(
                new VersionError(`Failed to decide next version: ${error instanceof Error ? error.message : error}`)
            );
        }
    }

    decideIndependently(releaseType: ReleaseType): FireflyResult<string> {
        const nextVersion = this.bumpVersion(releaseType);
        if (nextVersion.isErr()) {
            return err(nextVersion.error);
        }

        return ok(nextVersion.value);
    }

    private createStandardReleaseVersion(recommendation: BumperRecommendation): FireflyResult<string> {
        const releaseType = this.mapRecommendationToReleaseType(recommendation.level);
        return this.bumpVersion(releaseType);
    }

    private createPreReleaseVersion(): FireflyResult<string> {
        return this.bumpVersion("prerelease");
    }

    private mapRecommendationToReleaseType(level: number): ReleaseType {
        const levelMapping: Record<number, ReleaseType> = {
            0: "major",
            1: "minor",
            2: "patch",
        };

        return levelMapping[level] ?? "patch";
    }

    private bumpVersion(increment: ReleaseType): FireflyResult<string> {
        try {
            const newVersion = this.bumper.bump({
                current: this.currentVersion,
                increment,
                preReleaseId: this.preReleaseId,
                preReleaseBase: this.preReleaseBase,
            });

            return ok(newVersion.toString());
        } catch (error) {
            return err(new VersionError(`Failed to bump version: ${error instanceof Error ? error.message : error}`));
        }
    }
}
