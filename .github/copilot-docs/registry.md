# Firefly Registry Module Documentation

## Overview

The Registry Module provides a robust system for managing workflow components—commands and tasks—with dependency validation, topological sorting, and type-safe storage. It ensures tasks execute in the correct order based on their declared dependencies.

### Key Features

- **Generic Base Registry**: Reusable Map-based storage with common operations
- **Command Registry**: Type-safe command storage with type erasure support
- **Task Registry**: Dependency validation and execution order computation
- **Task Group Support**: Namespacing, expansion, and inter-group dependencies
- **Topological Sorting**: Kahn's algorithm for dependency-based ordering
- **Graph Validation**: Cycle detection, missing dependency checks
- **Graph Statistics**: Comprehensive analysis of task dependency graphs

## Usage Guide

### Using the Task Registry

```typescript
import { TaskRegistry } from "#/core/registry/task.registry";

const registry = new TaskRegistry();

// Register tasks (order matters - dependencies must be registered first)
const validateResult = registry.register(validateTask);
if (validateResult.isErr()) {
  console.error("Failed to register:", validateResult.error.message);
}

const processResult = registry.register(processTask);  // Can depend on validate
const outputResult = registry.register(outputTask);    // Can depend on process

// Get execution order
const orderResult = registry.buildExecutionOrder();
if (orderResult.isOk()) {
  for (const task of orderResult.value) {
    console.log(`Will execute: ${task.meta.id}`);
  }
}
```

### Registering Multiple Tasks

```typescript
// Register all at once (fail-fast on first error)
const result = registry.registerAll([
  validateTask,
  processTask,
  outputTask,
]);

if (result.isErr()) {
  console.error("Registration failed:", result.error.message);
}
```

### Registering Task Groups

```typescript
import { TaskGroupBuilder } from "#/core/task/task-group.builder";

// Create a task group
const gitGroup = TaskGroupBuilder.create<MyContext>("git")
  .description("Git operations")
  .skipWhen((ctx) => ctx.config.skipGit)
  .tasks([stageTask, commitTask, tagTask])
  .build();

if (gitGroup.isOk()) {
  // Register the group (expands and namespaces tasks)
  const result = registry.registerGroup(gitGroup.value);
  // Creates tasks: git:stage, git:commit, git:tag
}
```

### Using the Command Registry

```typescript
import { CommandRegistry } from "#/core/registry/command.registry";

const registry = new CommandRegistry();

// Register a command
registry.registerCommand(releaseCommand);

// Retrieve by name
const cmdResult = registry.get("release");
if (cmdResult.isOk()) {
  const command = cmdResult.value;
  console.log(`Found: ${command.meta.name}`);
}

// List all commands
const names = registry.getCommandNames();
console.log("Available commands:", names.join(", "));
```

### Iterating Tasks in Execution Order

```typescript
// Use the iterator directly
for (const task of registry) {
  const result = await task.execute(context);
  if (result.isErr()) break;
}

// Or build the array explicitly
const tasksResult = registry.buildExecutionOrder();
if (tasksResult.isOk()) {
  for (const task of tasksResult.value) {
    await task.execute(context);
  }
}
```

---

## Best Practices

### 1. Register Dependencies First

```typescript
// ❌ Bad: Registering dependent task before dependency
registry.register(processTask);  // Depends on "validate"
registry.register(validateTask); // Error! "validate" not found when registering process

// ✅ Good: Register in dependency order
registry.register(validateTask);
registry.register(processTask);  // Now "validate" exists
```

### 2. Use registerAll for Related Tasks

```typescript
// ❌ Bad: Multiple register calls with error checking
const r1 = registry.register(task1);
if (r1.isErr()) return r1;
const r2 = registry.register(task2);
if (r2.isErr()) return r2;

// ✅ Good: Single registerAll call
const result = registry.registerAll([task1, task2, task3]);
if (result.isErr()) {
  // Single error handling point
}
```

### 3. Check for Cycles Early

