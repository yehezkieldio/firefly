# Firefly Task Module Documentation

## Overview

The Task Module is the execution backbone of Firefly's workflow engine. It provides a declarative, type-safe system for defining, composing, and orchestrating units of work within workflows.

### Key Features

- **Immutable Context Flow**: Tasks receive and produce immutable workflow contexts
- **Dependency Management**: Automatic topological sorting based on declared dependencies
- **Skip Conditions**: Flexible conditional execution with predicate combinators
- **Task Groups**: Logical grouping with shared skip conditions and namespacing
- **Composition Utilities**: Sequential, parallel, conditional, and retry composition
- **Graph Validation**: Cycle detection, missing dependency checks, and execution order computation
- **Type Safety**: Full TypeScript support with generic context types

## Usage Guide

### Creating a Simple Task

```typescript
import { TaskBuilder } from "#/core/task/task.builder";
import { FireflyOkAsync } from "#/core/result/result.constructors";

const validateVersionTask = TaskBuilder.create<MyContext>("validate-version")
  .description("Validates the version format")
  .execute((ctx) => {
    const version = ctx.config.version;
    if (!isValidSemver(version)) {
      return validationErrAsync({ message: `Invalid version: ${version}` });
    }
    return FireflyOkAsync(ctx.fork("versionValidated", true));
  })
  .build();

// Always handle the Result
if (validateVersionTask.isErr()) {
  console.error("Task build failed:", validateVersionTask.error.message);
}
```

### Adding Dependencies

```typescript
const commitTask = TaskBuilder.create("commit-changes")
  .description("Creates a git commit")
  .dependsOn("stage-files")           // Single dependency
  .dependsOnAll("bump-version", "update-changelog")  // Multiple
  .execute((ctx) => {
    // This runs after stage-files, bump-version, and update-changelog
    return ctx.services.git.commit(ctx.data.commitMessage);
  })
  .build();
```

### Skip Conditions

```typescript
import { fromConfig, any, not } from "#/core/task/skip-conditions";

// Simple predicate
const task1 = TaskBuilder.create("publish")
  .description("Publishes the package")
  .skipWhen((ctx) => ctx.config.dryRun)
  .execute(/* ... */)
  .build();

// With reason (shows in logs)
const task2 = TaskBuilder.create("notify")
  .description("Sends notifications")
  .skipWhenWithReason(
    (ctx) => ctx.config.silent,
    "Notifications disabled in silent mode"
  )
  .execute(/* ... */)
  .build();

// Using combinators
const task3 = TaskBuilder.create("deploy")
  .description("Deploys to production")
  .skipWhen(any(
    fromConfig("skipDeploy"),
    (ctx) => ctx.data.buildFailed
  ))
  .execute(/* ... */)
  .build();

// Skip and jump to specific tasks
const task4 = TaskBuilder.create("full-validation")
  .description("Complete validation suite")
  .skipWhenAndJumpTo(
    (ctx) => ctx.config.fastMode,
    ["quick-validation", "finalize"]
  )
  .execute(/* ... */)
  .build();
```

### Undo/Rollback Support

```typescript
const createTagTask = TaskBuilder.create("create-tag")
  .description("Creates a git tag")
  .execute((ctx) => {
    const tag = `v${ctx.data.version}`;
    return ctx.services.git.tag(tag)
      .map(() => ctx.fork("createdTag", tag));
  })
  .withUndo((ctx) => {
    const tag = ctx.data.createdTag;
    if (tag) {
      return ctx.services.git.deleteTag(tag);
    }
    return FireflyOkAsync(undefined);
  })
  .build();
```

### Creating Task Groups

```typescript
import { TaskGroupBuilder, buildTaskGroup } from "#/core/task/task-group.builder";

// Using the builder
const gitGroup = TaskGroupBuilder.create<ReleaseContext>("git")
  .description("Git operations for release")
  .dependsOnGroup("changelog")
  .skipWhen((ctx) => ctx.config.skipGit)
  .skipReason("Git operations disabled")
  .tasks([
    stageChangesTask,
    commitChangesTask,
    createTagTask,
  ])
  .build();

// Using the convenience function
const publishGroup = buildTaskGroup<ReleaseContext>("publish")
  .description("Package publishing")
  .dependsOnGroups("git", "build")
  .tasks([prepareTask, publishTask, notifyTask])
  .build();
```

