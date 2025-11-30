# Firefly Execution Module Documentation

## Overview

The Execution Module is the runtime engine of Firefly's workflow system. It provides two layers of execution: the `WorkflowExecutor` for low-level task execution with rollback support, and the `WorkflowOrchestrator` for high-level command orchestration including service resolution and lifecycle management.

### Key Features

- **Sequential Task Execution**: Tasks run in topologically sorted order
- **Skip Condition Evaluation**: Conditional task execution with skip-to logic
- **Rollback Support**: Automatic undo of executed tasks on failure
- **Abort Signal Integration**: Native `AbortSignal` support for cancellation
- **Dry-Run Mode**: Execute workflows without making actual changes
- **Execution Timing**: Comprehensive timing and status tracking
- **Service Resolution**: Automatic service instantiation based on command requirements
- **Lifecycle Hooks**: Before, after, and error hooks at command level

## Usage Guide

### Using WorkflowOrchestrator (High-Level)

```typescript
import { WorkflowOrchestrator } from "#/core/execution/workflow.orchestrator";

const orchestrator = new WorkflowOrchestrator({
  basePath: "/path/to/project",
  dryRun: false,
  enableRollback: true,
});

const result = await orchestrator.executeCommand(
  myCommand,
  { input: "./src", output: "./dist" },
  { initialData: "value" }
);

if (result.isOk() && result.value.success) {
  console.log("Workflow completed successfully!");
  console.log(`Executed: ${result.value.executedTasks.join(" → ")}`);
} else if (result.isOk()) {
  console.error(`Failed at: ${result.value.failedTask}`);
  console.error(`Error: ${result.value.error?.message}`);
}
```

### Using WorkflowExecutor (Low-Level)

```typescript
import { WorkflowExecutor } from "#/core/execution/workflow.executor";

const executor = new WorkflowExecutor({
  dryRun: false,
  enableRollback: true,
  timeoutMs: 60000,
});

// Tasks must already be sorted in execution order
const result = await executor.execute(orderedTasks, context);

if (result.isOk()) {
  const execution = result.value;
  console.log(`Success: ${execution.success}`);
  console.log(`Duration: ${execution.executionTimeMs}ms`);
}
```

### Enabling Rollback

```typescript
const orchestrator = new WorkflowOrchestrator({
  enableRollback: true,  // Enable automatic rollback on failure
});

// Tasks with undo functions will be rolled back in reverse order
const task = TaskBuilder.create("create-file")
  .description("Creates output file")
  .execute((ctx) => writeFile(ctx.data.path, ctx.data.content))
  .withUndo((ctx) => deleteFile(ctx.data.path))  // Rollback action
  .build();
```

### Using Abort Signals

```typescript
const controller = new AbortController();

const orchestrator = new WorkflowOrchestrator({
  signal: controller.signal,
});

// Start execution
const execution = orchestrator.executeCommand(command, config);

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

const result = await execution;
if (result.isErr() && result.error.code === "TIMEOUT") {
  console.log("Execution was aborted");
}
```

### Dry-Run Mode

```typescript
const orchestrator = new WorkflowOrchestrator({
  dryRun: true,  // No actual changes made
  basePath: "/project",
});

// Tasks should check for dry-run and skip mutations
const task = TaskBuilder.create("write-file")
  .execute((ctx) => {
    if (ctx.config.dryRun) {
      logger.info("[DRY RUN] Would write file:", ctx.data.path);
      return FireflyOkAsync(ctx);
    }
    return writeFile(ctx.data.path, ctx.data.content)
      .map(() => ctx);
  });
```

---

## Best Practices

### 1. Always Enable Rollback for Mutating Workflows

```typescript
// ❌ Bad: No rollback for workflows that modify files
const orchestrator = new WorkflowOrchestrator({});

// ✅ Good: Enable rollback to recover from partial failures
const orchestrator = new WorkflowOrchestrator({
  enableRollback: true,
});
```

### 2. Implement Undo for Reversible Tasks

```typescript
// ❌ Bad: Mutating task without undo
const createTag = TaskBuilder.create("create-tag")
  .execute((ctx) => ctx.services.git.tag(ctx.data.version));

// ✅ Good: Provide undo for reversible operations
const createTag = TaskBuilder.create("create-tag")
  .execute((ctx) => ctx.services.git.tag(ctx.data.version))
  .withUndo((ctx) => ctx.services.git.deleteTag(ctx.data.version));
```

### 3. Handle Execution Results Properly

