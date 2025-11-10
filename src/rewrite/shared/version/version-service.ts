import { ok, err } from "neverthrow";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";
import type { ConventionalCommit } from "../conventional-commit/conventional-commit-service";

/**
 * Semantic version structure.
 */
export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
    raw: string;
}

/**
 * Version bump type.
 */
export type BumpType = "major" | "minor" | "patch";

/**
 * Version suggestions for user selection.
 */
export interface VersionSuggestions {
    patch: string;
    minor: string;
    major: string;
}

/**
 * Version service for semantic versioning operations.
 * Used primarily by release command.
 */
export class VersionService {
    /**
     * Parse a semantic version string.
     */
    parse(version: string): FireflyResult<SemanticVersion> {
        // Remove leading 'v' if present
        const cleanVersion = version.startsWith("v") ? version.slice(1) : version;

        // Regex for semver: major.minor.patch[-prerelease][+build]
        const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/;
        const match = cleanVersion.match(regex);

        if (!match) {
            return err(
                createFireflyError({
                    message: `Invalid semantic version: ${version}`,
                }),
            );
        }

        const [, major, minor, patch, prerelease, build] = match;

        return ok({
            major: parseInt(major, 10),
            minor: parseInt(minor, 10),
            patch: parseInt(patch, 10),
            prerelease,
            build,
            raw: cleanVersion,
        });
    }

    /**
     * Validate a semantic version string.
     */
    validate(version: string): FireflyResult<boolean> {
        return this.parse(version).map(() => true);
    }

    /**
     * Format a semantic version.
     */
    format(version: SemanticVersion, options?: { includeV?: boolean }): string {
        let formatted = `${version.major}.${version.minor}.${version.patch}`;

        if (version.prerelease) {
            formatted += `-${version.prerelease}`;
        }

        if (version.build) {
            formatted += `+${version.build}`;
        }

        return options?.includeV ? `v${formatted}` : formatted;
    }

    /**
     * Bump version by type.
     */
    bump(version: SemanticVersion | string, type: BumpType): FireflyResult<SemanticVersion> {
        const parseResult = typeof version === "string" ? this.parse(version) : ok(version);

        if (parseResult.isErr()) {
            return parseResult;
        }

        const current = parseResult.value;
        let major = current.major;
        let minor = current.minor;
        let patch = current.patch;

        switch (type) {
            case "major":
                major += 1;
                minor = 0;
                patch = 0;
                break;
            case "minor":
                minor += 1;
                patch = 0;
                break;
            case "patch":
                patch += 1;
                break;
        }

        const bumped: SemanticVersion = {
            major,
            minor,
            patch,
            raw: `${major}.${minor}.${patch}`,
        };

        return ok(bumped);
    }

    /**
     * Generate version suggestions (patch, minor, major).
     */
    getSuggestions(currentVersion: string): FireflyResult<VersionSuggestions> {
        const parseResult = this.parse(currentVersion);

        if (parseResult.isErr()) {
            return parseResult;
        }

        const current = parseResult.value;

        return ok({
            patch: this.format(this.bump(current, "patch")._unsafeUnwrap()),
            minor: this.format(this.bump(current, "minor")._unsafeUnwrap()),
            major: this.format(this.bump(current, "major")._unsafeUnwrap()),
        });
    }

    /**
     * Determine bump type from conventional commits.
     */
    determineBumpType(commits: ConventionalCommit[]): BumpType {
        let hasBreaking = false;
        let hasFeature = false;

        for (const commit of commits) {
            if (commit.breaking) {
                hasBreaking = true;
                break; // Breaking changes take precedence
            }
            if (commit.type === "feat") {
                hasFeature = true;
            }
        }

        if (hasBreaking) return "major";
        if (hasFeature) return "minor";
        return "patch";
    }

    /**
     * Calculate next version from commits.
     */
    calculateNextVersion(currentVersion: string, commits: ConventionalCommit[]): FireflyResult<string> {
        const bumpType = this.determineBumpType(commits);
        return this.bump(currentVersion, bumpType).map((version) => this.format(version));
    }

    /**
     * Compare two versions.
     * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
     */
    compare(v1: string, v2: string): FireflyResult<number> {
        const parse1 = this.parse(v1);
        const parse2 = this.parse(v2);

        if (parse1.isErr()) return parse1;
        if (parse2.isErr()) return parse2;

        const version1 = parse1.value;
        const version2 = parse2.value;

        if (version1.major !== version2.major) {
            return ok(version1.major > version2.major ? 1 : -1);
        }

        if (version1.minor !== version2.minor) {
            return ok(version1.minor > version2.minor ? 1 : -1);
        }

        if (version1.patch !== version2.patch) {
            return ok(version1.patch > version2.patch ? 1 : -1);
        }

        // For simplicity, treat prerelease/build as equal if major.minor.patch match
        return ok(0);
    }

    /**
     * Check if version is greater than another.
     */
    isGreaterThan(v1: string, v2: string): FireflyResult<boolean> {
        return this.compare(v1, v2).map((result) => result > 0);
    }

    /**
     * Check if version is a prerelease.
     */
    isPrerelease(version: string): FireflyResult<boolean> {
        return this.parse(version).map((v) => !!v.prerelease);
    }
}
