# Proposed Improvements & Enhancements

This document outlines additional improvements that could be made to the rewritten architecture for better UX, DX, and overall quality.

## Table of Contents

1. [Core Enhancements](#core-enhancements)
2. [DX Improvements](#dx-improvements)
3. [File Structure Refinements](#file-structure-refinements)
4. [Testing Infrastructure](#testing-infrastructure)
5. [Observability & Debugging](#observability--debugging)
6. [Type Safety Enhancements](#type-safety-enhancements)
7. [CLI Integration](#cli-integration)
8. [Advanced Features](#advanced-features)

---

## Core Enhancements

### 1. Task Middleware System

**Problem:** Cross-cutting concerns (logging, timing, validation) are repeated in tasks.

**Proposal:** Add middleware pattern for tasks:

```typescript
interface TaskMiddleware {
    before?: (ctx: WorkflowContext) => FireflyAsyncResult<WorkflowContext>;
    after?: (ctx: WorkflowContext, result: WorkflowContext) => FireflyAsyncResult<WorkflowContext>;
    onError?: (ctx: WorkflowContext, error: FireflyError) => FireflyAsyncResult<void>;
}

const timingMiddleware: TaskMiddleware = {
    before: (ctx) => {
        console.time(ctx.get("currentTask"));
        return okAsync(ctx);
    },
    after: (ctx) => {
        console.timeEnd(ctx.get("currentTask"));
        return okAsync(ctx);
    },
};

const myTask = createTask({
    meta: { id: "my-task", description: "..." },
    middleware: [timingMiddleware, loggingMiddleware],
    execute: (ctx) => { /* ... */ },
});
```

**Benefits:**
- ✅ Reusable cross-cutting concerns
- ✅ Cleaner task implementations
- ✅ Easy to add metrics, tracing, etc.

**File:** `src/rewrite/task-system/task-middleware.ts`

---

### 2. Task Composition Helpers

**Problem:** Complex workflows need task composition patterns.

**Proposal:** Add composition utilities:

```typescript
// Parallel task group (for future)
const parallelTasks = createParallelGroup({
    id: "parallel-group",
    tasks: [task1, task2, task3],
});

// Sequential task chain
const taskChain = createTaskChain({
    id: "bump-chain",
    tasks: [validateVersion, bumpVersion, updateChangelog],
});

// Conditional task
const conditionalTask = createConditionalTask({
    id: "conditional-publish",
    condition: (ctx) => ctx.config.publish === true,
    whenTrue: publishTask,
    whenFalse: skipPublishTask,
});

// Retry wrapper
const retryableTask = withRetry(fetchDataTask, {
    maxAttempts: 3,
    backoff: "exponential",
});
```

**File:** `src/rewrite/task-system/task-composers.ts`

---

### 3. Context Validators

**Problem:** Runtime context validation happens manually in tasks.

**Proposal:** Add context schema validation:

```typescript
interface WorkflowContextSchema<TConfig, TData> {
    configSchema: z.ZodType<TConfig>;
    dataSchema: z.ZodType<TData>;
}

const context = ImmutableWorkflowContext.createWithSchema<MyConfig, MyData>({
    configSchema: MyConfigSchema,
    dataSchema: MyDataSchema,
}, config, initialData);

// Validates on fork
const newContext = context.fork("version", "1.0.0"); // Type-checked!
```

**File:** `src/rewrite/context/workflow-context-schema.ts`

---

### 4. Event System

**Problem:** No way to observe workflow events externally.

**Proposal:** Add event emitter:

```typescript
interface WorkflowEvents {
    "task:start": { taskId: string; context: WorkflowContext };
    "task:complete": { taskId: string; duration: number };
    "task:skip": { taskId: string; reason: string };
    "task:error": { taskId: string; error: FireflyError };
    "workflow:start": { workflowId: string };
    "workflow:complete": { result: WorkflowExecutionResult };
}

const orchestrator = new WorkflowOrchestrator({
    events: true,
});

orchestrator.on("task:start", ({ taskId }) => {
    console.log(`Starting task: ${taskId}`);
});

orchestrator.on("task:complete", ({ taskId, duration }) => {
    metrics.recordTaskDuration(taskId, duration);
});
```

**File:** `src/rewrite/execution/workflow-events.ts`

---

## DX Improvements

### 5. Task Builder API

**Problem:** Creating tasks with many options is verbose.

**Proposal:** Fluent builder API:

```typescript
const myTask = TaskBuilder.create("my-task")
    .description("Does something useful")
    .dependsOn("prerequisite-task", "another-task")
    .skipWhen((ctx) => !ctx.config.enabled)
    .skipToTasks("next-task")
    .withUndo((ctx) => okAsync())
    .execute((ctx) => {
        // Implementation
        return okAsync(ctx.fork("result", value));
    })
    .build();
```

**File:** `src/rewrite/task-system/task-builder.ts`

---

### 6. Command Templates

**Problem:** Creating new commands requires understanding full structure.

**Proposal:** Add command generator CLI:

```bash
# Generate new command scaffold
firefly generate command my-command --template basic

# Generated files:
# src/commands/my-command/
# ├── index.ts              # Command definition
# ├── config.ts             # Configuration schema
# ├── tasks/                # Task implementations
# │   ├── task1.ts
# │   └── task2.ts
# └── README.md             # Command documentation
```

**Implementation:** CLI tool using templates.

**File:** `scripts/generate-command.ts`

---

### 7. Task Dependency Visualization

**Problem:** Complex workflows are hard to visualize.

**Proposal:** Generate dependency graphs:

```typescript
// In code
const graph = TaskGraph.fromRegistry(taskRegistry);
graph.visualize(); // Opens in browser

// CLI
firefly analyze workflow release --graph
```

Output: Mermaid diagram or interactive graph.

**File:** `src/rewrite/dev-tools/task-graph.ts`

---

### 8. Development Mode

**Problem:** Hard to debug complex workflows during development.

**Proposal:** Add dev mode with enhanced debugging:

```typescript
const orchestrator = new WorkflowOrchestrator({
    devMode: true,  // Enables extra checks and logging
    breakpoints: ["bump-version"],  // Pause at tasks
    inspector: true,  // Interactive debugger
});

// Dev mode features:
// - Step-through execution
// - Context inspection at each step
// - Time travel debugging
// - Hot reload tasks
```

**File:** `src/rewrite/dev-tools/dev-mode.ts`

---

## File Structure Refinements

### 9. Reorganize by Feature

**Current:**
```
src/rewrite/
├── command-registry/
├── context/
├── task-system/
└── execution/
```

**Proposed:**
```
src/rewrite/
├── core/                     # Core abstractions
│   ├── command/              # Command system
│   │   ├── command.ts
│   │   ├── command-registry.ts
│   │   └── command-builder.ts
│   ├── task/                 # Task system
│   │   ├── task.ts
│   │   ├── task-registry.ts
│   │   ├── task-builder.ts
│   │   ├── task-middleware.ts
│   │   └── task-composers.ts
│   ├── context/              # Context system
│   │   ├── workflow-context.ts
│   │   └── workflow-context-schema.ts
│   └── execution/            # Execution engine
│       ├── workflow-executor.ts
│       ├── workflow-orchestrator.ts
│       └── workflow-events.ts
├── commands/                 # Built-in commands
│   ├── release/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   └── tasks/
│   └── demo/
│       └── ...
├── middleware/               # Shared middleware
│   ├── timing.ts
│   ├── logging.ts
│   └── validation.ts
├── utils/                    # Utilities
│   ├── task-graph.ts
│   └── context-helpers.ts
├── dev-tools/                # Development tools
│   ├── dev-mode.ts
│   ├── inspector.ts
│   └── generator.ts
├── types/                    # Shared types
│   └── index.ts
└── index.ts                  # Main exports
```

**Benefits:**
- ✅ Clearer organization
- ✅ Easier to find files
- ✅ Better separation of concerns
- ✅ Room for growth

---

## Testing Infrastructure

### 10. Testing Utilities

**Problem:** No testing helpers provided.

**Proposal:** Add testing utilities:

```typescript
// Test helpers
import { createTestContext, createTestTask, mockTask } from "#/rewrite/testing";

describe("MyTask", () => {
    it("should update version", async () => {
        const ctx = createTestContext({
            config: { version: "1.0.0" },
        });
        
        const task = createMyTask();
        const result = await task.execute(ctx);
        
        expect(result.isOk()).toBe(true);
        const newCtx = result.value;
        expect(newCtx.get("version").value).toBe("1.1.0");
    });
    
    it("should skip when condition not met", () => {
        const ctx = createTestContext({
            config: { skipVersion: true },
        });
        
        const task = createMyTask();
        const skipResult = task.shouldSkip(ctx);
        
        expect(skipResult.isOk()).toBe(true);
        expect(skipResult.value.shouldSkip).toBe(true);
    });
});

// Mock tasks for integration tests
const mockBumpTask = mockTask("bump-version", {
    execute: () => okAsync(ctx.fork("version", "mocked")),
});
```

**File:** `src/rewrite/testing/index.ts`

---

### 11. Integration Test Helpers

**Proposal:** Command integration testing:

```typescript
import { TestWorkflow } from "#/rewrite/testing";

describe("Release Command", () => {
    it("should execute full workflow", async () => {
        const workflow = TestWorkflow.from(releaseCommand)
            .withConfig({ type: "patch" })
            .withMocks({
                "git-push": mockGitPush,
                "github-release": mockGithubRelease,
            });
        
        const result = await workflow.execute();
        
        expect(result.success).toBe(true);
        expect(result.executedTasks).toContain("bump-version");
        expect(mockGitPush).toHaveBeenCalled();
    });
});
```

**File:** `src/rewrite/testing/test-workflow.ts`

---

## Observability & Debugging

### 12. Structured Logging

**Problem:** Logs are string-based, hard to parse.

**Proposal:** Structured logging with context:

```typescript
interface LogContext {
    executionId: string;
    taskId?: string;
    commandName: string;
    userId?: string;
}

logger.info("Task started", {
    taskId: "bump-version",
    executionId: ctx.executionId,
    metadata: { previousVersion: "1.0.0" },
});

// Output (JSON):
{
    "level": "info",
    "message": "Task started",
    "taskId": "bump-version",
    "executionId": "uuid-123",
    "metadata": { "previousVersion": "1.0.0" },
    "timestamp": "2024-01-01T00:00:00Z"
}
```

**File:** `src/rewrite/core/logging/structured-logger.ts`

---

### 13. Execution Timeline

**Problem:** Hard to understand workflow execution flow.

**Proposal:** Generate execution timeline:

```typescript
const result = await orchestrator.executeCommand(cmd, config);

// Generate timeline
const timeline = ExecutionTimeline.from(result);
timeline.render(); // ASCII or HTML output

// Example output:
┌─────────────────────────────────────────────────┐
│ Release Workflow (execution: abc-123)          │
├─────────────────────────────────────────────────┤
│ validate         ████ 50ms                      │
│ bump-version     ████████ 100ms                 │
│ generate-changelog ██████ 75ms                  │
│ git-commit       ███ 30ms                       │
│ git-push         ████████████ 200ms             │
│ github-release   ██████ 80ms                    │
└─────────────────────────────────────────────────┘
Total: 535ms
```

**File:** `src/rewrite/observability/execution-timeline.ts`

---

### 14. Metrics Collection

**Proposal:** Built-in metrics:

```typescript
const orchestrator = new WorkflowOrchestrator({
    metrics: {
        enabled: true,
        backend: "prometheus", // or "statsd", "datadog"
    },
});

// Auto-collected metrics:
// - workflow_executions_total{command="release", status="success"}
// - workflow_duration_seconds{command="release"}
// - task_executions_total{task="bump-version", status="success"}
// - task_duration_seconds{task="bump-version"}
// - task_skipped_total{task="validate"}
```

**File:** `src/rewrite/observability/metrics.ts`

---

## Type Safety Enhancements

### 15. Context Type Guards

**Problem:** Context data access requires casting.

**Proposal:** Type-safe context builders:

```typescript
// Define typed context
const ReleaseContextBuilder = ContextBuilder.create<ReleaseConfig>()
    .addData("currentVersion", z.string())
    .addData("nextVersion", z.string())
    .addData("changelog", z.string().optional())
    .build();

type ReleaseContext = typeof ReleaseContextBuilder.contextType;

// Usage in tasks - no casting needed!
const task = createTask<ReleaseContext>({
    meta: { id: "bump", description: "..." },
    execute(ctx) {
        // Type-safe access
        const current = ctx.data.currentVersion; // string
        const next = ctx.data.nextVersion; // string
        
        return okAsync(ctx.fork("nextVersion", "2.0.0"));
    },
});
```

**File:** `src/rewrite/core/context/context-builder.ts`

---

### 16. Task Type Inference

**Proposal:** Better type inference for task chains:

```typescript
// Type flows through task chain
const task1 = createTask({
    meta: { id: "task1", description: "..." },
    execute: (ctx) => okAsync(ctx.fork("version", "1.0.0")),
});

const task2 = createTask({
    meta: { id: "task2", dependencies: ["task1"] },
    execute: (ctx) => {
        // TypeScript knows "version" exists
        const version = ctx.get("version"); // inferred type!
        return okAsync(ctx);
    },
});
```

**Implementation:** Advanced TypeScript utility types.

---

## CLI Integration

### 17. Interactive Mode

**Problem:** CLI is command-line only.

**Proposal:** Add interactive mode:

```bash
firefly --interactive

# Interactive prompts:
? Select command: (Use arrow keys)
  ❯ release
    build
    test
    
? Release type: (Use arrow keys)
  ❯ patch
    minor
    major
    
? Generate changelog? (Y/n) y

# Then executes with selected options
```

**File:** `src/rewrite/cli/interactive.ts`

---

### 18. Config Wizard

**Proposal:** Generate config files interactively:

```bash
firefly init

# Walks through:
# - Command selection
# - Config options
# - Git settings
# - Platform (GitHub/GitLab)
# 
# Generates: firefly.config.ts
```

**File:** `src/rewrite/cli/init-wizard.ts`

---

### 19. Watch Mode

**Proposal:** Watch for changes and re-run:

```bash
firefly watch test

# Watches files, re-runs test command on changes
# Useful for development
```

**File:** `src/rewrite/cli/watch-mode.ts`

---

## Advanced Features

### 20. Task Caching

**Problem:** Repeated tasks waste time.

**Proposal:** Smart task caching:

```typescript
const task = createTask({
    meta: { 
        id: "expensive-task",
        cache: {
            enabled: true,
            ttl: 3600, // 1 hour
            key: (ctx) => `${ctx.config.version}`,
        },
    },
    execute: (ctx) => {
        // Only runs if cache miss
        return okAsync(ctx);
    },
});

// Cache backends: memory, redis, file
```

**File:** `src/rewrite/core/task/task-cache.ts`

---

### 21. Workflow Versioning

**Problem:** Workflows change over time, need compatibility.

**Proposal:** Version workflows:

```typescript
const releaseCommand = createCommand({
    meta: {
        name: "release",
        version: "2.0.0", // Workflow version
        minCompatibleVersion: "1.5.0",
    },
    // ...
});

// Migration support
migrations: {
    "1.0.0": (ctx) => {
        // Migrate old context to new format
        return okAsync(ctx);
    },
}
```

**File:** `src/rewrite/core/command/command-versioning.ts`

---

### 22. Plugin System

**Problem:** Users can't extend Firefly easily.

**Proposal:** External plugin support:

```typescript
// External plugin package
export const myPlugin: FireflyPlugin = {
    name: "my-plugin",
    version: "1.0.0",
    
    commands: [myCommand1, myCommand2],
    middleware: [myMiddleware],
    
    install(registry: CommandRegistry) {
        registry.registerAll(this.commands);
    },
};

// In firefly.config.ts
export default {
    plugins: [
        myPlugin,
        "@company/firefly-slack", // npm package
    ],
};
```

**File:** `src/rewrite/core/plugin/plugin-system.ts`

---

### 23. Workflow Resumption

**Problem:** Long workflows can't be resumed after failure.

**Proposal:** Checkpoint and resume:

```typescript
const orchestrator = new WorkflowOrchestrator({
    checkpointing: {
        enabled: true,
        storage: "./checkpoints",
    },
});

// On failure, saves checkpoint
// Resume with:
firefly resume <execution-id>
```

**File:** `src/rewrite/core/execution/checkpoint.ts`

---

## Implementation Priority

### High Priority (Core DX)
1. ✅ Task Middleware System
2. ✅ Task Builder API
3. ✅ Testing Utilities
4. ✅ Structured Logging
5. ✅ File Structure Reorganization

### Medium Priority (Enhanced Features)
6. ⚠️ Event System
7. ⚠️ Task Composition Helpers
8. ⚠️ Context Type Guards
9. ⚠️ Execution Timeline
10. ⚠️ Command Templates

### Low Priority (Advanced)
11. 🔄 Task Caching
12. 🔄 Plugin System
13. 🔄 Workflow Resumption
14. 🔄 Metrics Collection
15. 🔄 Interactive Mode

---

## Recommendations

Based on current needs and complexity/value ratio, I recommend implementing in this order:

### Phase 1: Developer Experience (Week 1-2)
- Task Builder API
- Testing Utilities
- Structured Logging
- File Structure Reorganization

### Phase 2: Core Features (Week 3-4)
- Task Middleware System
- Event System
- Context Type Guards
- Task Composition Helpers

### Phase 3: Advanced Features (Month 2)
- Command Templates
- Execution Timeline
- Task Dependency Visualization
- Interactive Mode

### Phase 4: Production Features (Month 3+)
- Metrics Collection
- Task Caching
- Plugin System
- Workflow Resumption

---

## Summary

The current rewrite is **excellent** as a foundation. These improvements would:

1. **DX**: Builder APIs, testing utils, better types
2. **UX**: Interactive mode, better errors, visualization
3. **Observability**: Metrics, events, structured logs
4. **Extensibility**: Plugins, middleware, composition
5. **Production**: Caching, resumption, versioning

The architecture supports all these additions without major changes - testament to good design!

**Next Steps:**
1. Prioritize based on immediate needs
2. Implement Phase 1 features first
3. Gather feedback from usage
4. Iterate on remaining features

Would you like me to implement any of these? I'd recommend starting with:
- Task Builder API (immediate DX win)
- Testing Utilities (enables TDD)
- Structured Logging (better debugging)
