# Firefly Command Module Documentation

## Overview

The Command Module defines the abstraction layer for workflow operations in Firefly. Commands are the top-level units of work that orchestrate tasks, manage lifecycle hooks, and declare service dependencies.

### Key Features

- **Declarative Definition**: Commands define metadata, config schema, and required services
- **Type-Safe Factory**: `createCommand()` provides full type inference
- **Lifecycle Hooks**: `beforeExecute`, `afterExecute`, and `onError` hooks
- **Service Declaration**: Explicit service requirements via `requiredServices`
- **Task Generation**: Dynamic task building based on configuration
- **Config Validation**: Zod schema validation for command configuration
- **Registry Support**: Type erasure for heterogeneous command storage

## Usage Guide

### Creating a Basic Command

```typescript
import { createCommand } from "#/core/command/command.factory";
import { defineServiceKeys } from "#/core/service/service.registry";
import { z } from "zod";

// Define configuration schema
const MyConfigSchema = z.object({
  input: z.string(),
  output: z.string(),
  verbose: z.boolean().default(false),
});

type MyConfig = z.infer<typeof MyConfigSchema>;

// Define required services
const MY_SERVICES = defineServiceKeys("fs");

// Create the command
export const myCommand = createCommand<MyConfig, MyData, typeof MY_SERVICES>({
  meta: {
    name: "my-command",
    description: "Does something useful",
    configSchema: MyConfigSchema,
    requiredServices: MY_SERVICES,
  },
  buildTasks(context) {
    return collectTasks(
      () => createValidateTask(context),
      () => createProcessTask(context),
      () => createOutputTask(context),
    );
  },
});
```

### Adding Lifecycle Hooks

```typescript
export const myCommand = createCommand<MyConfig, MyData, typeof MY_SERVICES>({
  meta: {
    name: "my-command",
    description: "Command with lifecycle hooks",
    configSchema: MyConfigSchema,
    requiredServices: MY_SERVICES,
  },

  // Called before task execution begins
  beforeExecute(context) {
    logger.info(`Starting ${context.config.input} processing`);
    return FireflyOkAsync(undefined);
  },

  // Dynamic task generation
  buildTasks(context) {
    return collectTasks(
      () => createProcessTask(context),
    );
  },

  // Called after all tasks complete successfully
  afterExecute(result, context) {
    logger.info(`Completed in ${result.executionTimeMs}ms`);
    logger.info(`Executed: ${result.executedTasks.join(", ")}`);
    return FireflyOkAsync(undefined);
  },

  // Called when execution fails
  onError(error, context) {
    logger.error(`Failed: ${error.message}`);
    // Perform cleanup if needed
    return FireflyOkAsync(undefined);
  },
});
```

### Defining Command Data Types

```typescript
// Define the data that accumulates during workflow execution
type MyData = {
  // Data populated by tasks
  validatedAt?: Date;
  processedFiles?: string[];
  outputPath?: string;
  summary?: ProcessingSummary;
};

// Tasks will fork context to add this data
execute: (ctx) => {
  return FireflyOkAsync(ctx.forkMultiple({
    validatedAt: new Date(),
    processedFiles: files,
  }));
}
```

### Declaring Service Dependencies

```typescript
import { defineServiceKeys } from "#/core/service/service.registry";

// Available services: "fs", "git", "packageJson"
const SERVICES = defineServiceKeys("fs", "git");

// Services are type-safe in buildTasks
buildTasks(context) {
  const fs = context.services.fs;   // IFileSystemService
  const git = context.services.git; // IGitService

  // ...
}
```

---

## Best Practices

### 1. Use Zod for Config Validation

```typescript
// ❌ Bad: No validation
type Config = { input: string };

// ✅ Good: Zod schema with defaults and validation
const ConfigSchema = z.object({
  input: z.string().min(1, "Input path required"),
  output: z.string().default("./output"),
  maxFiles: z.number().positive().default(100),
  dryRun: z.boolean().default(false),
});
```

### 2. Keep Commands Focused

```typescript
// ❌ Bad: Command does too many unrelated things
const megaCommand = createCommand({
  meta: { name: "do-everything" },
  buildTasks(ctx) {
    // lint, test, build, deploy, notify, cleanup...
  },
});

// ✅ Good: Single-purpose commands
const buildCommand = createCommand({ meta: { name: "build" } });
const deployCommand = createCommand({ meta: { name: "deploy" } });
const notifyCommand = createCommand({ meta: { name: "notify" } });
```

### 3. Declare All Required Services

```typescript
// ❌ Bad: Using service not declared
const command = createCommand({
  meta: {
    requiredServices: defineServiceKeys("fs"),
  },
  buildTasks(ctx) {
    ctx.services.git.commit(...);  // Error: git not declared!
  },
});

// ✅ Good: Declare all services used
const command = createCommand({
  meta: {
    requiredServices: defineServiceKeys("fs", "git"),
  },
  buildTasks(ctx) {
    ctx.services.git.commit(...);  // Works!
  },
});
```

