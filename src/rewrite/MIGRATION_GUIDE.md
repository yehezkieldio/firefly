# Migration Guide: Old to New Architecture

This guide helps migrate from the old Firefly architecture to the rewritten system.

## Overview of Changes

### Architecture Comparison

| Aspect | Old Architecture | New Architecture |
|--------|-----------------|------------------|
| **Commands** | Hardcoded `CommandName` type | Dynamic command registry |
| **Command Registration** | Manual in `commander.ts` | Self-registering plugins |
| **Tasks** | Class-based with complex interface | Simple functions with metadata |
| **Task Dependencies** | Manual `getDependencies()` method | Static metadata declaration |
| **Context** | Mutable state | Immutable with forking |
| **Execution** | Complex strategy pattern | Simple sequential executor |
| **Config Schema** | Centralized provider | Per-command ownership |

## Step-by-Step Migration

### 1. Migrating a Command

#### Old Way (Current)

```typescript
// In config-schema.provider.ts - add schema
const schemas = {
    release: ReleaseConfigSchema,
    mycommand: MyCommandConfigSchema,  // Manual addition
} as const;

// In commander.ts - register manually
export function createCLI(): Command {
    const registry = new CommandRegistry();
    registry.register(
        ConfigSchemaProvider.get("release"), 
        createReleaseWorkflow_sequential
    );
    registry.register(
        ConfigSchemaProvider.get("mycommand"),  // Manual registration
        createMyCommandWorkflow_sequential
    );
    return registry.create(ConfigSchemaProvider.base());
}

// Create workflow factory
export function createMyCommandWorkflow_sequential(): Workflow<"mycommand"> {
    return {
        id: "mycommand-workflow",
        name: "My Command",
        description: "Does something",
        command: "mycommand",
        buildTasks() {
            // Return tasks
        },
    };
}
```

#### New Way (Rewrite)

```typescript
// In commands/my-command.ts - self-contained
import { createCommand } from "#/rewrite/command-registry/command-types";

export const myCommand = createCommand({
    meta: {
        name: "mycommand",
        description: "Does something",
        configSchema: MyCommandConfigSchema,  // Owns schema
        examples: ["firefly mycommand --option value"],
    },
    
    buildTasks(context) {
        // Build and return tasks
        return okAsync([task1, task2, task3]);
    },
});

// To register (in main CLI setup):
const registry = new CommandRegistry();
registry.register(myCommand);  // One line!
```

**Benefits:**
- No manual type updates
- Command owns its schema
- Self-documenting
- Easy to add/remove

### 2. Migrating Tasks

#### Old Way (Current)

```typescript
// Class-based task with complex interface
export class InitializeCurrentVersionTask 
    implements ConditionalTask<ReleaseTaskContext> {
    
    readonly id = "initialize-current-version";
    readonly description = "Loads the current version";

    getDependencies(): string[] {
        return [];
    }

    shouldExecute(): FireflyResult<boolean> {
        return ok(true);
    }

    getSkipThroughTasks(): FireflyResult<string[]> {
        return ok([taskRef(VersionFlowControllerTask)]);
    }

    canUndo(): boolean {
        return false;
    }

    execute(context: ReleaseTaskContext): FireflyAsyncResult<void> {
        const basePath = context.getBasePath();
        // Do work...
        context.set("currentVersion", version);
        return okAsync();
    }
}

// Usage in workflow
const tasks: Task[] = [
    new InitializeCurrentVersionTask(),
    // ...
];
```

#### New Way (Rewrite)

```typescript
// Function-based task with clear metadata
const initializeCurrentVersion = createTask({
    meta: {
        id: "initialize-current-version",
        description: "Loads the current version",
        dependencies: [],  // Clear declaration
    },
    
    shouldSkip(ctx) {
        // Optional: skip logic
        return ok({
            shouldSkip: false,
            skipToTasks: ["next-task"],  // If skipping
        });
    },
    
    execute(ctx) {
        const config = ctx.config as MyConfig;
        const basePath = config.basePath;
        
        // Do work...
        
        // Return new context with updates
        return okAsync(ctx.fork("currentVersion", version));
    },
    
    undo(ctx) {
        // Optional: rollback logic
        return okAsync();
    },
});

// Usage in workflow
return okAsync([
    initializeCurrentVersion,
    // ...
]);
```

**Benefits:**
- Less boilerplate
- Clearer structure
- Dependencies in metadata
- Immutable context updates
- Easier to test

### 3. Migrating Context Usage

#### Old Way (Current)

```typescript
// Mutable context
context.set("currentVersion", "1.0.0");
const version = context.getCurrentVersion();
context.setNextVersion("1.1.0");

// Command-specific context type
type ReleaseTaskContext = TaskContext<ReleaseContextData>;
```