```typescript
import { validateTaskGraph } from "#/core/task/task.graph";

// ✅ Good: Validate graph before registration
const validation = validateTaskGraph(tasks);
if (!validation.isValid) {
  console.error("Graph errors:", validation.errors);
  return;
}

// Safe to register
registry.registerAll(tasks);
```

### 4. Use Groups for Related Tasks

```typescript
// ❌ Bad: Manual namespace management
const gitStage = TaskBuilder.create("git-stage");
const gitCommit = TaskBuilder.create("git-commit").dependsOn("git-stage");
const gitTag = TaskBuilder.create("git-tag").dependsOn("git-commit");

// ✅ Good: Use task groups
const gitGroup = TaskGroupBuilder.create("git")
  .tasks([stageTask, commitTask, tagTask])
  .build();

registry.registerGroup(gitGroup.value);
// Automatic namespacing: git:stage, git:commit, git:tag
```

### 5. Handle Registration Errors

```typescript
// ❌ Bad: Ignoring errors
registry.register(task);

// ✅ Good: Always handle Result
const result = registry.register(task);
if (result.isErr()) {
  logger.error(`Failed to register ${task.meta.id}: ${result.error.message}`);
  return result;
}
```

---

## Cheatsheet

### Task Registry Methods

```typescript
registry.register(task)                      // Register single task
registry.registerAll([t1, t2, t3])           // Register multiple tasks
registry.registerGroup(group)                // Register task group
registry.registerGroups([g1, g2])            // Register multiple groups
registry.buildExecutionOrder()               // Get topologically sorted tasks
registry.get("task-id")                      // Retrieve task by ID
registry.getAll()                            // Get all registered tasks
registry.getAllKeys()                        // Get all task IDs
registry.has("task-id")                      // Check if task exists
registry.size                                // Number of registered tasks
registry.clear()                             // Remove all tasks
```

### Command Registry Methods

```typescript
registry.registerCommand(command)            // Register typed command
registry.registerCommands([c1, c2])          // Register multiple commands
registry.get("command-name")                 // Retrieve by name
registry.getAll()                            // Get all commands
registry.getCommandNames()                   // Get all command names
registry.has("command-name")                 // Check if command exists
registry.size                                // Number of commands
registry.clear()                             // Remove all commands
```

### Graph Validation

```typescript
import { validateTaskGraph, getGraphStatistics } from "#/core/task/task.graph";

// Validate graph
const result = validateTaskGraph(tasks);
result.isValid                               // boolean
result.errors                                // string[] - critical issues
result.warnings                              // string[] - non-critical issues
result.executionOrder                        // string[] - topological order
result.depthMap                              // Map<string, number> - task depths

// Get statistics
const stats = getGraphStatistics(tasks);
stats.totalTasks                             // number
stats.rootTasks                              // number (no dependencies)
stats.leafTasks                              // number (no dependents)
stats.maxDepth                               // number
stats.totalEdges                             // number
stats.avgDependencies                        // number
stats.mostDependentTasks                     // string[]
stats.mostDependendUponTasks                 // string[]
```

### Group Registration

```typescript
// Single group
registry.registerGroup(group);

// Multiple groups (registers in order)
registry.registerGroups([group1, group2, group3]);

// Check group info
registry.hasGroup("git")                     // boolean
registry.getGroupIds()                       // string[]
registry.getTasksInGroup("git")              // string[]
```

---

## Common Patterns

### Pattern: Build and Register from Command

```typescript
// In workflow orchestrator
function buildAndOrderTasks(command: Command, context: WorkflowContext) {
  return command.buildTasks(context).andThen((tasks) => {
    if (tasks.length === 0) {
      return validationErrAsync({ message: "No tasks returned" });
    }

    const registry = new TaskRegistry();
    const registerResult = registry.registerAll(tasks);

    if (registerResult.isErr()) {
      return FireflyErrAsync(registerResult.error);
    }

    return registry.buildExecutionOrder();
  });
}
```

### Pattern: Group-Based Registration

