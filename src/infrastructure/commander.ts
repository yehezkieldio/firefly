import { type Command, createCommand, InvalidOptionArgumentError } from "commander";
import type { BumpStrategy, OptionalBumpStrategy, OptionalReleaseType } from "#/types";
import pkg from "../../package.json" with { type: "json" };

export const cli: Command = createCommand();

cli.name("artemis")
    .description(pkg.description)
    .version(pkg.version, "--version", "Display version information")
    .helpOption("-h, --help", "Display help information")
    .option("--name [name]", "The non-scoped name of the project", "")
    .option("--scope [scope]", "The organization or user scope for the project", "")
    .option("--base [path]", "The base path where the project is located", "")
    .option("--repository [repo]", "Repository identifier (owner/repo)", "")
    .option("--changelog-path [path]", "Path to the changelog file", "CHANGELOG.md")
    .option("--verbose", "Enable verbose logging", false)
    .option("--dry-run", "Enable dry run mode", false)
    .option("--bump-strategy [strategy]", "Determine the bumping strategy", validateBumpStrategy, "manual")
    .option("--release-type [type]", "Specify the release type", validateReleaseType, "")
    .option("--pre-release-id [id]", "Specify the pre-release identifier", "")
    .option("--pre-release-base [base]", "Specify the pre-release base version", "0")
    .option("--release-notes [notes]", "Specify the release notes", "")
    .option("--commit-message [message]", "Specify the commit message", "chore(release): release {{name}}@{{version}}")
    .option("--tag-name [name]", "Specify the tag name", "{{name}}@{{version}}")
    .option("--skip-bump", "Skip the version bump in the changelog", false)
    .option("--skip-changelog", "Skip the changelog generation step", false)
    .option("--skip-github-release", "Skip the GitHub release step", false)
    .option("--skip-gitlab-release", "Skip the GitLab release step", true)
    .option("--skip-commit", "Skip the commit step", false)
    .option("--skip-tag", "Skip the tag creation step", false)
    .option("--skip-push", "Skip the push step", false)
    .option("--release-title [title]", "Specify the release title", "{{name}}@{{version}}")
    .option("--release-latest", "Release as latest version", true)
    .option("--release-prerelease", "Release as pre-release version", false)
    .option("--release-draft", "Release as draft version", false)
    .option("--branch [branch]", "Specify the branch to push and release to", "master");

export function validateBumpStrategy(strategy: string): OptionalBumpStrategy {
    const validStrategies: BumpStrategy[] = ["auto", "manual"];

    if (strategy === "" || validStrategies.includes(strategy as BumpStrategy)) {
        return strategy as OptionalBumpStrategy;
    }

    throw new InvalidOptionArgumentError(`Invalid bump strategy: ${strategy} (allowed: auto, manual)`);
}

export function validateReleaseType(type: string): OptionalReleaseType {
    const validTypes: OptionalReleaseType[] = [
        "major",
        "minor",
        "patch",
        "premajor",
        "preminor",
        "prepatch",
        "prerelease"
    ];

    if (type === "" || validTypes.includes(type as OptionalReleaseType)) {
        return type as OptionalReleaseType;
    }

    throw new InvalidOptionArgumentError(
        `Invalid release type: ${type} (allowed: major, minor, patch, premajor, preminor, prepatch, prerelease)`
    );
}