#### New Way (Rewrite)

```typescript
// Immutable context with forking
const newContext = context.fork("currentVersion", "1.0.0");

// Or multiple updates
const newContext = context.forkMultiple({
    currentVersion: "1.0.0",
    nextVersion: "1.1.0",
});

// Generic context type
type MyContext = WorkflowContext<MyConfig, MyData>;

// Access data
const versionResult = context.get("currentVersion");
if (versionResult.isOk()) {
    const version = versionResult.value;
}

// Access config (read-only)
const config = context.config;
```

**Benefits:**
- Immutability prevents bugs
- Clear data flow
- Type-safe access
- Explicit updates

### 4. Migrating Task Dependencies

#### Old Way (Current)

```typescript
export class BumpVersionTask {
    getDependencies(): string[] {
        return [taskRef(ExecuteBumpStrategyTask)];
    }
}

// In workflow, manage order manually
const tasks: Task[] = [
    new InitializeCurrentVersionTask(),
    new VersionFlowControllerTask(),
    new ExecuteBumpStrategyTask(),
    new BumpVersionTask(),  // Depends on ExecuteBumpStrategyTask
];
```

#### New Way (Rewrite)

```typescript
const bumpVersion = createTask({
    meta: {
        id: "bump-version",
        description: "Bump the version",
        dependencies: ["execute-bump-strategy"],  // Static declaration
    },
    execute(ctx) {
        // ...
    },
});

// In workflow, order doesn't matter - registry sorts them
const tasks = [
    bumpVersion,
    executeBumpStrategy,
    initializeVersion,
    // TaskRegistry will order them by dependencies automatically
];

return okAsync(tasks);
```

**Benefits:**
- Dependencies declared upfront
- No manual ordering needed
- Circular dependency detection
- Clear task relationships

### 5. Migrating Conditional Tasks

#### Old Way (Current)

```typescript
export class VersionFlowControllerTask 
    implements ConditionalTask<ReleaseTaskContext> {
    
    shouldExecute(): FireflyResult<boolean> {
        return ok(true);  // Always execute
    }

    getNextTasks(context: ReleaseTaskContext): FireflyResult<string[]> {
        const config = context.getConfig();
        const nextTasks: string[] = [];

        if (config.releaseType !== undefined) {
            nextTasks.push(taskRef(StraightBumpTask));
        } else if (!config.bumpStrategy) {
            nextTasks.push(taskRef(PromptBumpStrategyTask));
        }

        return ok(nextTasks);
    }

    execute(): FireflyAsyncResult<void> {
        return okAsync();  // Controller does nothing
    }
}
```

#### New Way (Rewrite)

```typescript
// Skip logic directly in tasks
const straightBump = createTask({
    meta: {
        id: "straight-bump",
        description: "Straight version bump",
    },
    
    shouldSkip(ctx) {
        const config = ctx.config as ReleaseConfig;
        return ok({
            shouldSkip: config.releaseType === undefined,
            reason: "No release type specified",
        });
    },
    
    execute(ctx) {
        // Do the bump
        return okAsync(ctx);
    },
});

const promptBumpStrategy = createTask({
    meta: {
        id: "prompt-bump-strategy",
        description: "Prompt for bump strategy",
    },
    
    shouldSkip(ctx) {
        const config = ctx.config as ReleaseConfig;
        return ok({
            shouldSkip: config.bumpStrategy !== undefined,
            reason: "Bump strategy already provided",
        });
    },
    
    execute(ctx) {
        // Prompt user
        return okAsync(ctx);
    },
});

// No controller task needed - logic is in the tasks themselves
```

**Benefits:**
- Logic colocated with tasks
- No dummy controller tasks
- Clearer conditions
- Simpler to understand

### 6. Migrating Workflow Execution

#### Old Way (Current)

```typescript
// In WorkflowExecutorService
const workflow = workflowFactory();
const orchestratorOptions: OrchestratorOptions = {
    name: workflow.name,
    dryRun: options.dryRun ?? false,
    executionId: context.executionId,
    rollbackStrategy: options.rollbackStrategy ?? "reverse",
};

const orchestratorResult = TaskOrchestratorService.fromWorkflow(
    workflow, 
    context, 
    orchestratorOptions
);

const orchestrator = orchestratorResult.value;
const result = await orchestrator.run();
```

#### New Way (Rewrite)

```typescript
// Simple orchestrator
const orchestrator = new WorkflowOrchestrator({
    dryRun: false,
    enableRollback: true,
    verbose: true,
});

const result = await orchestrator.executeCommand(
    myCommand,
    config,
    initialData
);
```

