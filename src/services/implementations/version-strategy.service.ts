import { ResultAsync } from "neverthrow";
import { invalidError } from "#/core/result/error.factories";
import { FireflyErrAsync, FireflyOkAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { PreReleaseBase, ReleaseType } from "#/domain/semver/semver.definitions";
import type { Version } from "#/domain/semver/version";
import { logger } from "#/infrastructure/logging";
import type { IVersionBumperService, VersionBumpOptions } from "#/services/contracts/version-bumper.interface";
import type {
    GenerateChoicesOptions,
    IVersionStrategyService,
    ResolveVersionOptions,
    VersionChoice,
    VersionRecommendation,
} from "#/services/contracts/version-strategy.interface";

export const TRANSITION_KEYWORDS = ["general availability", "promote to stable", "move to stable"] as const;

const LEVEL_TO_RELEASE_TYPE: Record<0 | 1 | 2, "major" | "minor" | "patch"> = {
    0: "major",
    1: "minor",
    2: "patch",
} as const;

/**
 * Version type categories for organizing choices.
 */
const VERSION_TYPES = {
    RELEASE: ["patch", "minor", "major"] as const,
    PRERELEASE: ["prepatch", "preminor", "premajor"] as const,
    CONTINUATION: ["prerelease"] as const,
    GRADUATION: ["graduate"] as const,
} as const;

/**
 * Pre-configured choice sets for different scenarios.
 */
const VERSION_CHOICE_SETS = {
    /**
     * When current version is a prerelease
     */
    latestIsPreRelease: [...VERSION_TYPES.CONTINUATION, ...VERSION_TYPES.GRADUATION, ...VERSION_TYPES.RELEASE],

    /**
     * When specifically requesting prerelease options
     */
    preRelease: VERSION_TYPES.PRERELEASE,

    /**
     * Default stable version options
     */
    default: [...VERSION_TYPES.RELEASE, ...VERSION_TYPES.PRERELEASE],
} as const;

/**
 * Human-readable descriptions for each release type.
 */
const VERSION_DESCRIPTIONS: Readonly<Record<string, string>> = {
    patch: "Fixes and minor enhancements without breaking compatibility. Suitable for bug fixes and small improvements.",
    minor: "New, backward-compatible functionality. Adds features that do not break existing APIs.",
    major: "Incompatible API changes. Introduces breaking changes or removes deprecated features.",
    prepatch: "Unstable patch release candidate. Used for testing patch changes before a stable release.",
    preminor: "Unstable minor release candidate. Used for previewing new features before a minor release.",
    premajor: "Unstable major release candidate. Used for testing breaking changes before a major release.",
    prerelease: "Unstable pre-release continuation. Increments the pre-release number or changes identifier.",
    graduate: "Promote pre-release to stable. Removes pre-release identifiers to create a stable version.",
};

/**
 * Contextual information about the current pre-release state.
 */
interface PreReleaseContext {
    /**
     * Indicates if the current version is a pre-release.
     */
    readonly isCurrentPreRelease: boolean;

    /**
     * The identifier used for the current pre-release version.
     */
    readonly preReleaseID: string | null;

    /**
     * Indicates if there is a transition to a stable version recommended.
     */
    readonly hasStableTransition: boolean;
}

/**
 * Default implementation of the version strategy service.
 */
export class DefaultVersionStrategyService implements IVersionStrategyService {
    private readonly bumper: IVersionBumperService;

    constructor(bumper: IVersionBumperService) {
        this.bumper = bumper;
    }

    resolveVersion(
        options: ResolveVersionOptions,
        recommendation?: VersionRecommendation
    ): FireflyAsyncResult<Version> {
        logger.verbose("DefaultVersionStrategyService: Deciding next version...");

        const preReleaseContext = this.analyzePreReleaseContext(options.currentVersion, recommendation);

        // Handle explicit prerelease request
        if (options.releaseType === "prerelease") {
            logger.verbose("DefaultVersionStrategyService: Handling prerelease request...");
            return this.handlePreReleaseRequest(options, preReleaseContext);
        }

        // Handle transition from pre-release to stable
        if (preReleaseContext.isCurrentPreRelease && preReleaseContext.hasStableTransition) {
            logger.verbose("DefaultVersionStrategyService: Handling pre-release to stable transition...");
            return this.handlePreReleaseToStableTransition(options, recommendation);
        }

        // Handle recommendation-based versioning
        if (recommendation) {
            logger.verbose("DefaultVersionStrategyService: Handling recommendation-based versioning...");
            return this.createRecommendationBasedVersion(options, recommendation, preReleaseContext);
        }

        // Handle explicit release type without recommendation
        if (options.releaseType) {
            logger.verbose("DefaultVersionStrategyService: Handling explicit release type...");
            return this.bumper.bump({
                currentVersion: options.currentVersion,
                releaseType: options.releaseType,
                preReleaseID: options.preReleaseID,
                preReleaseBase: options.preReleaseBase,
            });
        }

        return FireflyErrAsync(
            invalidError({
                message: "Cannot determine next version: no release type or recommendation provided",
            })
        );
    }

    generateChoices(options: GenerateChoicesOptions): FireflyAsyncResult<VersionChoice[]> {
        logger.verbose(
            `DefaultVersionStrategyService: Creating version choices for '${options.currentVersion.raw}'...`
        );

        const availableTypes = this.determineAvailableVersionTypes(options.currentVersion, options.releaseType);

        const choicesResults = availableTypes.map((releaseType) =>
            this.createSingleChoice(options.currentVersion, releaseType, options.preReleaseID, options.preReleaseBase)
        );

        return ResultAsync.combine(choicesResults).map((choices) => {
            logger.verbose(`DefaultVersionStrategyService: Created ${choices.length} version choices.`);
            return choices;
        });
    }

    /**
     * Analyzes the current version and recommendation to determine pre-release context.
     *
     * @param currentVersion - The current version
     * @param recommendation - The version recommendation
     * @returns The pre-release context
     */
    private analyzePreReleaseContext(
        currentVersion: Version,
        recommendation?: VersionRecommendation
    ): PreReleaseContext {
        const isCurrentPreRelease = currentVersion.isPrerelease;
        const preReleaseID = currentVersion.preReleaseID;
        const hasStableTransition = this.detectStableTransition(recommendation);

        return {
            isCurrentPreRelease,
            preReleaseID,
            hasStableTransition,
        };
    }

    /**
     * Detects if the recommendation indicates a transition to a stable version.
     *
     * @param recommendation - The version recommendation
     * @returns True if a stable transition is detected, false otherwise
     */
    private detectStableTransition(recommendation?: VersionRecommendation): boolean {
        if (!recommendation) return false;

        const reason = recommendation.reason.toLowerCase();
        return TRANSITION_KEYWORDS.some((keyword) => reason.includes(keyword));
    }

    /**
     * Handles explicit requests for pre-release versions.
     *
     * @param options - The version resolution options
     * @param context - The pre-release context
     * @returns A result containing the new pre-release version or an error
     */
    private handlePreReleaseRequest(
        options: ResolveVersionOptions,
        context: PreReleaseContext
    ): FireflyAsyncResult<Version> {
        logger.verbose("DefaultVersionStrategyService: Bumping to prerelease version...");

        return this.bumper.bump({
            currentVersion: options.currentVersion,
            releaseType: "prerelease",
            preReleaseID: options.preReleaseID ?? context.preReleaseID ?? "alpha",
            preReleaseBase: options.preReleaseBase,
        });
    }

    /**
     * Handles the transition from a pre-release version to a stable version.
     *
     * @param options - The version resolution options
     * @param recommendation - The version recommendation
     * @returns A result containing the new stable version or an error
     */
    private handlePreReleaseToStableTransition(
        options: ResolveVersionOptions,
        recommendation?: VersionRecommendation
    ): FireflyAsyncResult<Version> {
        if (!recommendation) {
            return FireflyErrAsync(
                invalidError({
                    message: "Cannot transition to stable version without recommendation",
                    source: "services/version-strategy",
                })
            );
        }

        // Graduate the current prerelease to stable
        return this.bumper
            .bump({
                currentVersion: options.currentVersion,
                releaseType: "graduate",
            })
            .andThen((stableVersion) => {
                // If recommendation suggests further bumping after graduation
                if (recommendation.level < 2) {
                    logger.verbose("DefaultVersionStrategyService: Further bumping after graduation...");
                    const releaseType = LEVEL_TO_RELEASE_TYPE[recommendation.level];
                    return this.bumper.bump({
                        currentVersion: stableVersion,
                        releaseType,
                    });
                }

                logger.verbose("DefaultVersionStrategyService: Graduated to stable version:", stableVersion.raw);
                return FireflyOkAsync(stableVersion);
            });
    }

    /**
     * Creates a new version based on the provided recommendation and pre-release context.
     *
     * @param options - The version resolution options
     * @param recommendation - The version recommendation
     * @param context - The pre-release context
     * @returns A result containing the new version or an error
     */
    private createRecommendationBasedVersion(
        options: ResolveVersionOptions,
        recommendation: VersionRecommendation,
        context: PreReleaseContext
    ): FireflyAsyncResult<Version> {
        // If currently in prerelease and no explicit transition, continue prerelease
        if (context.isCurrentPreRelease && !context.hasStableTransition) {
            logger.verbose("DefaultVersionStrategyService: Continuing prerelease versioning...");
            return this.bumper.bump({
                currentVersion: options.currentVersion,
                releaseType: "prerelease",
                preReleaseID: options.preReleaseID ?? context.preReleaseID ?? "alpha",
                preReleaseBase: options.preReleaseBase,
            });
        }

        // Standard release based on recommendation
        const releaseType = LEVEL_TO_RELEASE_TYPE[recommendation.level];
        logger.verbose("DefaultVersionStrategyService: Bumping version based on recommendation...");
        return this.bumper.bump({
            currentVersion: options.currentVersion,
            releaseType,
            preReleaseID: options.preReleaseID,
            preReleaseBase: options.preReleaseBase,
        });
    }

    /**
     * Determines the available version types based on current version and optional release type.
     *
     * @param currentVersion - The current version
     * @param releaseType - Optional specific release type
     * @returns An array of available release types
     */
    private determineAvailableVersionTypes(currentVersion: Version, releaseType?: ReleaseType): readonly ReleaseType[] {
        if (releaseType !== undefined) {
            return this.getVersionTypesForReleaseType(releaseType);
        }

        const isCurrentPreRelease = currentVersion.isPrerelease;
        return isCurrentPreRelease ? VERSION_CHOICE_SETS.latestIsPreRelease : VERSION_CHOICE_SETS.default;
    }

    /**
     * Retrieves the version types applicable for a given release type.
     *
     * @param releaseType - The type of release
     * @returns An array of applicable release types
     */
    private getVersionTypesForReleaseType(releaseType: ReleaseType): readonly ReleaseType[] {
        return releaseType === "prerelease" ? VERSION_CHOICE_SETS.preRelease : VERSION_CHOICE_SETS.default;
    }

    /**
     * Retrieves the description for a given release type.
     *
     * @param releaseType - The type of release
     * @returns The description string for the release type
     */
    private getVersionDescription(releaseType: ReleaseType): string {
        return VERSION_DESCRIPTIONS[releaseType] ?? "";
    }

    /**
     * Creates a single version choice based on the provided parameters.
     *
     * @param currentVersion - The current version
     * @param releaseType - The type of release to create
     * @param preReleaseID - Optional pre-release identifier
     * @param preReleaseBase - Optional base for pre-release
     * @returns A result containing the version choice or an error
     */
    private createSingleChoice(
        currentVersion: Version,
        releaseType: ReleaseType,
        preReleaseID?: string,
        preReleaseBase?: PreReleaseBase
    ): FireflyAsyncResult<VersionChoice> {
        const bumpOptions: VersionBumpOptions = {
            currentVersion,
            releaseType,
            preReleaseID,
            preReleaseBase,
        };

        return this.bumper.bump(bumpOptions).map((newVersion) => ({
            label: `${releaseType} (${newVersion.raw})`,
            hint: this.getVersionDescription(releaseType),
            value: newVersion.raw,
        }));
    }
}

/**
 * Creates a version strategy service instance.
 * @param bumper - The version bumper service to use
 */
export function createVersionStrategyService(bumper: IVersionBumperService): IVersionStrategyService {
    return new DefaultVersionStrategyService(bumper);
}