```typescript
// ❌ Bad: Only checking isOk()
if (result.isOk()) {
  console.log("Done!");  // But was it successful?
}

// ✅ Good: Check both Result and success status
if (result.isOk()) {
  const execution = result.value;
  if (execution.success) {
    console.log("All tasks completed!");
  } else {
    console.error(`Failed at ${execution.failedTask}`);
    if (execution.rollbackExecuted) {
      console.log("Rollback completed");
    }
  }
} else {
  console.error("Execution error:", result.error.message);
}
```

### 4. Use Timeouts for Long-Running Workflows

```typescript
// ✅ Good: Set reasonable timeout
const orchestrator = new WorkflowOrchestrator({
  timeoutMs: 300000,  // 5 minutes
  signal: controller.signal,
});
```

### 5. Log Execution Progress

```typescript
// Use lifecycle hooks for visibility
const command = createCommand({
  beforeExecute(ctx) {
    logger.info(`Starting workflow for ${ctx.config.project}`);
    return FireflyOkAsync(undefined);
  },

  afterExecute(result, ctx) {
    logger.info(`Completed in ${result.executionTimeMs}ms`);
    logger.info(`Tasks: ${result.executedTasks.length} executed, ${result.skippedTasks.length} skipped`);
    return FireflyOkAsync(undefined);
  },
});
```

---

## Cheatsheet

### Orchestrator Options

```typescript
interface WorkflowOrchestratorOptions {
  dryRun?: boolean;           // Skip mutations, log only
  enableRollback?: boolean;   // Auto-rollback on failure
  signal?: AbortSignal;       // Cancellation signal
  timeoutMs?: number;         // Overall timeout
  verbose?: boolean;          // Verbose logging
  basePath?: string;          // Service instantiation path
}
```

### Executor Options

```typescript
interface WorkflowExecutorOptions {
  dryRun?: boolean;           // Skip mutations, log only
  enableRollback?: boolean;   // Auto-rollback on failure
  signal?: AbortSignal;       // Cancellation signal
  timeoutMs?: number;         // Overall timeout
}
```

### Execution Result

```typescript
interface WorkflowExecutionResult {
  success: boolean;           // All tasks completed?
  executedTasks: string[];    // IDs of executed tasks (in order)
  skippedTasks: string[];     // IDs of skipped tasks
  failedTask?: string;        // ID of failed task (if any)
  error?: FireflyError;       // Error details (if failed)
  rollbackExecuted: boolean;  // Was rollback attempted?
  startTime: Date;            // Execution start
  endTime: Date;              // Execution end
  executionTimeMs: number;    // Total duration
}
```

### Orchestrator Methods

```typescript
// Execute a command
orchestrator.executeCommand(
  command,                    // Command to execute
  config,                     // Command configuration
  initialData?                // Optional initial context data
): FireflyAsyncResult<WorkflowExecutionResult>
```

### Executor Methods

```typescript
// Execute pre-ordered tasks
executor.execute(
  tasks,                      // Tasks in execution order
  context                     // Workflow context
): FireflyAsyncResult<WorkflowExecutionResult>
```

---

## Common Patterns

### Pattern: Command Execution with Full Handling

```typescript
async function runRelease(config: ReleaseConfig): Promise<void> {
  const orchestrator = new WorkflowOrchestrator({
    basePath: process.cwd(),
    enableRollback: true,
  });

  const result = await orchestrator.executeCommand(
    releaseCommand,
    config
  );

  if (result.isErr()) {
    console.error("Execution failed:", result.error.message);
    process.exit(1);
  }

  const execution = result.value;

  if (execution.success) {
    console.log("\n✅ Release completed successfully!");
    console.log(`Duration: ${execution.executionTimeMs}ms`);
    console.log(`Tasks executed: ${execution.executedTasks.join(" → ")}`);
  } else {
    console.error(`\n❌ Release failed at: ${execution.failedTask}`);
    console.error(`Error: ${execution.error?.message}`);

    if (execution.rollbackExecuted) {
      console.log("✓ Rollback completed successfully");
    }

    process.exit(1);
  }
}
```

### Pattern: Cancellable Long-Running Workflow

```typescript
function createCancellableWorkflow() {
  const controller = new AbortController();

  const orchestrator = new WorkflowOrchestrator({
    signal: controller.signal,
    timeoutMs: 600000,  // 10 minutes
    enableRollback: true,
  });

  // Handle SIGINT for graceful cancellation
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, cancelling workflow...");
    controller.abort();
  });

  return {
    execute: (command: Command, config: unknown) =>
      orchestrator.executeCommand(command, config),
    cancel: () => controller.abort(),
  };
}
```