### Collecting Tasks in Commands

```typescript
import { collectTasks, collectTasksConditionally } from "#/core/task/task.helpers";

// Simple collection
buildTasks(context) {
  return collectTasks(
    () => createPreflightTask(context),
    () => createBumpTask(context),
    () => createChangelogTask(context),
  );
}

// Conditional collection
buildTasks(context) {
  return collectTasksConditionally(
    () => createPreflightTask(context),  // Always included
    [context.config.bump, () => createBumpTask(context)],
    [context.config.changelog, () => createChangelogTask(context)],
    [!context.config.dryRun, () => createPublishTask(context)],
  );
}
```

### Task Composition

```typescript
import {
  composeSequential,
  composeConditional,
  composeParallel,
  withRetry,
  withTimeout,
} from "#/core/task/task.composition";

// Sequential composition
const validationPipeline = composeSequential("validate-all", [
  validateConfigTask,
  validateSchemaTask,
  validatePermissionsTask,
]);

// Conditional branching
const deployTask = composeConditional(
  "deploy",
  (ctx) => ctx.config.environment === "production",
  productionDeployTask,
  stagingDeployTask
);

// Parallel (for side-effects only!)
const notifyAll = composeParallel("notify-all", [
  notifySlackTask,
  notifyEmailTask,
  notifyWebhookTask,
], { failureStrategy: "collect-all" });

// With retry
const reliablePublish = withRetry(publishTask, {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,  // 1s, 2s, 4s
  shouldRetry: (err) => err.code === "NETWORK_ERROR",
});

// With timeout
const timedBuild = withTimeout(buildTask, {
  timeoutMs: 60000,
  message: "Build exceeded 60 second limit",
});
```

### Using Pipeline and RunChecks

```typescript
// Pipeline: chain context-modifying operations
execute: (ctx) => pipeline(ctx,
  (c) => loadConfig(c),
  (c) => validateConfig(c),
  (c) => FireflyOkAsync(c.fork("configLoaded", true)),
)

// RunChecks: chain void operations
execute: (ctx) => runChecks(ctx,
  (c) => checkGitStatus(c),
  (c) => checkPermissions(c),
  (c) => checkDiskSpace(c),
)
```

---

## Best Practices

### 1. Always Handle Results

```typescript
// ✅ Good: Handle the Result
const taskResult = TaskBuilder.create("my-task")
  .description("Does something")
  .execute(/* ... */)
  .build();

if (taskResult.isErr()) {
  // Handle build error
  return taskResult;
}

// ✅ Good: Use Result combinators
return taskResult.andThen((task) => registry.register(task));
```

### 2. Keep Tasks Focused

```typescript
// ❌ Bad: Task does too much
const doEverything = TaskBuilder.create("do-everything")
  .execute((ctx) => {
    // validate, bump, commit, tag, publish...
  });

// ✅ Good: Single responsibility
const validateTask = TaskBuilder.create("validate").execute(/* ... */);
const bumpTask = TaskBuilder.create("bump").dependsOn("validate").execute(/* ... */);
const commitTask = TaskBuilder.create("commit").dependsOn("bump").execute(/* ... */);
```

### 3. Use Descriptive IDs

```typescript
// ❌ Bad: Unclear IDs
"task1", "step-2", "do-thing"

// ✅ Good: Action-oriented IDs
"validate-config", "bump-version", "create-git-tag", "publish-npm"
```

### 4. Declare All Dependencies

```typescript
// ❌ Bad: Implicit ordering assumption
const tasks = [validateTask, bumpTask, commitTask];

// ✅ Good: Explicit dependencies
const bumpTask = TaskBuilder.create("bump")
  .dependsOn("validate")
  .execute(/* ... */);

const commitTask = TaskBuilder.create("commit")
  .dependsOn("bump")
  .execute(/* ... */);
```

### 5. Use Skip Conditions Instead of Early Returns

```typescript
// ❌ Bad: Check inside execute
execute: (ctx) => {
  if (ctx.config.skipThis) {
    return FireflyOkAsync(ctx);  // Confusing: was it skipped or did it succeed?
  }
  // ...
}

// ✅ Good: Use skip condition
.skipWhen((ctx) => ctx.config.skipThis)
.execute((ctx) => {
  // Only runs when not skipped
})
```

### 6. Use Groups for Related Tasks