### 4. Use Lifecycle Hooks Appropriately

```typescript
// ✅ Good: beforeExecute for validation/setup
beforeExecute(context) {
  if (!context.config.inputPath) {
    return validationErrAsync({ message: "Input path required" });
  }
  return FireflyOkAsync(undefined);
}

// ✅ Good: afterExecute for reporting/cleanup
afterExecute(result, context) {
  logExecutionSummary(result);
  return FireflyOkAsync(undefined);
}

// ✅ Good: onError for cleanup on failure
onError(error, context) {
  cleanupPartialOutput(context.data.outputPath);
  return FireflyOkAsync(undefined);
}
```

### 5. Handle Errors in buildTasks

```typescript
buildTasks(context) {
  // ✅ Good: Proper error handling
  const tasksResult = createTasksFromConfig(context.config);

  if (tasksResult.isErr()) {
    return FireflyErrAsync(tasksResult.error);
  }

  return FireflyOkAsync(tasksResult.value);
}
```

---

## Cheatsheet

### Command Structure

```typescript
createCommand<TConfig, TData, TServices>({
  meta: {
    name: "command-name",                    // Unique identifier
    description: "What the command does",    // Human-readable
    configSchema: ZodSchema,                 // Zod validation schema
    requiredServices: defineServiceKeys(...), // Service dependencies
    examples?: ["example usage"],            // Optional examples
  },

  beforeExecute?(context) { ... },           // Pre-execution hook
  buildTasks(context) { ... },               // Task generation (required)
  afterExecute?(result, context) { ... },    // Post-execution hook
  onError?(error, context) { ... },          // Error handling hook
});
```

### Service Keys

```typescript
// Available service keys
defineServiceKeys("fs")                      // File system
defineServiceKeys("git")                     // Git operations
defineServiceKeys("packageJson")             // package.json management
defineServiceKeys("fs", "git")               // Multiple services
```

### Context Types

```typescript
// Config: Command configuration (from CLI/config file)
context.config.inputPath

// Data: Accumulated workflow data (from task execution)
context.data.processedFiles

// Services: Resolved service implementations
context.services.fs.readFile(...)
context.services.git.commit(...)
```

### Lifecycle Hook Signatures

```typescript
// beforeExecute
beforeExecute(context: CommandContext<Config, Data, Services>): FireflyAsyncResult<void>

// buildTasks
buildTasks(context: CommandContext<Config, Data, Services>): FireflyAsyncResult<Task[]>

// afterExecute
afterExecute(result: WorkflowExecutionResult, context: CommandContext<...>): FireflyAsyncResult<void>

// onError
onError(error: Error, context: CommandContext<...>): FireflyAsyncResult<void>
```

---

## Common Patterns

### Pattern: Conditional Task Building

```typescript
buildTasks(context) {
  return collectTasksConditionally(
    // Always include validation
    () => createValidateTask(context),

    // Include bump task if enabled
    [context.config.bump !== false, () => createBumpTask(context)],

    // Include changelog if enabled
    [context.config.changelog, () => createChangelogTask(context)],

    // Skip publish in dry-run mode
    [!context.config.dryRun, () => createPublishTask(context)],
  );
}
```

### Pattern: Task Groups in Commands

```typescript
buildTasks(context) {
  const groupsResult = createTaskGroups(context);

  if (groupsResult.isErr()) {
    return FireflyErrAsync(groupsResult.error);
  }

  // Flatten groups into tasks
  const tasks = groupsResult.value.flatMap((group) => group.tasks);
  return FireflyOkAsync(tasks);
}

function createTaskGroups(context: MyContext): FireflyResult<TaskGroup[]> {
  return collectTaskGroups(
    () => createValidationGroup(context),
    () => createProcessingGroup(context),
    () => createOutputGroup(context),
  );
}
```

### Pattern: Config-Driven Task Selection

```typescript
buildTasks(context) {
  const tasks: (() => FireflyResult<Task>)[] = [];

  // Always run setup
  tasks.push(() => createSetupTask(context));

  // Add tasks based on config
  if (context.config.lint) {
    tasks.push(() => createLintTask(context));
  }

  if (context.config.test) {
    tasks.push(() => createTestTask(context));
  }

  if (context.config.build) {
    tasks.push(() => createBuildTask(context));
  }

  // Always run cleanup
  tasks.push(() => createCleanupTask(context));

  return collectTasks(...tasks);
}
```

### Pattern: Validation in beforeExecute

