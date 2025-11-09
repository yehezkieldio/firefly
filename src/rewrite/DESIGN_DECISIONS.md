# Design Decisions

This document explains key architectural decisions made in the rewrite.

## Table of Contents

1. [Functions Over Classes for Tasks](#functions-over-classes-for-tasks)
2. [Immutable Context with Forking](#immutable-context-with-forking)
3. [Sequential-Only Execution](#sequential-only-execution)
4. [Registry Pattern for Commands and Tasks](#registry-pattern-for-commands-and-tasks)
5. [Static Dependencies Declaration](#static-dependencies-declaration)
6. [Skip Logic Instead of Controllers](#skip-logic-instead-of-controllers)
7. [Type Erasure for Task Interface](#type-erasure-for-task-interface)
8. [Self-Contained Commands](#self-contained-commands)

---

## Functions Over Classes for Tasks

### Decision

Tasks are implemented as objects with function properties rather than classes.

### Rationale

**YAGNI (You Aren't Gonna Need It):**
- Tasks don't need inheritance
- No polymorphism required
- No shared state between instances
- No lifecycle beyond execution

**Simplicity:**
- Less boilerplate than classes
- No `this` context confusion
- Easier to compose and test
- More functional approach

**Example Comparison:**

```typescript
// Class-based (old)
export class MyTask implements Task {
    readonly id = "my-task";
    readonly description = "Does something";
    
    getDependencies(): string[] {
        return ["other-task"];
    }
    
    execute(context: TaskContext): FireflyAsyncResult<void> {
        // ...
    }
}

// Function-based (new)
const myTask = createTask({
    meta: {
        id: "my-task",
        description: "Does something",
        dependencies: ["other-task"],
    },
    execute(ctx) {
        // ...
    },
});
```

**Trade-offs:**
- ✅ Simpler to write and understand
- ✅ Less code duplication
- ✅ Easier testing
- ❌ No inheritance (not needed)
- ❌ No private methods (use local functions)

### When to Reconsider

If tasks need:
- Complex shared state
- Inheritance hierarchies
- Sophisticated lifecycle management

---

## Immutable Context with Forking

### Decision

Context is immutable and updated via forking (creating new instances).

### Rationale

**Predictability:**
- No accidental mutations
- Clear data flow
- Easier to debug
- Safe for future parallelization

**Explicit Updates:**
- Every update is intentional
- Clear what changed and when
- Can track context history

**Type Safety:**
- Config is read-only
- Data updates are explicit
- Compiler catches mutations

**Example:**

```typescript
// Mutable (old)
context.set("version", "1.0.0");
context.set("changelog", "...");
// Context mutated in place

// Immutable (new)
const ctx1 = context.fork("version", "1.0.0");
const ctx2 = ctx1.fork("changelog", "...");
// Or: const ctx2 = ctx1.forkMultiple({ version, changelog });
// New contexts created, original unchanged
```

**Trade-offs:**
- ✅ Prevents bugs from mutations
- ✅ Clear data flow
- ✅ Easier reasoning
- ❌ Slightly more verbose
- ❌ More memory (minimal impact)

### Performance Considerations

- Forking is shallow copy (fast)
- Old contexts can be GC'd
- Frozen objects may be optimized by engine
- No measurable performance impact for Firefly's use case

### When to Reconsider

If:
- Performance becomes critical
- Frequent updates to large data structures
- Memory constraints are extreme

---

## Sequential-Only Execution

### Decision

Execute tasks sequentially, no parallel execution support.

### Rationale

**YAGNI:**
- No current need for parallel execution
- Firefly tasks are typically I/O bound
- Most tasks depend on previous results
- Sequential is predictable

**Simplicity:**
- No race conditions
- No lock management
- Easy to debug
- Clear execution order

**Current Use Case:**
- Release workflow is inherently sequential:
  1. Bump version
  2. Generate changelog
  3. Commit changes
  4. Create tag
  5. Push to remote
  6. Create release

**Example:**

```typescript
// Sequential execution
for (const task of tasks) {
    const newContext = await task.execute(context);
    context = newContext;
}
// Clear order, easy to follow
```

**Trade-offs:**
- ✅ Simple implementation
- ✅ Easy to debug
- ✅ Predictable behavior
- ✅ No concurrency bugs
- ❌ Can't parallelize independent tasks
- ❌ Slower for independent operations

### Future Enhancement

If parallel execution becomes needed:

```typescript
interface TaskMetadata {
    // ... existing fields
    parallel?: boolean;  // Can run in parallel
    parallelGroup?: string;  // Group of parallel tasks
}

// Execution logic:
// 1. Group by parallelGroup
// 2. Execute groups sequentially
// 3. Within group, execute parallel tasks
```

### When to Reconsider

If:
- Multiple independent I/O operations
- Performance becomes critical
- Clear parallelization opportunities identified

---

## Registry Pattern for Commands and Tasks

### Decision

Use registry pattern for dynamic discovery of commands and tasks.

### Rationale

**Extensibility:**
- Easy to add new commands
- No hardcoded types
- Plugin-friendly architecture
- Supports future dynamic loading

**Decoupling:**
- Commands don't know about each other
- No central import registry
- Self-contained modules

**Validation:**
- Registry validates on registration
- Dependency checks at registration time
- Circular dependency detection

**Example:**

```typescript
// Command registration
const registry = new CommandRegistry();
registry.register(releaseCommand);
registry.register(buildCommand);
registry.register(testCommand);

// Get command dynamically
const cmd = registry.get("release");

// Task registry
const taskRegistry = new TaskRegistry();
taskRegistry.registerAll([task1, task2, task3]);
const orderedTasks = taskRegistry.buildExecutionOrder();
```

**Trade-offs:**
- ✅ Extensible
- ✅ Decoupled
- ✅ Validation built-in
- ✅ Easy to test
- ❌ Slight runtime overhead (negligible)
- ❌ More indirection

### When to Reconsider

If:
- Number of commands is fixed and small
- No need for dynamic discovery
- Performance of registry lookup is critical

---

## Static Dependencies Declaration

### Decision

Dependencies are declared in task metadata, not computed at runtime.

### Rationale

**Clarity:**
- Dependencies visible upfront
- No hidden relationships
- Easy to visualize

**Validation:**
- Check dependencies at registration
- Detect cycles early
- Fail fast

**Tooling:**
- Can generate dependency graphs
- Enable static analysis
- Better IDE support

**Example:**

```typescript
const task = createTask({
    meta: {
        id: "my-task",
        dependencies: ["task1", "task2"],  // Static, visible
    },
    execute(ctx) {
        // Dependencies guaranteed to have run
    },
});
```

**Old Way (Dynamic):**

```typescript
class MyTask {
    getDependencies(context?: TaskContext): string[] {
        // Computed at runtime, can change
        if (context?.someCondition) {
            return ["task1", "task2"];
        }
        return ["task1"];
    }
}
```

**Trade-offs:**
- ✅ Clear and visible
- ✅ Can validate early
- ✅ Better tooling
- ✅ Easier to understand
- ❌ Less flexible (use skip logic instead)

### Dynamic Behavior via Skip Logic

For conditional execution, use skip logic:

```typescript
const task = createTask({
    meta: {
        id: "conditional-task",
        dependencies: ["prerequisite"],
    },
    shouldSkip(ctx) {
        return ok({
            shouldSkip: !ctx.config.needsThis,
            reason: "Not needed for this configuration",
        });
    },
    execute(ctx) { /* ... */ },
});
```

### When to Reconsider

If:
- Dependencies truly need to be computed at runtime
- Complex dynamic workflows required
- Static declaration becomes too limiting

---

## Skip Logic Instead of Controllers

### Decision

Use `shouldSkip()` on tasks instead of separate controller tasks.

### Rationale

**Locality:**
- Logic with the task it controls
- Easier to understand flow
- No dummy tasks

**Old Pattern (Controllers):**

```typescript
class VersionFlowControllerTask {
    execute() { return okAsync(); }  // Does nothing
    
    getNextTasks(ctx) {
        // Decides which tasks run next
        if (condition) return ["task1"];
        return ["task2"];
    }
}
```

**New Pattern (Skip Logic):**

```typescript
const task1 = createTask({
    meta: { id: "task1", description: "..." },
    shouldSkip(ctx) {
        return ok({
            shouldSkip: !condition,
            reason: "Condition not met",
        });
    },
    execute(ctx) { /* actual work */ },
});

const task2 = createTask({
    meta: { id: "task2", description: "..." },
    shouldSkip(ctx) {
        return ok({
            shouldSkip: condition,
            reason: "Alternative path",
        });
    },
    execute(ctx) { /* actual work */ },
});
```

**Trade-offs:**
- ✅ Logic colocated
- ✅ No dummy tasks
- ✅ Clearer intent
- ✅ Easier to test
- ❌ Multiple tasks with similar skip logic (use helper functions)

### Skip-Through Support

For complex flow control:

```typescript
shouldSkip(ctx) {
    return ok({
        shouldSkip: true,
        skipToTasks: ["next-task"],  // Jump to specific task
    });
}
```

### When to Reconsider

If:
- Extremely complex conditional logic
- Many tasks controlled by same condition
- Controller pattern clearer for specific case

---

## Type Erasure for Task Interface

### Decision

Task interface doesn't use generics for TConfig and TData.

```typescript
export interface Task {
    meta: TaskMetadata;
    shouldSkip?: (context: WorkflowContext<unknown, Record<string, unknown>>) => ...;
    execute: (context: WorkflowContext<unknown, Record<string, unknown>>) => ...;
    undo?: (context: WorkflowContext<unknown, Record<string, unknown>>) => ...;
}
```

### Rationale

**Type Variance Issues:**
- Generic tasks don't play well with registries
- Can't store `Task<ConfigA>` and `Task<ConfigB>` together
- TypeScript variance rules make it complex

**Practical Usage:**
- Tasks cast context to their specific types
- Type safety maintained at task implementation
- Simpler interface definition

**Example:**

```typescript
const myTask = createTask({
    meta: { id: "my-task", description: "..." },
    execute(ctx) {
        // Cast to specific types as needed
        const config = ctx.config as MyConfig;
        const data = ctx.data as MyData;
        
        // Type-safe within task
        const value = config.myField;
        return okAsync(ctx.fork("result", value));
    },
});
```

**Trade-offs:**
- ✅ Works with registries
- ✅ Simpler interface
- ✅ No variance issues
- ❌ Less type safety at interface level
- ❌ Manual casts needed (minimal)

### Type Safety Strategy

1. **Command level:** Maintain strong types
2. **Task level:** Cast as needed within implementation
3. **Context:** Provides generic access

### When to Reconsider

If:
- Type safety issues appear in practice
- Better TypeScript variance support
- Alternative registry approach found

---

## Self-Contained Commands

### Decision

Each command is self-contained with its own schema, metadata, and task building logic.

### Rationale

**Modularity:**
- Command owns everything it needs
- No dependencies on central registries
- Easy to move/delete

**Schema Ownership:**
- Command defines its config schema
- Validation colocated
- No central schema provider

**Self-Registration:**
- Command can register itself
- Plugin-friendly
- Easy to enable/disable

**Example:**

```typescript
export const releaseCommand = createCommand({
    meta: {
        name: "release",
        description: "Create a release",
        configSchema: ReleaseConfigSchema,  // Owned by command
        examples: ["firefly release --type patch"],
    },
    
    buildTasks(context) {
        // Command builds its own tasks
        return okAsync([
            validateTask,
            bumpVersionTask,
            generateChangelogTask,
            createReleaseTask,
        ]);
    },
});
```

**Trade-offs:**
- ✅ Highly modular
- ✅ Easy to understand
- ✅ Self-documenting
- ✅ Plugin-ready
- ❌ Potential code duplication (use shared utilities)

### Shared Code

For shared functionality:

```typescript
// shared/tasks/common-tasks.ts
export const createValidationTask = (schema) => createTask({...});

// commands/release-command.ts
import { createValidationTask } from "#/shared/tasks/common-tasks";

export const releaseCommand = createCommand({
    buildTasks(ctx) {
        return okAsync([
            createValidationTask(ReleaseConfigSchema),
            // ... command-specific tasks
        ]);
    },
});
```

### When to Reconsider

If:
- Too much code duplication
- Commands too similar
- Shared abstraction clearer

---

## Summary

These design decisions prioritize:

1. **Simplicity** - YAGNI, start simple
2. **Clarity** - Easy to understand and maintain
3. **Type Safety** - Leverage TypeScript where practical
4. **Modularity** - Self-contained, decoupled components
5. **Testability** - Easy to test in isolation
6. **Extensibility** - Easy to add new commands/tasks

All decisions can be revisited as requirements evolve. The architecture supports:
- Adding complexity when needed
- Keeping simple things simple
- Clear migration path
- Backward compatibility options

## Questions?

If any design decision seems unclear or problematic:
1. Check if it solves a real problem in current codebase
2. Review the trade-offs documented here
3. Consider if added complexity is worth the benefit
4. Document new decisions if changes are made