```typescript
// ✅ Good: Group related tasks
const gitGroup = buildTaskGroup("git")
  .description("Git operations")
  .skipWhen((ctx) => ctx.config.skipGit)
  .tasks([stageTask, commitTask, tagTask])
  .build();

// Tasks become: git:stage, git:commit, git:tag
```

### 7. Provide Undo for Mutating Tasks

```typescript
// ✅ Good: Provide undo for reversible operations
const createFileTask = TaskBuilder.create("create-file")
  .description("Creates output file")
  .execute((ctx) => writeFile(ctx.data.outputPath, ctx.data.content))
  .withUndo((ctx) => deleteFile(ctx.data.outputPath))
  .build();
```

### 8. Use Type-Safe Context

```typescript
// Define your context types
type MyConfig = { version: string; dryRun: boolean };
type MyData = { processedAt?: Date; result?: string };
type MyContext = WorkflowContext<MyConfig, MyData, DefaultServices>;

// Use typed builder
const typedTask = TaskBuilder.create<MyContext>("typed-task")
  .description("Type-safe task")
  .execute((ctx) => {
    // ctx.config.version is typed as string
    // ctx.data.processedAt is typed as Date | undefined
    return FireflyOkAsync(ctx.fork("processedAt", new Date()));
  })
  .build();
```

---

## Cheatsheet

### Task Creation Quick Reference

```typescript
// Minimal task
TaskBuilder.create("id")
  .description("desc")
  .execute((ctx) => FireflyOkAsync(ctx))
  .build();

// Full featured task
TaskBuilder.create<MyContext>("id")
  .description("Human-readable description")
  .dependsOn("other-task")
  .dependsOnAll("task-a", "task-b")
  .skipWhen((ctx) => ctx.config.skip)
  .execute((ctx) => FireflyOkAsync(ctx.fork("key", value)))
  .withUndo((ctx) => FireflyOkAsync(undefined))
  .build();
```

### Skip Condition Combinators

```typescript
import { all, any, not, fromConfig, fromData, always, never } from "#/core/task/skip-conditions";

// Basic
skipWhen((ctx) => ctx.config.skip)          // Simple predicate
skipWhen(fromConfig("skipFeature"))          // Config property
skipWhen(fromData("alreadyDone"))            // Data property

// Combinators
skipWhen(any(pred1, pred2))                  // Skip if ANY is true
skipWhen(all(pred1, pred2))                  // Skip if ALL are true
skipWhen(not(pred))                          // Skip if predicate is false
skipWhen(always(true))                       // Always skip
skipWhen(never())                            // Never skip
```

### Group Builder Quick Reference

```typescript
buildTaskGroup<MyContext>("group-id")
  .description("Group description")
  .dependsOnGroup("other-group")
  .skipWhen((ctx) => ctx.config.skipGroup)
  .skipReason("Reason shown in logs")
  .tasks([task1, task2, task3])
  .build();
```

### Composition Functions

```typescript
// Sequential: A → B → C
composeSequential("pipeline", [taskA, taskB, taskC]);

// Conditional: if/else
composeConditional("branch", condition, thenTask, elseTask);

// Parallel: A, B, C simultaneously (side-effects only!)
composeParallel("parallel", [taskA, taskB, taskC]);

// With retry: max 3 attempts, exponential backoff
withRetry(task, { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 });

// With timeout: fail after 30s
withTimeout(task, { timeoutMs: 30000 });

// With recovery: custom error handling
withRecovery(task, (error, ctx) => {
  if (error.code === "NOT_FOUND") {
    return FireflyOkAsync(ctx.fork("useDefault", true));
  }
  return FireflyErrAsync(error);
});
```

### Helper Functions

```typescript
// Collect task factory results
collectTasks(
  () => createTaskA(),
  () => createTaskB(),
);

// Conditional collection
collectTasksConditionally(
  () => alwaysIncluded(),
  [condition, () => conditionalTask()],
);

// Pipeline context through operations
pipeline(ctx,
  (c) => operation1(c),
  (c) => operation2(c),
);

// Run void checks
runChecks(ctx,
  (c) => check1(c),
  (c) => check2(c),
);
```

### Graph Validation

