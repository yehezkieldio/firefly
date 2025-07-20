import type { BumperRecommendation } from "conventional-recommended-bump";
import { err, ok, type Result } from "neverthrow";
import type { ReleaseType } from "semver";
import { Version } from "#/core/domain/version";
import { SemverService } from "#/core/services/semver.service";
import type { PreReleaseBase } from "#/infrastructure/config/schema";
import { VersionError } from "#/shared/utils/error";

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

    decideNextVersion(releaseType: ReleaseType, recommendation: BumperRecommendation): Result<string, VersionError> {
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

    private createStandardReleaseVersion(recommendation: BumperRecommendation): Result<string, VersionError> {
        const releaseType = this.mapRecommendationToReleaseType(recommendation.level);
        return this.bumpVersion(releaseType);
    }

    private createPreReleaseVersion(): Result<string, VersionError> {
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

    private bumpVersion(increment: ReleaseType): Result<string, VersionError> {
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
