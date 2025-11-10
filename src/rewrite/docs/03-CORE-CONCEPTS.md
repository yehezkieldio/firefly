# Essential Concepts and Cognitive Model

This document defines core concepts, terminology, and mental models to help contributors understand and work effectively with the Firefly codebase.

## Table of Contents

1. [Terminology Dictionary](#terminology-dictionary)
2. [Mental Models](#mental-models)
3. [Key Directories](#key-directories)
4. [File Naming Conventions](#file-naming-conventions)
5. [Code Organization](#code-organization)
6. [Design Patterns](#design-patterns)
7. [Common Pitfalls](#common-pitfalls)
8. [Best Practices](#best-practices)

## Terminology Dictionary

### Core Concepts

**Command**
A user-facing feature that orchestrates a complete workflow. Commands are plugins that register themselves with the registry. Examples: `release`, `commit`, `autocommit`.

**Task**
The smallest unit of work in a workflow. A task receives a context, performs an operation, and returns a new context. Tasks are pure functions with metadata.

**Context**
An immutable state container holding configuration and runtime data. Contexts are never mutated; instead, new contexts are created via forking.

**Fork**
The operation of creating a new context with additional or updated data. Original context remains unchanged. Enables immutability and time-travel debugging.

**Result**
A type representing either success (`Ok<T>`) or failure (`Err<E>`). Used instead of exceptions for type-safe error handling.

**Registry**
A collection that manages dynamic discovery and lookup of commands or tasks. Enables plugin architecture without hardcoding.

**Orchestrator**
High-level coordinator that manages command execution, creates initial context, and handles errors/rollback at the workflow level.

**Executor**
Low-level component that runs tasks sequentially, evaluates skip conditions, handles errors, and manages rollback for individual tasks.

**Service**
A stateless utility that provides reusable operations (e.g., Git operations, file I/O). Services return Result types and can be used by any layer.

**Skip Condition**
A function that determines whether a task should be executed based on the current context. Enables runtime workflow adaptation.

**Rollback**
The process of undoing completed tasks when an error occurs. Tasks can provide an `undo` function for rollback support.

**Dry Run**
Execution mode where actions are planned and reported but not actually performed. Used to preview changes before committing.

### Architecture Terms

**Task Builder**
Fluent API for creating tasks with method chaining. Makes task creation more ergonomic and reduces boilerplate.

**Task Composition**
Combining multiple tasks into higher-level workflows using utilities like `composeSequential`, `composeConditional`, etc.

**Plugin**
A self-contained command module that registers itself with the command registry. Enables extending Firefly without modifying core code.

**Workflow**
A sequence of tasks that accomplish a specific goal. Built by commands using their `buildTasks` method.

**Topological Sort**
Algorithm for ordering tasks based on their dependencies, ensuring prerequisite tasks run before dependent tasks.

**Dependency Resolution**
The process of determining the correct execution order for tasks based on declared dependencies.

### Data Flow Terms

**Config**
User-provided configuration loaded from files or CLI flags. Immutable once loaded. Specific to each command (e.g., `ReleaseConfig`).

**Data**
Runtime information accumulated during workflow execution. Stored in context, updated via forking.

**Schema**
Zod schema that defines and validates the structure of configuration. Each command owns its schema.

**Validation**
Process of checking that configuration or data matches expected structure and constraints. Happens at load time and runtime.

### Error Handling Terms

**FireflyError**
Structured error type with code, message, and optional details. Used consistently throughout the codebase.

**FireflyResult<T>**
Synchronous Result type: `Result<T, FireflyError>`

**FireflyAsyncResult<T>**
Asynchronous Result type: `ResultAsync<T, FireflyError>`. Like `Promise<Result<T, FireflyError>>` but with helper methods.

**Error Propagation**
Pattern of checking Result types and returning errors early using `if (result.isErr()) return err(...)`.

### Testing Terms

**Test Context**
Mock workflow context created for testing using `ContextBuilder.forTesting()`.

**Mock Task**
Fake task used in tests that returns predefined results.

**Test Spy**
Task wrapper that tracks how many times it was called and with what arguments.

**Fixture**
Sample data used in tests (e.g., mock commits, package.json files).

### Service Terms

**GitService**
Service providing Git operations: stage, commit, tag, push, diff, history, etc.

**FileSystemService**
Service for file I/O: read, write, JSON/TOML parsing, package.json utilities.

**ConventionalCommitService**
Service for parsing, validating, and formatting conventional commit messages.

**PromptService**
Service for interactive CLI prompts: text input, selection, confirmation, multi-line editing.

**VersionService**
Service for semantic versioning: parsing, bumping, comparing versions.

**CliffConfigService**
Service for loading and parsing cliff.toml configuration files.

**ChangelogService**
Service for generating changelogs using git-cliff.

**AIProviderService**
Service for AI-powered commit message generation (Azure AI, OpenAI, Anthropic).

**PlatformReleaseService**
Service for creating releases on GitHub or GitLab.

**ValidationService**
Service for centralized validation of versions, commits, URLs, paths, etc.

**DryRunService**
Service for tracking planned actions during dry run mode and generating reports.

## Mental Models

### Model 1: Context as Timeline

Think of context as a timeline where each fork creates a new point in time:

```
Initial State (t0)
    { config: {...}, data: {} }
    
After Task 1 (t1)  
    { config: {...}, data: { version: "1.0.0" } }
    
After Task 2 (t2)
    { config: {...}, data: { version: "1.0.0", commits: [...] } }
    
After Task 3 (t3)
    { config: {...}, data: { version: "1.0.0", commits: [...], nextVersion: "1.1.0" } }
```

- Each fork creates a new timeline
- Previous timelines remain unchanged
- You can "time travel" by keeping references to previous contexts
- Makes debugging easier: inspect state at each step

### Model 2: Tasks as Transformations

Think of tasks as pure transformations:

```
Input Context → [Task Logic] → Output Context
```

- Task receives context
- Task performs operation (possibly calling services)
- Task returns new context with results
- Task never mutates input context
- Task is a pure function (same input → same output)

This model makes tasks:
- Easy to test (no side effects to mock)
- Easy to compose (functions compose naturally)
- Easy to understand (clear input/output)
- Easy to debug (inspect inputs and outputs)

### Model 3: Commands as Workflows

Think of commands as workflow builders:

```
Command = Configuration + Task Builder Function

buildTasks(context) {
    return [
        preflightTasks,
        coreTasks,
        cleanupTasks
    ]
}
```

- Command doesn't execute tasks itself
- Command builds a workflow (array of tasks)
- Orchestrator handles actual execution
- Command focuses on "what" not "how"

### Model 4: Services as Tools

Think of services as a toolkit:

```
Service = Stateless Tool with Result-Based API

service.operation(params): Result<Output, Error>
```

- Services have no internal state
- Services are reusable across tasks
- Services return Results for errors
- Services can be easily mocked for testing

### Model 5: Registry as Catalog

Think of registries as catalogs that enable discovery:

```
Registry:
  - Add items: registry.register(item)
  - Find items: registry.get(id)
  - List all: registry.getAll()
```

- No hardcoded lists or enums
- Dynamic discovery at runtime
- Easy to extend with new items
- Enables plugin architecture

### Model 6: Execution as Assembly Line

Think of execution as an assembly line:

```
[Context] → Task1 → Task2 → Task3 → [Final Context]
           ↓        ↓        ↓
       (fork)   (fork)   (fork)
```

- Sequential processing (one at a time)
- Each task transforms the context
- No parallel execution (simpler, predictable)
- Skip conditions can stop a task from running
- Errors trigger rollback of completed tasks

## Key Directories

### `/cli`
**Purpose:** CLI entry point and configuration system

**Contains:**
- `main.ts`: Entry point for the CLI
- `commander.ts`: Command registration and routing
- `config-loader.ts`: Load and merge configuration
- `options-registrar.ts`: Auto-generate CLI flags from schemas
- `types.ts`: TypeScript types

**When to modify:** Adding global CLI options, changing config loading behavior

### `/command-registry`
**Purpose:** Plugin system for commands

**Contains:**
- `command-registry.ts`: Registry implementation
- `command-types.ts`: Command interfaces

**When to modify:** Rarely (core abstraction). Adding metadata to commands.

### `/commands`
**Purpose:** Command implementations

**Contains:**
- `release/`: Release command (version bump, changelog, GitHub release)
- `autocommit/`: AI-powered commit command
- `commit/`: Interactive commit command
- Each command has: `index.ts`, `config.ts`, `types.ts`

**When to modify:** Adding new commands, modifying existing command logic

### `/context`
**Purpose:** Immutable state management

**Contains:**
- `workflow-context.ts`: Context implementation
- `context-builder.ts`: Fluent API for creating contexts

**When to modify:** Rarely (core abstraction). Adding context utilities.

### `/execution`
**Purpose:** Workflow execution engine

**Contains:**
- `workflow-orchestrator.ts`: High-level coordinator
- `workflow-executor.ts`: Low-level task runner

**When to modify:** Rarely (core logic). Changing execution semantics, adding hooks.

### `/shared`
**Purpose:** Reusable services (11 services)

**Contains:**
- `git/`: Git operations
- `filesystem/`: File I/O
- `conventional-commit/`: Commit parsing
- `prompts/`: Interactive prompts
- `version/`: Semantic versioning
- `cliff-config/`: Cliff.toml parsing
- `changelog/`: Changelog generation
- `ai-provider/`: AI integration
- `platform-release/`: GitHub/GitLab API
- `validation/`: Centralized validation
- `dry-run/`: Dry run tracking

**When to modify:** Adding new services, extending existing service capabilities

### `/task-system`
**Purpose:** Task abstraction and composition

**Contains:**
- `task-registry.ts`: Task dependency management
- `task-builder.ts`: Fluent API for tasks
- `task-composition.ts`: Composition utilities
- `task-types.ts`: Task interfaces

**When to modify:** Adding task utilities, new composition patterns

### `/tasks`
**Purpose:** Reusable task implementations

**Contains:**
- `shared/`: Common tasks (preflight checks)
- `release/`: Release-specific tasks (version, git, changelog)
- Each directory has task creator functions

**When to modify:** Adding new reusable tasks, modifying task logic

### `/testing`
**Purpose:** Test utilities and helpers

**Contains:**
- `index.ts`: Test helpers (createTestContext, mock functions, assertions)

**When to modify:** Adding new test utilities

### `/__tests__`
**Purpose:** Test suite

**Contains:**
- `core/`: Tests for core systems
- `shared/`: Tests for services
- `tasks/`: Tests for tasks
- `cli/`: Tests for CLI
- `integration/`: Integration tests
- `helpers/`: Test utilities
- `fixtures/`: Sample data

**When to modify:** Adding tests for new features

### `/docs`
**Purpose:** Contributor documentation

**Contains:**
- This file and others documenting the architecture

**When to modify:** Keeping documentation up to date with changes

## File Naming Conventions

### Services
- Pattern: `{name}-service.ts`
- Examples: `git-service.ts`, `filesystem-service.ts`
- Index exports: `index.ts` re-exports service

### Tasks
- Pattern: `{category}-tasks.ts`
- Examples: `version-tasks.ts`, `git-tasks.ts`
- Contains: Multiple task creator functions
- Naming: `create{TaskName}Task()`

### Commands
- Pattern: `commands/{name}/index.ts`
- Example: `commands/release/index.ts`
- Config: `commands/{name}/config.ts`
- Types: `commands/{name}/types.ts`

### Tests
- Pattern: `{file-being-tested}.test.ts`
- Examples: `git-service.test.ts`, `workflow-context.test.ts`
- Located in `__tests__/` mirroring source structure

### Utilities
- Pattern: `{purpose}.ts` (kebab-case)
- Examples: `task-composition.ts`, `context-builder.ts`

### Configuration
- User config: `firefly.config.ts` (in user's project)
- Schema: `config.ts` (in command directory)

## Code Organization

### Service Structure
```typescript
// services/my-service/my-service.ts

export class MyService {
    constructor(private workingDir: string = process.cwd()) {}
    
    // Public methods return Result types
    public async operation(params: Params): FireflyAsyncResult<Output> {
        try {
            const result = await doSomething(params);
            return okAsync(result);
        } catch (error) {
            return errAsync(toFireflyError(error));
        }
    }
}
```

### Task Structure
```typescript
// tasks/category/my-tasks.ts

export function createMyTask(): Task {
    const service = new MyService();
    
    return TaskBuilder.create("my-task-id")
        .description("What this task does")
        .dependsOn("prerequisite-task-id")
        .skipWhen((ctx) => {
            // Condition to skip
            return ok({ shouldSkip: condition, skipThrough: false });
        })
        .execute(async (ctx) => {
            // Task logic
            const result = await service.operation(params);
            if (result.isErr()) return errAsync(result.error);
            
            // Return new context
            return okAsync(ctx.fork("key", result.value));
        })
        .withUndo(async (ctx) => {
            // Rollback logic
            await service.undo();
            return okAsync();
        })
        .build();
}
```

### Command Structure
```typescript
// commands/my-command/index.ts

export const myCommand = createCommand({
    meta: {
        name: "my-command",
        description: "What this command does",
        configSchema: MyCommandConfigSchema,
        examples: [
            "firefly my-command",
            "firefly my-command --option value"
        ]
    },
    buildTasks(ctx) {
        return okAsync([
            createPreflightTask(),
            createMyTask1(),
            createMyTask2(),
            createMyTask3(),
        ]);
    }
});
```

## Design Patterns

### 1. Registry Pattern
Used for dynamic discovery of commands and tasks.

```typescript
// Register
registry.register(item);

// Lookup
const item = registry.get(id);

// List all
const all = registry.getAll();
```

**Benefits:**
- No hardcoded enums
- Easy to extend
- Plugin-friendly

### 2. Builder Pattern
Used for creating tasks and contexts.

```typescript
const task = TaskBuilder.create("id")
    .description("...")
    .dependsOn("...")
    .execute(...)
    .build();
```

**Benefits:**
- Fluent API
- Optional configuration
- Type-safe

### 3. Factory Pattern
Used for creating tasks and commands.

```typescript
// Task factory
export function createMyTask(params): Task {
    return TaskBuilder.create(...)...build();
}

// Command factory
export const myCommand = createCommand({...});
```

**Benefits:**
- Encapsulates creation logic
- Consistent interface
- Easy to test

### 4. Strategy Pattern (Modified)
Used for skip conditions and task logic.

```typescript
// Skip strategy
skipWhen((ctx) => {
    return ok({ shouldSkip: condition });
})

// Execution strategy
execute(async (ctx) => {
    // Logic here
    return okAsync(newContext);
})
```

**Benefits:**
- Flexible behavior
- Context-dependent
- Easy to test

### 5. Immutable Data Pattern
Used for context management.

```typescript
// Never mutate
// ctx.data.version = "1.0.0"; // ❌ WRONG

// Always fork
const newCtx = ctx.fork("version", "1.0.0"); // ✅ CORRECT
```

**Benefits:**
- Predictable state
- Time-travel debugging
- No side effects

### 6. Result Pattern
Used for error handling.

```typescript
// Return Result instead of throwing
function operation(): Result<T, E> {
    if (error) return err(error);
    return ok(value);
}

// Check result
const result = operation();
if (result.isErr()) {
    // Handle error
}
const value = result.value; // Type-safe
```

**Benefits:**
- Explicit error handling
- Type-safe errors
- No forgotten catch blocks

## Common Pitfalls

### 1. Mutating Context
**Wrong:**
```typescript
ctx.data.version = "1.0.0"; // ❌ Mutation
```

**Right:**
```typescript
const newCtx = ctx.fork("version", "1.0.0"); // ✅ Fork
return okAsync(newCtx);
```

### 2. Not Handling Errors
**Wrong:**
```typescript
const result = await service.operation();
// Forgot to check if result.isErr() ❌
const value = result.value; // Might crash
```

**Right:**
```typescript
const result = await service.operation();
if (result.isErr()) return errAsync(result.error); // ✅
const value = result.value; // Safe
```

### 3. Using Exceptions
**Wrong:**
```typescript
throw new Error("Something failed"); // ❌ Exception
```

**Right:**
```typescript
return err(toFireflyError("OPERATION_FAILED", "Something failed")); // ✅ Result
```

### 4. Forgetting Dependencies
**Wrong:**
```typescript
TaskBuilder.create("my-task")
    .execute(...) // ❌ No dependencies declared
    .build();
```

**Right:**
```typescript
TaskBuilder.create("my-task")
    .dependsOn("prerequisite-task") // ✅ Dependencies declared
    .execute(...)
    .build();
```

### 5. Stateful Services
**Wrong:**
```typescript
class MyService {
    private cache = {}; // ❌ State
    
    operation() {
        this.cache[key] = value; // ❌ Side effect
    }
}
```

**Right:**
```typescript
class MyService {
    // No state ✅
    
    operation(params): Result<T, E> {
        // Pure operation ✅
        return ok(result);
    }
}
```

### 6. Not Using Task Builder
**Wrong:**
```typescript
const task: Task = {
    meta: { id: "...", dependencies: [] },
    shouldSkip: () => ok({ shouldSkip: false }),
    execute: () => okAsync(ctx),
    // Lots of boilerplate ❌
};
```

**Right:**
```typescript
const task = TaskBuilder.create("...")
    .execute(() => okAsync(ctx))
    .build(); // ✅ Less boilerplate
```

## Best Practices

### 1. Always Use Result Types
```typescript
// Functions should return Result<T, E>
function operation(): FireflyResult<string> {
    if (error) return err(error);
    return ok(value);
}
```

### 2. Keep Services Stateless
```typescript
// Services should have no internal state
class MyService {
    // Only dependencies in constructor
    constructor(private config: Config) {}
    
    // Pure methods
    operation(params): Result<T, E> {
        return ok(result);
    }
}
```

### 3. Use Task Builder
```typescript
// Always use TaskBuilder for consistency
const task = TaskBuilder.create("my-task")
    .description("Clear description")
    .dependsOn("prerequisite")
    .execute(async (ctx) => {
        // Task logic
        return okAsync(ctx.fork("result", value));
    })
    .build();
```

### 4. Declare Dependencies
```typescript
// Always declare task dependencies
TaskBuilder.create("my-task")
    .dependsOn("task1", "task2") // ✅ Explicit dependencies
    .execute(...)
    .build();
```

### 5. Use Skip Conditions
```typescript
// Use skip conditions instead of if statements in execute
TaskBuilder.create("my-task")
    .skipWhen((ctx) => {
        return ok({ shouldSkip: !ctx.config.enabled });
    })
    .execute(...) // Only runs if enabled
    .build();
```

### 6. Provide Rollback
```typescript
// Provide undo for critical operations
TaskBuilder.create("my-task")
    .execute(async (ctx) => {
        await criticalOperation();
        return okAsync(ctx.fork("done", true));
    })
    .withUndo(async (ctx) => {
        await undoCriticalOperation(); // ✅ Rollback support
        return okAsync();
    })
    .build();
```

### 7. Write Tests
```typescript
// Test tasks in isolation
test("my-task should update version", async () => {
    const ctx = createTestContext({ currentVersion: "1.0.0" });
    const task = createMyTask();
    
    const result = await task.execute(ctx);
    
    expect(result.isOk()).toBe(true);
    expect(result.value.data.nextVersion).toBe("1.1.0");
});
```

### 8. Document Clearly
```typescript
/**
 * Creates a task that updates the package.json version.
 * 
 * @returns Task that reads current version, bumps it, and writes to package.json
 * 
 * Dependencies: init-version, calculate-version
 * Skip condition: If nextVersion not in context
 * Rollback: Restores original package.json
 */
export function createUpdateVersionTask(): Task {
    // Implementation
}
```

### 9. Use Context Builder for Tests
```typescript
// Use ContextBuilder for test contexts
const ctx = ContextBuilder.forTesting()
    .withMockConfig({ version: "1.0.0" })
    .withMockData("commits", mockCommits)
    .build();
```

### 10. Follow Naming Conventions
```typescript
// Services: {name}-service.ts
git-service.ts

// Tasks: {category}-tasks.ts
version-tasks.ts

// Functions: create{Name}Task()
createUpdateVersionTask()

// Commands: {name}/index.ts
commands/release/index.ts
```

## Summary

Understanding these core concepts, mental models, and patterns will significantly accelerate your ability to contribute effectively to Firefly. Remember:

1. **Context is immutable** - always fork
2. **Errors are values** - use Result types
3. **Tasks are transformations** - input context → output context
4. **Services are stateless** - no internal state
5. **Commands build workflows** - don't execute directly
6. **Registries enable plugins** - dynamic discovery

For more details on specific topics, see:
- Architecture: `02-ARCHITECTURE.md`
- Contributing: `04-CONTRIBUTING.md`
- Advanced topics: `05-ADVANCED.md`