```typescript
const result = validateTaskGraph(tasks);

if (!result.isValid) {
  console.error("Errors:", result.errors);
  console.warn("Warnings:", result.warnings);
} else {
  console.log("Execution order:", result.executionOrder);
  console.log("Max depth:", Math.max(...result.depthMap.values()));
}

const stats = getGraphStatistics(tasks);
console.log(`Total: ${stats.totalTasks}, Roots: ${stats.rootTasks}, Leaves: ${stats.leafTasks}`);
```

---

## Common Patterns

### Pattern: Validation Task

```typescript
import { createValidationTask } from "#/core/task/task.helpers";

const validateConfig = createValidationTask({
  id: "validate-config",
  description: "Validates release configuration",
  validations: [
    {
      name: "version format",
      validate: (ctx) => {
        if (!isValidSemver(ctx.config.version)) {
          return validationErrAsync({ message: "Invalid semver" });
        }
        return FireflyOkAsync(undefined);
      },
    },
    {
      name: "branch allowed",
      validate: (ctx) => {
        if (!ctx.config.allowedBranches.includes(ctx.data.branch)) {
          return validationErrAsync({ message: "Branch not allowed" });
        }
        return FireflyOkAsync(undefined);
      },
    },
  ],
});
```

### Pattern: Transform Task

```typescript
import { createTransformTask } from "#/core/task/task.helpers";

const computeNextVersion = createTransformTask({
  id: "compute-version",
  description: "Computes the next version number",
  outputKey: "nextVersion",
  transform: (ctx) => {
    const current = ctx.data.currentVersion;
    const bump = ctx.config.bumpType;
    return FireflyOkAsync(incrementVersion(current, bump));
  },
});
```

### Pattern: Side Effect Task

```typescript
import { createSideEffectTask } from "#/core/task/task.helpers";

const logStart = createSideEffectTask({
  id: "log-start",
  description: "Logs workflow start",
  effect: (ctx) => {
    logger.info(`Starting release for ${ctx.config.packageName}`);
    return FireflyOkAsync(undefined);
  },
});
```

### Pattern: Conditional Task Inclusion

```typescript
function buildReleaseTaskGroups(ctx: ReleaseContext): FireflyAsyncResult<TaskGroup[]> {
  return collectTaskGroupsConditionally(
    // Always run validation
    () => createValidationGroup(ctx),

    // Bump only if enabled
    [ctx.config.bump !== false, () => createBumpGroup(ctx)],

    // Changelog only if enabled
    [ctx.config.changelog !== false, () => createChangelogGroup(ctx)],

    // Git only if not skipped
    [!ctx.config.skipGit, () => createGitGroup(ctx)],

    // GitHub release only if configured
    [ctx.config.createRelease, () => createGitHubGroup(ctx)],

    // NPM publish only if not dry run
    [!ctx.config.dryRun, () => createPublishGroup(ctx)],
  );
}
```

### Pattern: Error Recovery Chain

```typescript
const fetchDataWithFallbacks = withRecovery(
  fetchFromPrimaryTask,
  (error, ctx) => {
    logger.warn("Primary fetch failed, trying secondary");
    return fetchFromSecondaryTask.execute(ctx);
  }
);

const ultimateFallback = withRecovery(
  fetchDataWithFallbacks,
  (error, ctx) => {
    logger.warn("All fetches failed, using cached data");
    return FireflyOkAsync(ctx.fork("data", ctx.data.cachedData));
  }
);
```

---

## Advanced Use Cases

### Custom Task Metadata with Symbols

```typescript
import { TaskSymbols, type TaskKind, type TaskPhase } from "#/core/task/task.types";

const annotatedTask = TaskBuilder.create("annotated-task")
  .description("Task with rich metadata")
  .execute(/* ... */)
  .build();

// Add symbol metadata after creation
if (annotatedTask.isOk()) {
  const task = annotatedTask.value;

  // Access via symbols (collision-free)
  const meta = task.meta as Record<symbol, unknown>;
  meta[TaskSymbols.kind] = "mutation" satisfies TaskKind;
  meta[TaskSymbols.phase] = "main" satisfies TaskPhase;
  meta[TaskSymbols.priority] = 10;
  meta[TaskSymbols.tags] = ["git", "vcs"] as const;
}
```

### Cross-Group Dependencies