### Pattern: Execution with Progress Callback

```typescript
// Track progress via task execution order
function executeWithProgress(
  tasks: Task[],
  context: WorkflowContext,
  onProgress: (current: number, total: number, taskId: string) => void
): FireflyAsyncResult<WorkflowExecutionResult> {
  const total = tasks.length;
  let current = 0;

  // Wrap each task to report progress
  const wrappedTasks = tasks.map((task) => ({
    ...task,
    execute: (ctx: WorkflowContext) => {
      current++;
      onProgress(current, total, task.meta.id);
      return task.execute(ctx);
    },
  }));

  const executor = new WorkflowExecutor({ enableRollback: true });
  return executor.execute(wrappedTasks, context);
}

// Usage
executeWithProgress(tasks, context, (current, total, id) => {
  console.log(`[${current}/${total}] Executing: ${id}`);
});
```

### Pattern: Conditional Dry-Run

```typescript
const orchestrator = new WorkflowOrchestrator({
  dryRun: config.dryRun,
  basePath: config.projectPath,
  enableRollback: !config.dryRun,  // No rollback needed in dry-run
});

// In command's beforeExecute
beforeExecute(context) {
  if (context.config.dryRun) {
    logger.warn("🔍 Running in DRY RUN mode - no changes will be made");
  }
  return FireflyOkAsync(undefined);
}
```

### Pattern: Retry Failed Workflow

```typescript
async function executeWithRetry(
  orchestrator: WorkflowOrchestrator,
  command: Command,
  config: unknown,
  maxRetries: number = 3
): Promise<WorkflowExecutionResult> {
  let lastResult: WorkflowExecutionResult | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await orchestrator.executeCommand(command, config);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    lastResult = result.value;

    if (lastResult.success) {
      return lastResult;
    }

    if (attempt < maxRetries) {
      logger.warn(`Attempt ${attempt} failed, retrying...`);
      await sleep(1000 * attempt);  // Exponential backoff
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastResult?.error?.message}`);
}
```

---

## Advanced Use Cases

### Custom Execution Flow

```typescript
// For advanced scenarios where you need more control
async function customExecutionFlow(
  command: Command,
  config: unknown,
  options: WorkflowOrchestratorOptions
): Promise<WorkflowExecutionResult> {
  // 1. Create context manually
  const context = ImmutableWorkflowContext.create(
    config,
    resolveServices(command.meta.requiredServices, options.basePath ?? process.cwd())
  );

  // 2. Run beforeExecute
  if (command.beforeExecute) {
    const beforeResult = await command.beforeExecute(context);
    if (beforeResult.isErr()) {
      throw new Error(beforeResult.error.message);
    }
  }

  // 3. Build and validate tasks
  const tasksResult = await command.buildTasks(context);
  if (tasksResult.isErr()) {
    throw new Error(tasksResult.error.message);
  }

  const validation = validateTaskGraph(tasksResult.value);
  if (!validation.isValid) {
    throw new Error(`Invalid task graph: ${validation.errors.join(", ")}`);
  }

  // 4. Register and order tasks
  const registry = new TaskRegistry();
  registry.registerAll(tasksResult.value);
  const orderedResult = registry.buildExecutionOrder();

  if (orderedResult.isErr()) {
    throw new Error(orderedResult.error.message);
  }

  // 5. Execute with custom executor
  const executor = new WorkflowExecutor(options);
  const execResult = await executor.execute(orderedResult.value, context);

  if (execResult.isErr()) {
    throw new Error(execResult.error.message);
  }

  // 6. Run afterExecute or onError
  const execution = execResult.value;

  if (execution.success && command.afterExecute) {
    await command.afterExecute(execution, context);
  } else if (!execution.success && command.onError && execution.error) {
    await command.onError(new Error(execution.error.message), context);
  }

  return execution;
}
```

### Parallel Task Group Execution

```typescript
// Note: Firefly uses sequential execution by default
// This pattern is for advanced parallel execution scenarios