```typescript
function registerReleaseGroups(
  context: ReleaseContext
): FireflyResult<TaskRegistry> {
  const registry = new TaskRegistry();

  // Create groups
  const groups = [
    createValidationGroup(context),
    createBumpGroup(context),
    createChangelogGroup(context),
    createGitGroup(context),
  ];

  // Register all groups
  for (const groupResult of groups) {
    if (groupResult.isErr()) return groupResult;

    const registerResult = registry.registerGroup(groupResult.value);
    if (registerResult.isErr()) return registerResult;
  }

  return FireflyOk(registry);
}
```

### Pattern: Graph Validation Before Execution

```typescript
function validateAndExecute(tasks: Task[], context: WorkflowContext) {
  // Validate graph structure
  const validation = validateTaskGraph(tasks);

  if (!validation.isValid) {
    logger.error("Task graph has errors:");
    validation.errors.forEach((e) => logger.error(`  - ${e}`));
    return validationErr({ message: "Invalid task graph" });
  }

  if (validation.warnings.length > 0) {
    logger.warn("Task graph warnings:");
    validation.warnings.forEach((w) => logger.warn(`  - ${w}`));
  }

  // Proceed with execution
  const registry = new TaskRegistry();
  registry.registerAll(tasks);
  return executeInOrder(registry, context);
}
```

### Pattern: Dynamic Task Discovery

```typescript
function discoverAndRegisterTasks(
  context: MyContext
): FireflyAsyncResult<TaskRegistry> {
  const registry = new TaskRegistry();
  const taskFactories = getTaskFactoriesForConfig(context.config);

  return collectTasks(...taskFactories).andThen((tasks) => {
    const result = registry.registerAll(tasks);
    if (result.isErr()) return FireflyErrAsync(result.error);
    return FireflyOkAsync(registry);
  });
}
```

### Pattern: Command Registry with Lazy Loading

```typescript
const commandRegistry = new CommandRegistry();

// Register commands lazily
function getCommand(name: string): FireflyResult<Command> {
  if (!commandRegistry.has(name)) {
    // Load and register on first access
    const command = loadCommand(name);
    if (command) {
      commandRegistry.registerCommand(command);
    }
  }

  return commandRegistry.get(name);
}
```

---

## Advanced Use Cases

### Custom Base Registry Implementation

```typescript
import { BaseRegistry, type RegistryConfig } from "#/core/registry/base.registry";

interface Plugin {
  readonly id: string;
  readonly version: string;
  execute(): void;
}

class PluginRegistry extends BaseRegistry<Plugin> {
  constructor() {
    super({
      name: "Plugin",
      source: "PluginRegistry",
      getKey: (plugin) => plugin.id,
      duplicateErrorCode: "CONFLICT",
      notFoundErrorCode: "NOT_FOUND",
    });
  }

  // Add custom methods
  getByVersion(version: string): Plugin[] {
    return this.getAll().filter((p) => p.version === version);
  }
}
```

### Graph Analysis for Optimization

```typescript
import { getGraphStatistics, validateTaskGraph } from "#/core/task/task.graph";

function analyzeWorkflowComplexity(tasks: Task[]): void {
  const stats = getGraphStatistics(tasks);
  const validation = validateTaskGraph(tasks);

  console.log("=== Workflow Complexity Analysis ===");
  console.log(`Total tasks: ${stats.totalTasks}`);
  console.log(`Max depth: ${stats.maxDepth}`);
  console.log(`Parallelizable roots: ${stats.rootTasks}`);
  console.log(`Average dependencies: ${stats.avgDependencies.toFixed(2)}`);

  if (stats.mostDependendUponTasks.length > 0) {
    console.log(`\nCritical path tasks (most depended upon):`);
    stats.mostDependendUponTasks.forEach((t) => console.log(`  - ${t}`));
  }

  // Identify potential bottlenecks
  const depths = validation.depthMap;
  const deepTasks = [...depths.entries()]
    .filter(([_, depth]) => depth > stats.maxDepth * 0.8)
    .map(([id]) => id);

  if (deepTasks.length > 0) {
    console.log(`\nDeep tasks (potential bottlenecks):`);
    deepTasks.forEach((t) => console.log(`  - ${t}`));
  }
}
```

### Inter-Group Dependency Management

