# Firefly Tasks

Extracted, reusable task implementations for Firefly commands.

## Directory Structure

```
tasks/
├── shared/           # Tasks shared across commands
│   └── preflight-tasks.ts
├── release/          # Release-specific tasks
│   ├── version-tasks.ts
│   └── git-tasks.ts
├── autocommit/       # Autocommit-specific tasks
├── commit/           # Commit-specific tasks
└── README.md
```

## Shared Tasks

Located in `tasks/shared/`, these tasks are reused across multiple commands:

### Preflight Tasks (`preflight-tasks.ts`)

**createGitRepositoryCheckTask()**
- Verifies current directory is a git repository
- Used by: all commands

**createUncommittedChangesCheckTask(options?)**
- Checks for uncommitted changes
- Options:
  - `allowUncommitted`: Skip check if true
- Used by: release, autocommit

**createRemoteCheckTask(remoteName)**
- Verifies git remote exists
- Used by: release (when pushing)

## Release Tasks

Located in `tasks/release/`, these tasks implement the release workflow:

### Version Tasks (`version-tasks.ts`)

**createInitVersionTask()**
- Loads current version from package.json
- Dependencies: none
- Stores: `currentVersion`

**createCalculateVersionTask()**
- Calculates next version based on bump strategy
- Dependencies: `init-version`
- Skip conditions:
  - Manual strategy with manual version provided
- Supports:
  - **Automatic**: Analyzes conventional commits
  - **Prompt**: Asks user to select version
  - **Manual** (with releaseType): Bumps by type
- Stores: `nextVersion`, `bumpType`, `commits`

**createSetManualVersionTask()**
- Sets manually provided version
- Dependencies: `init-version`
- Skip conditions:
  - Not manual strategy
  - No manual version provided
- Validates version format
- Stores: `nextVersion`

**createUpdateVersionTask()**
- Updates package.json with next version
- Dependencies: `calculate-version`, `set-manual-version`
- Skip conditions:
  - No next version in context
- Rollback: Restores original version
- Stores: `versionUpdated`

### Git Tasks (`git-tasks.ts`)

**createStageChangesTask()**
- Stages package.json and CHANGELOG.md
- Dependencies: `update-version`, `generate-changelog`
- Skip conditions:
  - `skipGit === true`
  - `commitChanges === false`
- Stores: `filesStaged`

**createCommitTask()**
- Commits staged changes
- Dependencies: `stage-changes`
- Skip conditions:
  - `skipGit === true`
  - `commitChanges === false`
- Uses custom commit message if provided
- Rollback: Soft reset to HEAD~1
- Stores: `commitSha`, `committed`

**createTagTask()**
- Creates annotated git tag
- Dependencies: `commit-changes`
- Skip conditions:
  - `skipGit === true`
  - `createTag === false`
- Supports tag prefix and custom message
- Rollback: Deletes created tag
- Stores: `tagName`, `tagCreated`

**createPushTask()**
- Pushes commit and tag to remote
- Dependencies: `create-tag`
- Skip conditions:
  - `skipGit === true`
  - `push === false`
- Pushes to configured remote and branch
- Includes tags if tag was created
- Stores: `pushed`

## Runtime Skip Conditions

Tasks use runtime skip conditions to adapt workflow based on configuration. Examples:

### Release Command

**Manual vs Automatic Version Bumping:**
```
Config: bumpStrategy = "automatic"
Flow: init-version → calculate-version (analyzes commits) → update-version

Config: bumpStrategy = "manual", manualVersion = "2.0.0"
Flow: init-version → set-manual-version → update-version
      (calculate-version is skipped)
```

**Git Operations:**
```
Config: skipGit = true
Flow: Tasks run but git tasks are skipped

Config: skipGit = false, createTag = false
Flow: commit-changes runs, create-tag and push-to-remote skip
```

**Selective Execution:**
```
Config: commitChanges = false, createTag = true
Result: Staging and committing skipped, but tag can't be created (no commit)

Config: generateChangelog = false
Result: Changelog task skipped, fewer files staged
```