```typescript
// Define groups with inter-group dependencies
const changelogGroup = buildTaskGroup("changelog")
  .description("Changelog generation")
  .dependsOnGroup("bump")  // Must run after bump group
  .tasks([analyzeCommitsTask, generateChangelogTask])
  .build();

const gitGroup = buildTaskGroup("git")
  .description("Git operations")
  .dependsOnGroups("bump", "changelog")  // After both
  .tasks([stageTask, commitTask, tagTask])
  .build();
```

### Dynamic Task Generation

```typescript
function createMultiPackageTasks(packages: string[]): FireflyAsyncResult<Task[]> {
  const factories = packages.map((pkg) => () =>
    TaskBuilder.create(`publish-${pkg}`)
      .description(`Publishes ${pkg} to npm`)
      .execute((ctx) => publishPackage(pkg, ctx))
      .build()
  );

  return collectTasks(...factories);
}
```

### Task Graph Analysis for Optimization

```typescript
function analyzeWorkflow(tasks: Task[]): void {
  const stats = getGraphStatistics(tasks);

  console.log("=== Workflow Analysis ===");
  console.log(`Total tasks: ${stats.totalTasks}`);
  console.log(`Root tasks (can run first): ${stats.rootTasks}`);
  console.log(`Leaf tasks (final): ${stats.leafTasks}`);
  console.log(`Max depth: ${stats.maxDepth}`);
  console.log(`Avg dependencies: ${stats.avgDependencies.toFixed(2)}`);

  if (stats.mostDependentTasks.length > 0) {
    console.log(`Most dependent tasks: ${stats.mostDependentTasks.join(", ")}`);
  }

  if (stats.mostDependendUponTasks.length > 0) {
    console.log(`Critical path tasks: ${stats.mostDependendUponTasks.join(", ")}`);
  }
}
```

### Memoized Skip Conditions

```typescript
import { memoize, all } from "#/core/task/skip-conditions";

// Expensive check that accesses filesystem
const expensiveCheck = memoize((ctx) => {
  return ctx.services.filesystem.exists(ctx.config.lockFile)
    .map((exists) => !exists)
    .unwrapOr(true);
});

// Use in multiple tasks - computed only once per context
const task1 = TaskBuilder.create("task-1")
  .skipWhen(expensiveCheck)
  .execute(/* ... */);

const task2 = TaskBuilder.create("task-2")
  .skipWhen(all(expensiveCheck, (ctx) => ctx.config.otherCondition))
  .execute(/* ... */);
```

---

## Troubleshooting

### Common Errors

#### "Task must have an execute function"

```typescript
// ❌ Missing execute
TaskBuilder.create("my-task")
  .description("Does something")
  .build();  // Error!

// ✅ Add execute
TaskBuilder.create("my-task")
  .description("Does something")
  .execute((ctx) => FireflyOkAsync(ctx))
  .build();
```

#### "Task must have a description"

```typescript
// ❌ Missing description
TaskBuilder.create("my-task")
  .execute((ctx) => FireflyOkAsync(ctx))
  .build();  // Error!

// ✅ Add description
TaskBuilder.create("my-task")
  .description("Human-readable description")
  .execute((ctx) => FireflyOkAsync(ctx))
  .build();
```

#### "Circular dependency detected"

```typescript
// ❌ Circular: A → B → C → A
const taskA = TaskBuilder.create("A").dependsOn("C");
const taskB = TaskBuilder.create("B").dependsOn("A");
const taskC = TaskBuilder.create("C").dependsOn("B");

// ✅ Fix: Remove cycle or restructure
const taskA = TaskBuilder.create("A");  // No dependency
const taskB = TaskBuilder.create("B").dependsOn("A");
const taskC = TaskBuilder.create("C").dependsOn("B");
```

#### "Task depends on unknown task"

```typescript
// ❌ Reference to non-existent task
const task = TaskBuilder.create("my-task")
  .dependsOn("non-existent-task");  // Error at registration!

// ✅ Ensure dependency exists
const prerequisite = TaskBuilder.create("prerequisite");
const task = TaskBuilder.create("my-task")
  .dependsOn("prerequisite");
```

#### "Group depends on group which is not registered"

```typescript
// ❌ Referencing unregistered group
const gitGroup = buildTaskGroup("git")
  .dependsOnGroup("changelog")  // Error if changelog not registered first!
  .build();

// ✅ Register groups in dependency order
registerGroup(changelogGroup);  // First
registerGroup(gitGroup);         // Then this
```
