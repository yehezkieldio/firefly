# Contribution Guide: Adding New Features

This document provides step-by-step guides for adding new features to Firefly.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Adding a New Command](#adding-a-new-command)
3. [Adding a New Task](#adding-a-new-task)
4. [Adding a New Workflow](#adding-a-new-workflow)
5. [Adding a New Service](#adding-a-new-service)
6. [Testing Guidelines](#testing-guidelines)
7. [Code Style](#code-style)
8. [PR Process](#pr-process)

## Development Setup

### Prerequisites
- Bun (latest version)
- Git
- Node.js 18+ (for compatibility)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/yehezkieldio/firefly.git
cd firefly

# Install dependencies
bun install

# Run tests
bun test

# Run CLI (development)
bun src/rewrite/cli/main.ts --help
```

### Project Structure
See `03-CORE-CONCEPTS.md` for detailed directory structure.

## Adding a New Command

### Step 1: Create Command Directory
```bash
mkdir -p src/rewrite/commands/my-command
```

### Step 2: Define Configuration Schema
Create `src/rewrite/commands/my-command/config.ts`:

```typescript
import { z } from "zod";

export const MyCommandConfigSchema = z.object({
    // Required options
    enabled: z.boolean().default(true),
    
    // Optional options
    timeout: z.number().default(5000).describe("Timeout in milliseconds"),
    mode: z.enum(["fast", "thorough"]).default("fast"),
    
    // Complex options
    advanced: z.object({
        retries: z.number().default(3),
        delay: z.number().default(1000),
    }).optional(),
});

export type MyCommandConfig = z.infer<typeof MyCommandConfigSchema>;
```

### Step 3: Define TypeScript Types (Optional)
Create `src/rewrite/commands/my-command/types.ts`:

```typescript
export interface MyCommandContext {
    startTime: number;
    items: string[];
    results: Record<string, any>;
}

export type MyCommandResult = {
    success: boolean;
    itemsProcessed: number;
    duration: number;
};
```

### Step 4: Create Command Implementation
Create `src/rewrite/commands/my-command/index.ts`:

```typescript
import { createCommand } from "#/rewrite/command-registry";
import { MyCommandConfigSchema, type MyCommandConfig } from "./config";
import { createPreflightTask } from "#/rewrite/tasks/shared";
import { Task } from "#/rewrite/task-system";
import { ok, okAsync, err } from "neverthrow";
import type { WorkflowContext } from "#/rewrite/context";
import type { FireflyAsyncResult } from "#/rewrite/shared";

// Import or create your tasks
import { createMyTask1 } from "./tasks/my-task-1";
import { createMyTask2 } from "./tasks/my-task-2";

export const myCommand = createCommand<MyCommandConfig>({
    meta: {
        name: "my-command",
        description: "Does something useful",
        configSchema: MyCommandConfigSchema,
        examples: [
            "firefly my-command",
            "firefly my-command --enabled",
            "firefly my-command --mode thorough --timeout 10000"
        ]
    },
    
    buildTasks(ctx: WorkflowContext<MyCommandConfig>): FireflyAsyncResult<Task[]> {
        return okAsync([
            // Preflight checks
            createGitRepositoryCheckTask(),
            createRemoteCheckTask(),
            
            // Core workflow
            createMyTask1(),
            createMyTask2(),
            
            // Cleanup
            createMyCleanupTask(),
        ]);
    },
    
    // Optional: before command execution
    beforeExecute(ctx: WorkflowContext<MyCommandConfig>): FireflyAsyncResult<void> {
        console.log("Starting my-command...");
        return okAsync(undefined);
    },
    
    // Optional: after command execution
    afterExecute(ctx: WorkflowContext<MyCommandConfig>): FireflyAsyncResult<void> {
        console.log("Completed my-command!");
        return okAsync(undefined);
    },
});
```

### Step 5: Register Command
In `src/rewrite/cli/commander.ts`, add:

```typescript
import { myCommand } from "#/rewrite/commands/my-command";

// In setupCommands():
commandRegistry.register(myCommand);
```

### Step 6: Create Tasks (if needed)
See [Adding a New Task](#adding-a-new-task) section.

### Step 7: Add Tests
Create `src/rewrite/__tests__/commands/my-command.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { myCommand } from "#/rewrite/commands/my-command";
import { createTestContext } from "#/rewrite/__tests__/helpers/test-helpers";

describe("MyCommand", () => {
    test("should build tasks successfully", async () => {
        const ctx = createTestContext({
            enabled: true,
            mode: "fast"
        });
        
        const result = await myCommand.buildTasks(ctx);
        
        expect(result.isOk()).toBe(true);
        expect(result.value.length).toBeGreaterThan(0);
    });
    
    test("should include preflight tasks", async () => {
        const ctx = createTestContext({ enabled: true });
        const result = await myCommand.buildTasks(ctx);
        
        const taskIds = result.value.map(t => t.meta.id);
        expect(taskIds).toContain("git-repository-check");
    });
});
```

### Step 8: Test CLI
```bash
# Run your command
bun src/rewrite/cli/main.ts my-command --enabled

# With dry run
bun src/rewrite/cli/main.ts my-command --dry-run --verbose

# Check help
bun src/rewrite/cli/main.ts my-command --help
```

## Adding a New Task

### Step 1: Decide Task Category
- Shared tasks: `tasks/shared/`
- Command-specific: `tasks/{command-name}/`

### Step 2: Create Task File
Create `src/rewrite/tasks/my-category/my-tasks.ts`:

```typescript
import { TaskBuilder } from "#/rewrite/task-system";
import type { Task } from "#/rewrite/task-system";
import { ok, okAsync, err, errAsync } from "neverthrow";
import type { WorkflowContext } from "#/rewrite/context";
import { MyService } from "#/rewrite/shared/my-service";

export function createMyTask(): Task {
    const service = new MyService();
    
    return TaskBuilder.create("my-task-id")
        .description("Clear description of what this task does")
        
        // Declare dependencies
        .dependsOn("prerequisite-task-id")
        
        // Skip condition (optional)
        .skipWhen((ctx: WorkflowContext) => {
            // Determine if task should skip
            const shouldSkip = !ctx.config.enabled;
            return ok({ 
                shouldSkip,
                skipThrough: false // If true, dependents also skip
            });
        })
        
        // Main execution logic
        .execute(async (ctx: WorkflowContext) => {
            // 1. Get data from context
            const inputData = ctx.data.someInput;
            
            // 2. Use service
            const result = await service.performOperation(inputData);
            if (result.isErr()) {
                return errAsync(result.error);
            }
            
            // 3. Fork context with results
            return okAsync(ctx.fork("outputData", result.value));
        })
        
        // Rollback logic (optional)
        .withUndo(async (ctx: WorkflowContext) => {
            // Undo the operation
            await service.undoOperation();
            return okAsync();
        })
        
        // Before execution hook (optional)
        .beforeExecute(async (ctx: WorkflowContext) => {
            console.log("Starting my-task...");
            return okAsync();
        })
        
        // After execution hook (optional)
        .afterExecute(async (ctx: WorkflowContext) => {
            console.log("Completed my-task!");
            return okAsync();
        })
        
        .build();
}
```

### Step 3: Export Task
In `src/rewrite/tasks/my-category/index.ts`:

```typescript
export { createMyTask } from "./my-tasks";
```

### Step 4: Add Tests
Create `src/rewrite/__tests__/tasks/my-category/my-tasks.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { createMyTask } from "#/rewrite/tasks/my-category/my-tasks";
import { createTestContext, expectOk } from "#/rewrite/__tests__/helpers/test-helpers";

describe("createMyTask", () => {
    test("should execute successfully with valid input", async () => {
        const ctx = createTestContext({
            enabled: true,
        }, {
            someInput: "test-value"
        });
        
        const task = createMyTask();
        const result = await task.execute(ctx);
        
        expectOk(result);
        expect(result.value.data.outputData).toBeDefined();
    });
    
    test("should skip when disabled", async () => {
        const ctx = createTestContext({ enabled: false });
        const task = createMyTask();
        
        const skipResult = task.shouldSkip(ctx);
        
        expectOk(skipResult);
        expect(skipResult.value.shouldSkip).toBe(true);
    });
    
    test("should handle errors gracefully", async () => {
        const ctx = createTestContext({}, { someInput: "invalid" });
        const task = createMyTask();
        
        const result = await task.execute(ctx);
        
        expect(result.isErr()).toBe(true);
    });
});
```

## Adding a New Workflow

Workflows are compositions of multiple tasks. Use composition helpers from `task-system/task-composition.ts`.

### Sequential Workflow
```typescript
import { composeSequential } from "#/rewrite/task-system";

const versionWorkflow = composeSequential("version-workflow", [
    createInitVersionTask(),
    createCalculateVersionTask(),
    createUpdateVersionTask(),
]);
```

### Conditional Workflow
```typescript
import { composeConditional } from "#/rewrite/task-system";

const conditionalRelease = composeConditional(
    (ctx) => ctx.config.createRelease,
    createPlatformReleaseTask()
);
```

### Workflow with Retry
```typescript
import { composeRetry } from "#/rewrite/task-system";

const reliablePush = composeRetry(
    createPushTask(),
    { maxRetries: 3, delayMs: 1000 }
);
```

### Task Group
```typescript
import { composeGroup } from "#/rewrite/task-system";

const preflightGroup = composeGroup("preflight", [
    createGitRepositoryCheckTask(),
    createUncommittedChangesCheckTask(),
    createRemoteCheckTask(),
]);
```

### Custom Composition
```typescript
export function createCustomWorkflow(config: MyConfig): Task[] {
    const tasks: Task[] = [];
    
    // Always run preflight
    tasks.push(...createPreflightTasks());
    
    // Conditional based on config
    if (config.mode === "full") {
        tasks.push(createFullProcessingTask());
    } else {
        tasks.push(createQuickProcessingTask());
    }
    
    // Always run cleanup
    tasks.push(createCleanupTask());
    
    return tasks;
}
```

## Adding a New Service

### Step 1: Create Service Directory
```bash
mkdir -p src/rewrite/shared/my-service
```

### Step 2: Define Service Interface
Create `src/rewrite/shared/my-service/my-service.ts`:

```typescript
import { ok, okAsync, err, errAsync } from "neverthrow";
import type { FireflyResult, FireflyAsyncResult, FireflyError } from "#/rewrite/shared";
import { toFireflyError } from "#/rewrite/shared";

export class MyService {
    constructor(
        private workingDir: string = process.cwd()
    ) {}
    
    /**
     * Performs a synchronous operation.
     */
    public syncOperation(input: string): FireflyResult<string> {
        try {
            // Operation logic
            const result = input.toUpperCase();
            return ok(result);
        } catch (error) {
            return err(toFireflyError(error));
        }
    }
    
    /**
     * Performs an asynchronous operation.
     */
    public async asyncOperation(input: string): FireflyAsyncResult<string> {
        try {
            // Async operation logic
            const result = await this.doAsyncWork(input);
            return okAsync(result);
        } catch (error) {
            return errAsync(toFireflyError(error));
        }
    }
    
    /**
     * Private helper method.
     */
    private async doAsyncWork(input: string): Promise<string> {
        // Implementation
        return input.toLowerCase();
    }
}
```

### Step 3: Export Service
Create `src/rewrite/shared/my-service/index.ts`:

```typescript
export { MyService } from "./my-service";
```

### Step 4: Add to Shared Index
In `src/rewrite/shared/index.ts`:

```typescript
export { MyService } from "./my-service";
```

### Step 5: Add Tests
Create `src/rewrite/__tests__/shared/my-service.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { MyService } from "#/rewrite/shared/my-service";
import { expectOk, expectErr } from "#/rewrite/__tests__/helpers/test-helpers";

describe("MyService", () => {
    test("syncOperation should transform input", () => {
        const service = new MyService();
        const result = service.syncOperation("hello");
        
        expectOk(result);
        expect(result.value).toBe("HELLO");
    });
    
    test("asyncOperation should handle async work", async () => {
        const service = new MyService();
        const result = await service.asyncOperation("WORLD");
        
        expectOk(result);
        expect(result.value).toBe("world");
    });
    
    test("should handle errors gracefully", () => {
        const service = new MyService();
        // Test error case
    });
});
```

## Testing Guidelines

### Unit Tests
Test individual functions/methods in isolation.

```typescript
import { describe, test, expect } from "bun:test";

describe("MyFunction", () => {
    test("should return expected result", () => {
        const result = myFunction(input);
        expect(result).toBe(expected);
    });
});
```

### Integration Tests
Test multiple components working together.

```typescript
describe("Version Workflow", () => {
    test("should bump version end-to-end", async () => {
        const ctx = createTestContext({ bumpStrategy: "automatic" });
        const tasks = [
            createInitVersionTask(),
            createCalculateVersionTask(),
            createUpdateVersionTask(),
        ];
        
        let current = ctx;
        for (const task of tasks) {
            const result = await task.execute(current);
            expect(result.isOk()).toBe(true);
            current = result.value;
        }
        
        expect(current.data.nextVersion).toBeDefined();
    });
});
```

### Test Helpers
Use helpers from `__tests__/helpers/test-helpers.ts`:

```typescript
import {
    createTestContext,
    expectOk,
    expectErr,
    runTaskSequence,
    createMockTask,
} from "#/rewrite/__tests__/helpers/test-helpers";

// Create test context
const ctx = createTestContext({ option: true }, { data: "value" });

// Assert Result types
const result = await operation();
expectOk(result);
expect(result.value).toBe("expected");

// Run task sequence
const finalCtx = await runTaskSequence([task1, task2, task3], initialCtx);

// Mock task
const mockTask = createMockTask("mock-id", { shouldSkip: false });
```

### Coverage Goals
- Unit tests: 80%+ coverage
- Integration tests: Key workflows
- E2E tests: CLI commands

## Code Style

### TypeScript
- Use strict mode
- Prefer explicit types over `any`
- Use `type` for unions, `interface` for objects
- Use const assertions where appropriate

### Formatting
```typescript
// Use 4 spaces for indentation
function myFunction() {
    const value = "hello";
    return value;
}

// Use double quotes for strings
const message = "Hello world";

// Use trailing commas
const array = [
    item1,
    item2,
    item3,
];
```

### Naming
- Files: kebab-case (`my-file.ts`)
- Classes: PascalCase (`MyClass`)
- Functions: camelCase (`myFunction`)
- Constants: UPPER_SNAKE_CASE (`MY_CONSTANT`)
- Interfaces: PascalCase (`MyInterface`)
- Types: PascalCase (`MyType`)

### Imports
```typescript
// Order: external, internal, relative
import { z } from "zod";
import { okAsync } from "neverthrow";

import { MyService } from "#/rewrite/shared";
import { TaskBuilder } from "#/rewrite/task-system";

import { localHelper } from "./local-helper";
```

### Comments
```typescript
/**
 * Brief description of what the function does.
 * 
 * @param input - Description of parameter
 * @returns Description of return value
 * 
 * @example
 * ```typescript
 * const result = myFunction("input");
 * ```
 */
export function myFunction(input: string): string {
    // Inline comment for complex logic
    const processed = input.trim();
    return processed;
}
```

## PR Process

### 1. Create Branch
```bash
git checkout -b feature/my-feature
```

### 2. Make Changes
- Follow code style guidelines
- Write tests for new features
- Update documentation if needed

### 3. Test Locally
```bash
# Run tests
bun test

# Run linter
bun run lint

# Build
bun run build

# Test CLI
bun src/rewrite/cli/main.ts my-command
```

### 4. Commit Changes
```bash
# Use conventional commits
git add .
git commit -m "feat: add new command for X"

# Or use firefly itself (if available)
firefly commit
```

### 5. Push and Create PR
```bash
git push origin feature/my-feature
```

### 6. PR Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guide
- [ ] All tests passing
- [ ] No linting errors
- [ ] Changelog updated (if applicable)

### 7. PR Description Template
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
Describe testing performed.

## Screenshots (if applicable)
Add screenshots of UI changes.
```

### 8. Review Process
- Address reviewer feedback
- Update code as needed
- Re-request review after changes

## Summary

Remember the key points:
1. Use Task Builder for creating tasks
2. Return Result types, never throw exceptions
3. Keep contexts immutable (use fork)
4. Write comprehensive tests
5. Follow code style guidelines
6. Document your code

For questions, see:
- Architecture: `02-ARCHITECTURE.md`
- Core concepts: `03-CORE-CONCEPTS.md`
- Advanced topics: `05-ADVANCED.md`