```typescript
// Groups can depend on other groups
const bumpGroup = TaskGroupBuilder.create("bump")
  .tasks([computeVersionTask, updateFilesTask])
  .build();

const changelogGroup = TaskGroupBuilder.create("changelog")
  .dependsOnGroup("bump")  // Run after bump group completes
  .tasks([analyzeCommitsTask, generateChangelogTask])
  .build();

const gitGroup = TaskGroupBuilder.create("git")
  .dependsOnGroups("bump", "changelog")  // After both
  .tasks([stageTask, commitTask, tagTask])
  .build();

// Register in order
registry.registerGroup(bumpGroup.value);
registry.registerGroup(changelogGroup.value);
registry.registerGroup(gitGroup.value);

// Execution order:
// bump:compute-version → bump:update-files →
// changelog:analyze-commits → changelog:generate-changelog →
// git:stage → git:commit → git:tag
```

### Registry Snapshot and Restore

```typescript
class RestoredTaskRegistry extends TaskRegistry {
  private snapshots: Map<string, Task[]> = new Map();

  snapshot(name: string): void {
    this.snapshots.set(name, [...this.getAll()]);
  }

  restore(name: string): FireflyResult<void> {
    const tasks = this.snapshots.get(name);
    if (!tasks) {
      return notFoundErr({ message: `Snapshot "${name}" not found` });
    }

    this.clear();
    return this.registerAll(tasks);
  }
}
```

---

## Troubleshooting

### "Task depends on unknown task"

```typescript
// ❌ Error: Dependency not registered yet
const taskB = TaskBuilder.create("task-b")
  .dependsOn("task-a")  // task-a not registered!
  .build();

registry.register(taskB.value);  // Error!

// ✅ Solution: Register dependencies first
registry.register(taskA.value);  // Register task-a first
registry.register(taskB.value);  // Now it works
```

### "Circular dependency detected"

```typescript
// ❌ Error: A → B → C → A
const taskA = TaskBuilder.create("a").dependsOn("c");
const taskB = TaskBuilder.create("b").dependsOn("a");
const taskC = TaskBuilder.create("c").dependsOn("b");

// Use validateTaskGraph to identify the cycle
const validation = validateTaskGraph([taskA, taskB, taskC]);
console.log(validation.errors);
// ["Circular dependency detected: a -> c -> b -> a"]

// ✅ Solution: Remove one dependency to break the cycle
const taskA = TaskBuilder.create("a");  // No dependency on c
const taskB = TaskBuilder.create("b").dependsOn("a");
const taskC = TaskBuilder.create("c").dependsOn("b");
```

### "Duplicate task ID"

```typescript
// ❌ Error: Same ID registered twice
registry.register(taskA);  // id: "validate"
registry.register(taskB);  // id: "validate" - Error!

// ✅ Solution: Use unique IDs
const taskA = TaskBuilder.create("validate-config");
const taskB = TaskBuilder.create("validate-permissions");
```

### "Group depends on unregistered group"

```typescript
// ❌ Error: changelog group not registered
const gitGroup = TaskGroupBuilder.create("git")
  .dependsOnGroup("changelog")  // changelog not registered!
  .build();

registry.registerGroup(gitGroup.value);  // Error!

// ✅ Solution: Register groups in dependency order
registry.registerGroup(changelogGroup.value);  // First
registry.registerGroup(gitGroup.value);        // Then
```

### Empty Execution Order

```typescript
// ❌ Problem: buildExecutionOrder returns empty array
const order = registry.buildExecutionOrder();
console.log(order.value);  // []

// Cause: No tasks registered
console.log(registry.size);  // 0

// ✅ Solution: Register tasks first
registry.registerAll(tasks);
const order = registry.buildExecutionOrder();  // Now populated
```

### Task Not Found After Registration

```typescript
// ❌ Problem: Task seems to disappear
registry.register(myTask);
console.log(registry.has("my-task"));  // false

// Cause: Task ID doesn't match
console.log(myTask.value.meta.id);  // "my-task-v2" (different!)

// ✅ Solution: Use the actual task ID
console.log(registry.has("my-task-v2"));  // true
```
