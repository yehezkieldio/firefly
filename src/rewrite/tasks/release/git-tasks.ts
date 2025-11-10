/**
 * Git operation tasks for release command.
 */

import { okAsync } from "neverthrow";
import { TaskBuilder } from "#/rewrite/task-system/task-builder";
import { GitService } from "#/rewrite/shared/git";
import { logger } from "#/shared/logger";
import type { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";
import type { ReleaseConfig } from "#/rewrite/commands/release/config";
import type { ReleaseData } from "#/rewrite/commands/release/types";

/**
 * Stage changes for commit.
 * Runtime skip: Skipped if skipGit is true or commitChanges is false.
 */
export function createStageChangesTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("stage-changes")
        .description("Stage changes for commit")
        .dependsOn("update-version", "generate-changelog")
        .skipWhen((ctx) => {
            const config = ctx.config as ReleaseConfig;
            return config.skipGit || !config.commitChanges;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const git = new GitService();
            
            // Stage package.json and CHANGELOG.md
            const filesToStage = ["package.json"];
            
            if (ctx.has("changelogGenerated")) {
                filesToStage.push("CHANGELOG.md");
            }

            const result = await git.stageFiles(filesToStage);

            if (result.isErr()) {
                logger.error("Failed to stage files:", result.error.message);
                return result;
            }

            logger.info(`✓ Staged ${filesToStage.length} file(s)`);
            return okAsync(ctx.fork("filesStaged", filesToStage));
        })
        .build();
}

/**
 * Commit changes.
 * Runtime skip: Skipped if skipGit is true or commitChanges is false.
 */
export function createCommitTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("commit-changes")
        .description("Commit changes")
        .dependsOn("stage-changes")
        .skipWhen((ctx) => {
            const config = ctx.config as ReleaseConfig;
            return config.skipGit || !config.commitChanges;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const nextVersion = ctx.data.nextVersion as string;

            if (!nextVersion) {
                logger.error("Next version not found in context");
                return okAsync(ctx);
            }

            const config = ctx.config as ReleaseConfig;
            const commitMessage = config.commitMessage || `chore(release): ${nextVersion}`;

            const git = new GitService();
            const result = await git.commit(commitMessage);

            if (result.isErr()) {
                logger.error("Failed to commit changes:", result.error.message);
                return result;
            }

            const commitSha = result.value;
            logger.info(`✓ Committed changes (${commitSha.substring(0, 7)})`);

            return okAsync(
                ctx.forkMultiple({
                    commitSha,
                    committed: true,
                }),
            );
        })
        .withUndo(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const git = new GitService();
            const result = await git.reset("soft", "HEAD~1");

            if (result.isOk()) {
                logger.warn("⟲ Rolled back commit");
            }

            return okAsync();
        })
        .build();
}

/**
 * Create git tag.
 * Runtime skip: Skipped if skipGit is true or createTag is false.
 */
export function createTagTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("create-tag")
        .description("Create git tag")
        .dependsOn("commit-changes")
        .skipWhen((ctx) => {
            const config = ctx.config as ReleaseConfig;
            return config.skipGit || !config.createTag;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const nextVersion = ctx.data.nextVersion as string;

            if (!nextVersion) {
                logger.error("Next version not found in context");
                return okAsync(ctx);
            }

            const config = ctx.config as ReleaseConfig;
            const tagName = config.tagPrefix ? `${config.tagPrefix}${nextVersion}` : `v${nextVersion}`;
            const tagMessage = config.tagMessage || `Release ${nextVersion}`;

            const git = new GitService();
            const result = await git.createTag(tagName, tagMessage, { annotated: true });

            if (result.isErr()) {
                logger.error("Failed to create tag:", result.error.message);
                return result;
            }

            logger.info(`✓ Created tag: ${tagName}`);
            return okAsync(
                ctx.forkMultiple({
                    tagName,
                    tagCreated: true,
                }),
            );
        })
        .withUndo(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const tagName = ctx.data.tagName as string;

            if (tagName) {
                const git = new GitService();
                const result = await git.deleteTag(tagName);

                if (result.isOk()) {
                    logger.warn(`⟲ Rolled back tag: ${tagName}`);
                }
            }

            return okAsync();
        })
        .build();
}

/**
 * Push commit and tag to remote.
 * Runtime skip: Skipped if skipGit is true or push is false.
 */
export function createPushTask(): Task<ReleaseConfig, ReleaseData> {
    return TaskBuilder.create("push-to-remote")
        .description("Push commit and tag to remote")
        .dependsOn("create-tag")
        .skipWhen((ctx) => {
            const config = ctx.config as ReleaseConfig;
            return config.skipGit || !config.push;
        })
        .execute(async (ctx: WorkflowContext<ReleaseConfig, ReleaseData>) => {
            const config = ctx.config as ReleaseConfig;
            const remoteName = config.remoteName || "origin";
            const branchName = config.branchName || "main";

            const git = new GitService();

            // Push commit
            const pushResult = await git.push(remoteName, branchName);

            if (pushResult.isErr()) {
                logger.error("Failed to push commit:", pushResult.error.message);
                return pushResult;
            }

            logger.info(`✓ Pushed commit to ${remoteName}/${branchName}`);

            // Push tags if tag was created
            if (ctx.has("tagCreated")) {
                const pushTagsResult = await git.push(remoteName, undefined, { tags: true });

                if (pushTagsResult.isErr()) {
                    logger.error("Failed to push tags:", pushTagsResult.error.message);
                    return pushTagsResult;
                }

                logger.info(`✓ Pushed tags to ${remoteName}`);
            }

            return okAsync(ctx.fork("pushed", true));
        })
        .build();
}