```typescript
beforeExecute(context) {
  // Validate environment
  if (!process.env.API_KEY) {
    return validationErrAsync({
      message: "API_KEY environment variable is required",
      source: "MyCommand.beforeExecute",
    });
  }

  // Validate config combinations
  if (context.config.production && context.config.dryRun) {
    return validationErrAsync({
      message: "Cannot use dry-run mode in production",
      source: "MyCommand.beforeExecute",
    });
  }

  return FireflyOkAsync(undefined);
}
```

### Pattern: Summary Reporting in afterExecute

```typescript
afterExecute(result, context) {
  console.log("\n📊 Execution Summary");
  console.log("─".repeat(40));
  console.log(`Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
  console.log(`Duration: ${result.executionTimeMs}ms`);
  console.log(`Tasks executed: ${result.executedTasks.length}`);
  console.log(`Tasks skipped: ${result.skippedTasks.length}`);

  if (result.executedTasks.length > 0) {
    console.log(`\nExecuted: ${result.executedTasks.join(" → ")}`);
  }

  if (result.skippedTasks.length > 0) {
    console.log(`Skipped: ${result.skippedTasks.join(", ")}`);
  }

  return FireflyOkAsync(undefined);
}
```

---

## Advanced Use Cases

### Type Erasure for Registry Storage

```typescript
import { eraseCommandType, recoverCommandType } from "#/core/command/command.types";
import type { BrandedCommand } from "#/core/command/command.types";

// Store heterogeneous commands in a Map
const commands = new Map<string, BrandedCommand>();

// Erase type for storage
const branded = eraseCommandType(myTypedCommand);
commands.set(branded.meta.name, branded);

// Recover type when retrieving (caller must know the correct types)
const recovered = recoverCommandType<MyConfig, MyData, MyServices>(branded);
```

### Command with Complex Service Dependencies

```typescript
// Define extended services if needed
type ExtendedServices = ResolvedServices<["fs", "git", "packageJson"]> & {
  cache?: ICacheService;
};

const advancedCommand = createCommand<Config, Data, ["fs", "git", "packageJson"]>({
  meta: {
    requiredServices: defineServiceKeys("fs", "git", "packageJson"),
  },
  buildTasks(context) {
    // Use all three services
    const { fs, git, packageJson } = context.services;
    // ...
  },
});
```

### Dynamic Command Configuration

```typescript
// Factory function to create configured commands
function createConfiguredCommand(defaults: Partial<MyConfig>) {
  const mergedSchema = MyConfigSchema.default(defaults);

  return createCommand<MyConfig, MyData, typeof MY_SERVICES>({
    meta: {
      name: `my-command-${defaults.mode ?? "default"}`,
      description: `My command in ${defaults.mode} mode`,
      configSchema: mergedSchema,
      requiredServices: MY_SERVICES,
    },
    buildTasks(context) {
      // Tasks configured based on merged config
      return buildTasksForMode(context.config.mode, context);
    },
  });
}

// Create variants
const devCommand = createConfiguredCommand({ mode: "development", verbose: true });
const prodCommand = createConfiguredCommand({ mode: "production", verbose: false });
```

---

## Troubleshooting

### "Command returned no tasks"

```typescript
// ❌ Error: buildTasks returns empty array
buildTasks(context) {
  return FireflyOkAsync([]);  // Error in orchestrator!
}

// ✅ Solution: Always return at least one task
buildTasks(context) {
  return collectTasks(
    () => createNoOpTask(),  // Even a no-op if needed
  );
}
```

### Type Mismatch in Services

```typescript
// ❌ Error: Type mismatch between declared and used services
const command = createCommand<Config, Data, readonly ["fs"]>({
  meta: {
    requiredServices: defineServiceKeys("fs"),
  },
  buildTasks(ctx) {
    ctx.services.git;  // Type error: 'git' not in services
  },
});

// ✅ Solution: Declare all services used
meta: {
  requiredServices: defineServiceKeys("fs", "git"),
}
```

### Lifecycle Hook Not Called

```typescript
// Problem: afterExecute not being called
// Cause: Usually because execution failed

// ✅ Solution: Check for errors, use onError for failure cases
afterExecute(result, context) {
  // Only called on success
  if (!result.success) return FireflyOkAsync(undefined);
  // ...
}

onError(error, context) {
  // Called on failure
  logger.error("Execution failed", error);
  return FireflyOkAsync(undefined);
}
```

### Config Validation Failing

```typescript
// ❌ Error: Config doesn't match schema
const config = { input: "" };  // Empty string fails min(1) validation

// ✅ Solution: Ensure config matches schema requirements
const ConfigSchema = z.object({
  input: z.string().min(1, "Input is required"),
  output: z.string().default("./output"),  // Use defaults for optional
});

// Provide valid config
const config = { input: "/path/to/input" };
```

### Command Not Found in Registry

```typescript
// ❌ Error: Command not registered
const cmd = registry.get("my-command");  // Returns error

// ✅ Solution: Register before retrieving
registry.registerCommand(myCommand);
const cmd = registry.get("my-command");  // Works!
```