async function executeParallelGroups(
  groups: TaskGroup[],
  context: WorkflowContext
): Promise<WorkflowExecutionResult[]> {
  // Find groups with no dependencies (can run in parallel)
  const rootGroups = groups.filter((g) => !g.dependsOnGroups?.length);

  // Execute root groups in parallel
  const results = await Promise.all(
    rootGroups.map((group) => {
      const executor = new WorkflowExecutor({ enableRollback: true });
      return executor.execute(group.tasks, context);
    })
  );

  // Continue with dependent groups...
  return results.map((r) => r.isOk() ? r.value : null).filter(Boolean);
}
```

### Execution Metrics Collection

```typescript
interface ExecutionMetrics {
  totalDuration: number;
  taskDurations: Map<string, number>;
  avgTaskDuration: number;
  longestTask: { id: string; duration: number };
}

function collectExecutionMetrics(result: WorkflowExecutionResult): ExecutionMetrics {
  // Note: Individual task timing requires task-level instrumentation
  const totalDuration = result.executionTimeMs;
  const taskCount = result.executedTasks.length;

  return {
    totalDuration,
    taskDurations: new Map(),  // Would need task-level timing
    avgTaskDuration: taskCount > 0 ? totalDuration / taskCount : 0,
    longestTask: { id: "unknown", duration: 0 },
  };
}
```

---

## Troubleshooting

### "Workflow execution was aborted"

```typescript
// ❌ Error: AbortSignal triggered
// Cause: signal.abort() was called or timeout reached

// ✅ Solution: Increase timeout or check for cancellation
const orchestrator = new WorkflowOrchestrator({
  timeoutMs: 600000,  // Increase timeout
});

// Or handle cancellation gracefully
if (result.isErr() && result.error.code === "TIMEOUT") {
  console.log("Workflow was cancelled");
}
```

### "Command returned no tasks"

```typescript
// ❌ Error: buildTasks returned empty array
buildTasks(context) {
  return FireflyOkAsync([]);  // Error!
}

// ✅ Solution: Always return at least one task
buildTasks(context) {
  return collectTasks(
    () => createMinimalTask(context),
  );
}
```

### Rollback Not Executing

```typescript
// ❌ Problem: Tasks not rolling back on failure
const orchestrator = new WorkflowOrchestrator({});  // No rollback enabled

// ✅ Solution: Enable rollback
const orchestrator = new WorkflowOrchestrator({
  enableRollback: true,
});

// Also ensure tasks have undo functions
const task = TaskBuilder.create("mutating-task")
  .execute((ctx) => doSomething(ctx))
  .withUndo((ctx) => undoSomething(ctx))  // Required for rollback!
  .build();
```

### Execution Hangs

```typescript
// ❌ Problem: Execution seems to hang indefinitely
// Cause: A task is blocking without timeout

// ✅ Solution: Add timeout to orchestrator
const orchestrator = new WorkflowOrchestrator({
  timeoutMs: 60000,  // 1 minute timeout
});

// Or wrap individual long operations
const task = TaskBuilder.create("long-task")
  .execute((ctx) =>
    withTimeout(longOperation(ctx), {
      timeoutMs: 30000,
      message: "Operation timed out",
    })
  );
```

### Skip Conditions Not Working

```typescript
// ❌ Problem: Task runs when it should be skipped
const task = TaskBuilder.create("skip-me")
  .skipWhen((ctx) => ctx.config.skip)  // Check the condition
  .execute(...);

// Debug: Log the skip condition evaluation
const task = TaskBuilder.create("skip-me")
  .skipWhenWithReason(
    (ctx) => {
      const shouldSkip = ctx.config.skip;
      console.log(`Skip condition evaluated to: ${shouldSkip}`);
      return shouldSkip;
    },
    "Skipping because config.skip is true"
  )
  .execute(...);
```

### Context Not Updated Between Tasks

```typescript
// ❌ Problem: Task B doesn't see data from Task A
const taskA = TaskBuilder.create("task-a")
  .execute((ctx) => {
    ctx.data.value = "new";  // ❌ Mutation doesn't work!
    return FireflyOkAsync(ctx);
  });

// ✅ Solution: Use fork to create new context
const taskA = TaskBuilder.create("task-a")
  .execute((ctx) => {
    return FireflyOkAsync(ctx.fork("value", "new"));  // ✅ Fork creates new context
  });
```

### afterExecute Not Called

```typescript
// ❌ Problem: afterExecute hook never runs
// Cause: Execution failed, only onError is called

// ✅ Solution: Use onError for failure handling
const command = createCommand({
  afterExecute(result, ctx) {
    // Only called on successful completion
    console.log("Success!");
    return FireflyOkAsync(undefined);
  },

  onError(error, ctx) {
    // Called when execution fails
    console.error("Failed:", error.message);
    return FireflyOkAsync(undefined);
  },
});
```