**Benefits:**
- Simpler API
- Less configuration
- Clear options
- Easy to use

## Common Patterns

### Pattern 1: Task with Validation

#### Old

```typescript
export class MyTask implements Task {
    validate(context: TaskContext): FireflyResult<void> {
        // Validation logic
        return ok();
    }
    
    execute(context: TaskContext): FireflyAsyncResult<void> {
        // Execution logic
        return okAsync();
    }
}
```

#### New

```typescript
const myTask = createTask({
    meta: { id: "my-task", description: "..." },
    
    execute(ctx) {
        // Inline validation
        if (!isValid(ctx.config)) {
            return errAsync(createFireflyError({
                code: "VALIDATION",
                message: "Invalid config",
                source: "my-task",
            }));
        }
        
        // Execution logic
        return okAsync(ctx);
    },
});
```

### Pattern 2: Task with Rollback

#### Old

```typescript
export class MyTask implements Task {
    execute(context: TaskContext): FireflyAsyncResult<void> {
        // Do something
        return okAsync();
    }
    
    canUndo(): boolean {
        return true;
    }
    
    undo(context: TaskContext): FireflyAsyncResult<void> {
        // Undo logic
        return okAsync();
    }
}
```

#### New

```typescript
const myTask = createTask({
    meta: { id: "my-task", description: "..." },
    
    execute(ctx) {
        // Do something
        return okAsync(ctx);
    },
    
    undo(ctx) {
        // Undo logic
        return okAsync();
    },
});
```

### Pattern 3: Task Chain

#### Old

```typescript
// Define dependency chain via getDependencies
export class Task1 {
    getDependencies(): string[] {
        return [];
    }
}

export class Task2 {
    getDependencies(): string[] {
        return ["task1"];
    }
}

export class Task3 {
    getDependencies(): string[] {
        return ["task2"];
    }
}
```

#### New

```typescript
// Declare dependencies in metadata
const task1 = createTask({
    meta: { id: "task1", description: "...", dependencies: [] },
    execute: (ctx) => okAsync(ctx),
});

const task2 = createTask({
    meta: { id: "task2", description: "...", dependencies: ["task1"] },
    execute: (ctx) => okAsync(ctx),
});

const task3 = createTask({
    meta: { id: "task3", description: "...", dependencies: ["task2"] },
    execute: (ctx) => okAsync(ctx),
});

// Registry automatically orders: task1 -> task2 -> task3
```

## Testing

### Old Way

```typescript
// Test task class
describe("InitializeCurrentVersionTask", () => {
    it("should load version", async () => {
        const task = new InitializeCurrentVersionTask();
        const context = createMockContext();
        
        const result = await task.execute(context);
        
        expect(result.isOk()).toBe(true);
        expect(context.get("currentVersion")).toBe("1.0.0");
    });
});
```

### New Way

```typescript
// Test task function
describe("initializeCurrentVersion", () => {
    it("should load version", async () => {
        const context = ImmutableWorkflowContext.create(config, {});
        
        const result = await initializeCurrentVersion.execute(context);
        
        expect(result.isOk()).toBe(true);
        const newContext = result.value;
        const version = newContext.get("currentVersion");
        expect(version.isOk() && version.value).toBe("1.0.0");
    });
});
```

## Best Practices

### Do's

✅ Keep tasks small and focused
✅ Declare dependencies in metadata
✅ Use immutable context forking
✅ Add descriptive task metadata
✅ Test tasks in isolation
✅ Use skip conditions for flow control
✅ Leverage schema validation per command

### Don'ts

❌ Don't mutate context directly
❌ Don't create controller tasks (use skip logic)
❌ Don't manually order tasks (use dependencies)
❌ Don't mix config and runtime data
❌ Don't create classes when functions suffice
❌ Don't hardcode command names

## Gradual Migration Strategy

1. **Phase 1: Understand New Architecture**
   - Read `README.md` in `src/rewrite/`
   - Run demo: `bun src/rewrite/examples/demo-runner.ts`
   - Study demo command implementation

2. **Phase 2: Create New Command**
   - Pick a simple, new feature to implement
   - Build it using new architecture
   - Validate it works as expected

3. **Phase 3: Migrate Existing Command**
   - Start with smallest command
   - Convert tasks to function-based
   - Convert context usage to immutable
   - Test thoroughly

4. **Phase 4: Update CLI Integration**
   - Replace old command registry
   - Wire up new commands
   - Test all commands work

5. **Phase 5: Remove Old Code**
   - Delete old architecture files
   - Update tests
   - Update documentation

## Need Help?

- Check `src/rewrite/examples/demo-command.ts` for reference
- See `src/rewrite/README.md` for architecture overview
- Compare old vs new patterns in this guide