## Task Dependencies

Tasks declare dependencies which are resolved by the task registry:

```
init-version
    ↓
    ├→ calculate-version (if auto/prompt)
    │     ↓
    └→ set-manual-version (if manual)
          ↓
      update-version
          ↓
      generate-changelog (optional)
          ↓
      stage-changes (if !skipGit)
          ↓
      commit-changes (if !skipGit && commitChanges)
          ↓
      create-tag (if !skipGit && createTag)
          ↓
      push-to-remote (if !skipGit && push)
```

The task registry automatically orders tasks via topological sort.

## Using Extracted Tasks

Tasks are functions that return `Task` objects. Use them in command implementations:

```typescript
import { createInitVersionTask, createCalculateVersionTask } from "#/rewrite/tasks/release/version-tasks";
import { createCommitTask, createPushTask } from "#/rewrite/tasks/release/git-tasks";

export const releaseCommand = createCommand({
    // ...
    buildTasks(ctx) {
        const tasks = [
            createInitVersionTask(),
            createCalculateVersionTask(),
            // ... more tasks
            createCommitTask(),
            createPushTask(),
        ];

        return okAsync(tasks);
    },
});
```

## Benefits

1. **Reusability**: Tasks can be shared across commands
2. **Testability**: Each task can be tested in isolation
3. **Maintainability**: Business logic centralized in one place
4. **Flexibility**: Runtime skip conditions adapt workflow
5. **Composability**: Mix and match tasks as needed
6. **Rollback**: Built-in undo support for critical operations

## Task Implementation Pattern

All tasks follow this pattern:

```typescript
export function createMyTask(): Task<ConfigType, DataType> {
    return TaskBuilder.create("task-id")
        .description("What this task does")
        .dependsOn("prerequisite-task")  // Optional
        .skipWhen((ctx) => {
            // Runtime skip condition
            return ctx.config.someFlag;
        })
        .execute(async (ctx) => {
            // 1. Get services
            const service = new SomeService();

            // 2. Perform operation
            const result = await service.doSomething();

            // 3. Handle errors
            if (result.isErr()) {
                logger.error("Failed:", result.error.message);
                return result;
            }

            // 4. Log success
            logger.info("✓ Success");

            // 5. Return updated context
            return okAsync(ctx.fork("key", result.value));
        })
        .withUndo(async (ctx) => {
            // Optional: rollback logic
            logger.warn("⟲ Rolling back");
            return okAsync();
        })
        .build();
}
```

## Future Tasks

Tasks to be implemented:

### Release
- [ ] `createChangelogTask()` - Generate changelog with git-cliff
- [ ] `createPlatformReleaseTask()` - Create GitHub/GitLab release

### Autocommit
- [ ] `createAnalyzeDiffTask()` - Get staged diff
- [ ] `createAIGenerateTask()` - Generate commit with AI
- [ ] `createApprovalTask()` - Prompt for approval

### Commit
- [ ] `createSelectTypeTask()` - Prompt for commit type
- [ ] `createInputScopeTask()` - Prompt for scope
- [ ] `createInputSubjectTask()` - Prompt for subject
- [ ] `createInputBodyTask()` - Prompt for body
- [ ] `createValidateCommitTask()` - Validate format
- [ ] `createConfirmCommitTask()` - Confirm before committing

## Testing

Tasks can be tested using the testing utilities:

```typescript
import { createTestContext } from "#/rewrite/testing";
import { createInitVersionTask } from "./version-tasks";

test("init version task", async () => {
    const ctx = createTestContext({
        config: {},
        data: {},
    });

    const task = createInitVersionTask();
    const result = await task.execute(ctx);

    expect(result.isOk()).toBe(true);
    expect(result.value.has("currentVersion")).toBe(true);
});
```

## Related Documentation

- [Task System](../task-system/README.md) - Task architecture
- [Shared Services](../shared/README.md) - Service implementations
- [Commands](../commands/README.md) - Command implementations
