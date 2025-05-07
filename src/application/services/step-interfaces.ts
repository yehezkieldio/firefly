import type { ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";
import { bumpVersionPipeline, rollbackBumpVersionPipeline } from "#/application/pipelines/bump-version";
import { createCommitPipeline, rollbackCreateCommitPipeline } from "#/application/pipelines/create-commit";
import {
    createHostReleasePipeline,
    rollbackCreateHostReleasePipeline
} from "#/application/pipelines/create-host-release";
import { createVersionTagPipeline, rollbackCreateVersionTagPipeline } from "#/application/pipelines/create-version-tag";
import {
    generateChangelogPipeline,
    rollbackGenerateChangelogPipeline
} from "#/application/pipelines/generate-changelog";
import { promptVersionPipeline } from "#/application/pipelines/prompt-version";
import { pushChangesPipeline } from "#/application/pipelines/push-changes";

interface PipelineStep {
    name: string;
    description: string;
    operation: (context: ArtemisContext) => ResultAsync<ArtemisContext, Error>;
    rollback: ((context: ArtemisContext) => ResultAsync<void, Error>) | null;
    shouldSkip?: (context: ArtemisContext) => boolean;
}

export const pipelineSteps: PipelineStep[] = [
    {
        name: "promptVersion",
        description: "Prompting for the new version",
        operation: promptVersionPipeline,
        rollback: null,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipBump
    },
    {
        name: "bumpVersion",
        description: "Bumping the version in package.json",
        operation: bumpVersionPipeline,
        rollback: rollbackBumpVersionPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipBump
    },
    {
        name: "generateChangelog",
        description: "Generating the changelog",
        operation: generateChangelogPipeline,
        rollback: rollbackGenerateChangelogPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipChangelog
    },
    {
        name: "createCommit",
        description: "Creating the commit",
        operation: createCommitPipeline,
        rollback: rollbackCreateCommitPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipCommit
    },
    {
        name: "createVersionTag",
        description: "Creating the version tag",
        operation: createVersionTagPipeline,
        rollback: rollbackCreateVersionTagPipeline,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipTag
    },
    {
        name: "pushChanges",
        description: "Pushing changes to the remote repository",
        operation: pushChangesPipeline,
        rollback: null,
        shouldSkip: (context: ArtemisContext): boolean => context.options.skipPush
    },
    {
        name: "createHostRelease",
        description: "Creating the release notes for the host",
        operation: createHostReleasePipeline,
        rollback: rollbackCreateHostReleasePipeline,
        shouldSkip: (context: ArtemisContext): boolean =>
            context.options.skipGitHubRelease && context.options.skipGitLabRelease
    }
];
