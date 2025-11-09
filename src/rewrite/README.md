# Firefly Rewrite - New Architecture

This directory contains the rewritten Firefly architecture addressing the limitations of the current system.

## Overview

The rewrite focuses on four core pillars:

1. **Plugin-Based Command System** - Commands as independent, self-registering plugins
2. **Simplified Task System** - Functions over classes, clear lifecycle, registry-based
3. **Immutable Context System** - Type-safe, immutable context with forking
4. **Simplified Execution Engine** - Sequential execution with predictable behavior

## Architecture

### Directory Structure

```
src/rewrite/
├── command-registry/     # Command plugin system
│   ├── command-types.ts      # Command interfaces
│   └── command-registry.ts   # Command registry
├── context/              # Immutable context system
│   └── workflow-context.ts   # Context implementation
├── task-system/          # Task registry and types
│   ├── task-types.ts         # Task interfaces
│   └── task-registry.ts      # Task registry
├── execution/            # Workflow execution
│   ├── workflow-executor.ts      # Sequential executor
│   └── workflow-orchestrator.ts  # High-level orchestrator
├── examples/             # Example implementations
│   └── demo-command.ts       # Demo command
└── README.md             # This file
```

## Core Concepts

### 1. Plugin-Based Commands

Commands are self-contained plugins that register themselves:

```typescript
export const myCommand = createCommand<MyConfig, MyData>({
    meta: {
        name: "my-command",
        description: "My awesome command",
        configSchema: MyConfigSchema,
        examples: ["firefly my-command --option value"],
    },
    
    buildTasks(context) {
        // Return tasks in execution order
        return okAsync([task1, task2, task3]);
    },
    
    beforeExecute(context) {
        // Optional setup hook
        return okAsync();
    },
    
    afterExecute(result, context) {
        // Optional cleanup hook
        return okAsync();
    },
});

// Register command
const registry = new CommandRegistry();
registry.register(myCommand);
```

**Benefits:**
- No hardcoded command names
- Each command owns its schema
- Easy to add new commands
- Self-documenting with metadata

### 2. Simplified Tasks

Tasks are functions with metadata, not classes:

```typescript
const myTask = createTask<MyConfig, MyData>({
    meta: {
        id: "my-task",
        description: "Does something useful",
        dependencies: ["prerequisite-task"],
    },
    
    shouldSkip(context) {
        // Optional: conditional execution
        return ok({
            shouldSkip: context.config.skipThis,
            reason: "Skipped by configuration",
            skipToTasks: ["next-task"],
        });
    },
    
    execute(context) {
        // Do work, return updated context
        const newData = doWork();
        return okAsync(context.fork("resultKey", newData));
    },
    
    undo(context) {
        // Optional: rollback on failure
        return okAsync();
    },
});
```

**Benefits:**
- Simpler than classes - less boilerplate
- Clear metadata at top
- Self-contained with dependencies
- Registry enables discovery
- Easy to test in isolation

### 3. Immutable Context

Context is immutable and forked for updates:

```typescript
// Create context
const context = ImmutableWorkflowContext.create(config, initialData);

// Read data
const valueResult = context.get("someKey");
if (valueResult.isOk()) {
    const value = valueResult.value;
}

// Update data (creates new context)
const newContext = context.fork("someKey", newValue);

// Multiple updates
const newContext = context.forkMultiple({
    key1: value1,
    key2: value2,
});

// Snapshot current state
const snapshot = context.snapshot();
```

**Benefits:**
- Immutability prevents accidental mutations
- Clear separation of config vs runtime data
- Type-safe access
- Easy to track state changes
- Predictable behavior

### 4. Sequential Execution

Simple, predictable execution flow:

```typescript
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

if (result.isOk()) {
    const executionResult = result.value;
    console.log(`Success! Executed ${executionResult.executedTasks.length} tasks`);
}
```

**Execution flow:**
1. Create immutable context
2. Build tasks from command
3. Register tasks in registry
4. Build execution order (topological sort)
5. Execute tasks sequentially
6. Check skip conditions before each task
7. Fork context with updates
8. Rollback on failure (if enabled)

**Benefits:**
- No parallel execution complexity
- Clear execution semantics
- Predictable behavior
- Easy to debug
- Rollback support maintained

## Task Lifecycle

```
1. Registration
   - Task added to registry
   - Dependencies validated
   - Circular dependencies detected

2. Execution Order
   - Topological sort by dependencies
   - Tasks ordered automatically

3. Per-Task Execution
   - shouldSkip() called
   - If skip: check skipToTasks
   - If execute: execute() called
   - Context forked with updates
   - Task added to rollback stack

4. On Failure (optional)
   - Rollback in reverse order
   - undo() called on each task
   - Continue rollback on error
```

## Task Skip Logic

Tasks can skip conditionally and control flow:

```typescript
shouldSkip(context) {
    return ok({
        shouldSkip: someCondition,
        reason: "Why we're skipping",
        skipToTasks: ["task-to-jump-to"],  // Optional: skip ahead
    });
}
```

**Skip behavior:**
- If `skipToTasks` provided: execution jumps to those tasks
- If not provided: continues with next task in order
- Skipped tasks tracked in results

## Comparison with Old Architecture

### Old Architecture Issues

1. **Single Command Focus**
   - Hardcoded `CommandName` type
   - Manual command registration
   - Rigid command-specific context

2. **Complex Task System**
   - Heavy class-based tasks
   - Manual dependency wiring
   - Unclear reuse patterns
   - Complex conditional task interface

3. **Context Complexity**
   - Mutable context
   - Mixed config and runtime data
   - Command-specific schemas

4. **Execution Complexity**
   - Complex dependency resolution
   - Parallel execution (unused)
   - Strategy pattern overhead

### New Architecture Solutions

1. **Plugin-Based Commands**
   - ✅ No hardcoded types
   - ✅ Self-registering commands
   - ✅ Command owns schema
   - ✅ Easy to add new commands

2. **Simplified Tasks**
   - ✅ Functions over classes
   - ✅ Clear metadata
   - ✅ Registry-based discovery
   - ✅ Self-contained
   - ✅ Easy to test

3. **Immutable Context**
   - ✅ Immutable via forking
   - ✅ Clear config vs data
   - ✅ Type-safe
   - ✅ Predictable

4. **Simple Execution**
   - ✅ Sequential only
   - ✅ Ordered tasks
   - ✅ Clear semantics
   - ✅ Easy to debug

## Migration Strategy

### For New Commands

1. Create command config schema
2. Define command metadata
3. Implement `buildTasks()` to return tasks
4. Add optional hooks (beforeExecute, afterExecute)
5. Register command

### For Existing Commands

1. Extract command-specific logic
2. Convert task classes to functions
3. Update context access patterns
4. Remove manual dependency wiring
5. Test with new executor

## Example Usage

See `examples/demo-command.ts` for a complete example.

```typescript
import { CommandRegistry } from "./command-registry/command-registry";
import { WorkflowOrchestrator } from "./execution/workflow-orchestrator";
import { demoCommand } from "./examples/demo-command";

// Register command
const registry = new CommandRegistry();
registry.register(demoCommand);

// Execute command
const orchestrator = new WorkflowOrchestrator({
    enableRollback: true,
    verbose: true,
});

const result = await orchestrator.executeCommand(
    demoCommand,
    {
        message: "Hello!",
        count: 3,
        skipValidation: false,
    }
);
```

## Testing Strategy

### Task Testing

```typescript
// Test a task in isolation
const task = myTask;
const context = ImmutableWorkflowContext.create(testConfig, testData);

const result = await task.execute(context);
expect(result.isOk()).toBe(true);

const newContext = result.value;
expect(newContext.has("resultKey")).toBe(true);
```

### Command Testing

```typescript
// Test command task building
const command = myCommand;
const context = ImmutableWorkflowContext.create(testConfig);

const tasksResult = await command.buildTasks(context);
expect(tasksResult.isOk()).toBe(true);
expect(tasksResult.value.length).toBe(3);
```

### Integration Testing

```typescript
// Test full workflow
const orchestrator = new WorkflowOrchestrator({ dryRun: true });
const result = await orchestrator.executeCommand(command, config);

expect(result.isOk()).toBe(true);
expect(result.value.success).toBe(true);
```

## Design Decisions

### Why Functions Over Classes for Tasks?

- Less boilerplate
- Easier to compose
- Simpler to test
- YAGNI - we don't need class features
- More functional approach

### Why Immutable Context?

- Prevents accidental mutations
- Easier to reason about
- Clear data flow
- Safe for concurrent operations (future)
- Better debugging

### Why Sequential Only?

- YAGNI - no current need for parallel
- Simpler to implement
- Easier to debug
- Predictable behavior
- Can add parallel later if needed

### Why Registry Pattern?

- Dynamic discovery
- No hardcoded types
- Easy to extend
- Decoupled components
- Plugin-friendly

## Future Enhancements

Potential additions (when needed):

1. **Parallel Execution** - For independent tasks
2. **Task Caching** - Skip tasks with cached results
3. **Task Retries** - Automatic retry on failure
4. **Task Timeouts** - Enforce execution time limits
5. **Task Hooks** - Additional lifecycle hooks
6. **Context Validation** - Runtime schema validation
7. **Task Metrics** - Performance tracking
8. **Task Mocking** - For testing

## Contributing

When adding new features:

1. Follow YAGNI - add complexity only when needed
2. Maintain immutability in context
3. Keep tasks simple and focused
4. Document with examples
5. Add tests for new functionality

## Questions?

See existing code in `examples/` or refer to the implementation files.
