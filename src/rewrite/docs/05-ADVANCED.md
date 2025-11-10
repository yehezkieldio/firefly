# Advanced Topics and Patterns

This document covers advanced patterns, optimization techniques, debugging strategies, and other advanced topics for experienced contributors.

## Table of Contents

1. [Advanced Patterns](#advanced-patterns)
2. [Performance Optimization](#performance-optimization)
3. [Debugging Techniques](#debugging-techniques)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Security Considerations](#security-considerations)
6. [Migration Guide](#migration-guide)
7. [Extension Points](#extension-points)
8. [Monitoring & Observability](#monitoring--observability)

## Advanced Patterns

### Task Middleware
Create reusable task wrappers:

```typescript
function withLogging<T extends Task>(task: T): T {
    const original = task.execute;
    
    task.execute = async (ctx) => {
        console.log(`Starting ${task.meta.id}...`);
        const startTime = Date.now();
        
        const result = await original.call(task, ctx);
        
        const duration = Date.now() - startTime;
        console.log(`Completed ${task.meta.id} in ${duration}ms`);
        
        return result;
    };
    
    return task;
}

// Usage
const loggedTask = withLogging(createMyTask());
```

### Task Decorators
Add functionality to tasks:

```typescript
function withRetry(maxRetries: number) {
    return function<T extends Task>(task: T): T {
        const original = task.execute;
        
        task.execute = async (ctx) => {
            let lastError;
            for (let i = 0; i < maxRetries; i++) {
                const result = await original.call(task, ctx);
                if (result.isOk()) return result;
                lastError = result.error;
                await sleep(1000 * (i + 1)); // Exponential backoff
            }
            return err(lastError);
        };
        
        return task;
    };
}

// Usage
const retriedTask = withRetry(3)(createMyTask());
```

### Complex Task Compositions
Build complex workflows:

```typescript
export function createAdvancedWorkflow(config: Config): Task[] {
    const tasks: Task[] = [];
    
    // Preflight group
    tasks.push(
        composeGroup("preflight", [
            createGitRepositoryCheckTask(),
            createRemoteCheckTask(),
        ])
    );
    
    // Conditional execution
    if (config.mode === "full") {
        // Full mode workflow
        tasks.push(
            composeSequential("full-workflow", [
                createTask1(),
                composeRetry(createTask2(), { maxRetries: 3 }),
                createTask3(),
            ])
        );
    } else {
        // Quick mode workflow
        tasks.push(
            composeSequential("quick-workflow", [
                createTask1(),
                createTask3(), // Skip task2
            ])
        );
    }
    
    // Parallel alternatives (future)
    // tasks.push(
    //     composeParallel([task4, task5, task6])
    // );
    
    // Cleanup (always runs)
    tasks.push(createCleanupTask());
    
    return tasks;
}
```

### Custom Context Extensions
Extend context with utilities:

```typescript
interface ExtendedContext extends WorkflowContext {
    helpers: {
        formatDuration(ms: number): string;
        logProgress(message: string): void;
        trackMetric(name: string, value: number): void;
    };
}

function createExtendedContext(ctx: WorkflowContext): ExtendedContext {
    return {
        ...ctx,
        helpers: {
            formatDuration: (ms) => `${(ms / 1000).toFixed(2)}s`,
            logProgress: (msg) => console.log(`[Progress] ${msg}`),
            trackMetric: (name, value) => {
                // Send to metrics system
            },
        },
    };
}
```

## Performance Optimization

### Caching Strategies

#### Service-Level Caching
```typescript
export class MyService {
    private cache = new Map<string, any>();
    
    public async expensiveOperation(key: string): FireflyAsyncResult<any> {
        // Check cache
        if (this.cache.has(key)) {
            return okAsync(this.cache.get(key));
        }
        
        // Perform operation
        const result = await this.doExpensiveWork(key);
        if (result.isErr()) return errAsync(result.error);
        
        // Cache result
        this.cache.set(key, result.value);
        
        return okAsync(result.value);
    }
}
```

#### Context-Level Caching
```typescript
export function createCachedTask(): Task {
    return TaskBuilder.create("cached-task")
        .execute(async (ctx) => {
            // Check if already computed
            if (ctx.data.cachedResult) {
                return okAsync(ctx);
            }
            
            // Compute
            const result = await expensiveComputation();
            
            // Cache in context
            return okAsync(ctx.fork("cachedResult", result));
        })
        .build();
}
```

### Lazy Loading
```typescript
class LazyService {
    private _instance?: HeavyDependency;
    
    private get instance(): HeavyDependency {
        if (!this._instance) {
            this._instance = new HeavyDependency();
        }
        return this._instance;
    }
    
    public operation(): FireflyResult<any> {
        return this.instance.doWork();
    }
}
```

### Batch Operations
```typescript
export function createBatchTask(): Task {
    return TaskBuilder.create("batch-task")
        .execute(async (ctx) => {
            const items = ctx.data.items as string[];
            
            // Process in batches
            const batchSize = 10;
            const results = [];
            
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(item => processItem(item))
                );
                results.push(...batchResults);
            }
            
            return okAsync(ctx.fork("results", results));
        })
        .build();
}
```

### Profiling
```typescript
class PerformanceProfiler {
    private metrics = new Map<string, number[]>();
    
    public track(name: string, operation: () => any): any {
        const start = performance.now();
        const result = operation();
        const duration = performance.now() - start;
        
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(duration);
        
        return result;
    }
    
    public report(): void {
        for (const [name, durations] of this.metrics) {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const max = Math.max(...durations);
            console.log(`${name}: avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
        }
    }
}
```

## Debugging Techniques

### Verbose Mode
Enable detailed logging:

```typescript
if (ctx.config.verbose) {
    console.log(`[Task: ${task.meta.id}] Starting execution`);
    console.log(`[Task: ${task.meta.id}] Context data:`, ctx.data);
}
```

### Context Inspection
Inspect context at any point:

```typescript
export function inspectContext(ctx: WorkflowContext, label: string): void {
    console.log(`\n=== Context Inspection: ${label} ===`);
    console.log("Config:", JSON.stringify(ctx.config, null, 2));
    console.log("Data:", JSON.stringify(ctx.data, null, 2));
    console.log("===\n");
}

// In task
.execute(async (ctx) => {
    inspectContext(ctx, "Before operation");
    // ... operation
    inspectContext(newCtx, "After operation");
    return okAsync(newCtx);
})
```

### Error Tracking
Track errors with context:

```typescript
export class ErrorTracker {
    private errors: Array<{
        taskId: string;
        error: FireflyError;
        context: any;
        timestamp: Date;
    }> = [];
    
    public track(taskId: string, error: FireflyError, ctx: WorkflowContext): void {
        this.errors.push({
            taskId,
            error,
            context: { config: ctx.config, data: ctx.data },
            timestamp: new Date(),
        });
    }
    
    public report(): void {
        console.log("\n=== Error Report ===");
        for (const entry of this.errors) {
            console.log(`Task: ${entry.taskId}`);
            console.log(`Error: ${entry.error.message}`);
            console.log(`Time: ${entry.timestamp.toISOString()}`);
            console.log(`Context:`, entry.context);
            console.log("---");
        }
    }
}
```

### Execution Timeline
Track execution flow:

```typescript
export class ExecutionTimeline {
    private events: Array<{
        type: "task-start" | "task-end" | "task-skip" | "task-error";
        taskId: string;
        timestamp: number;
        data?: any;
    }> = [];
    
    public record(type: string, taskId: string, data?: any): void {
        this.events.push({
            type: type as any,
            taskId,
            timestamp: Date.now(),
            data,
        });
    }
    
    public visualize(): void {
        console.log("\n=== Execution Timeline ===");
        const startTime = this.events[0]?.timestamp || 0;
        
        for (const event of this.events) {
            const elapsed = event.timestamp - startTime;
            const icon = {
                "task-start": "▶",
                "task-end": "✓",
                "task-skip": "⊘",
                "task-error": "✗",
            }[event.type];
            
            console.log(`[+${elapsed}ms] ${icon} ${event.taskId}`);
        }
    }
}
```

## Troubleshooting Guide

### Common Issues

#### Issue: Task Dependencies Not Resolved
**Symptoms:** Tasks run in wrong order, or dependency errors occur.

**Solution:**
1. Check that dependencies are declared correctly:
   ```typescript
   TaskBuilder.create("my-task")
       .dependsOn("prerequisite-task") // Ensure correct ID
   ```

2. Verify prerequisite task is registered:
   ```typescript
   const tasks = command.buildTasks(ctx);
   console.log(tasks.map(t => t.meta.id)); // Check IDs
   ```

3. Check for circular dependencies:
   ```typescript
   // Task A depends on B, B depends on A → circular!
   ```

#### Issue: Context Mutations Not Persisting
**Symptoms:** Data added to context doesn't appear in subsequent tasks.

**Solution:**
Context is immutable. Always return forked context:
```typescript
// Wrong ❌
ctx.data.version = "1.0.0";
return okAsync(ctx); // Original context unchanged

// Right ✅
const newCtx = ctx.fork("version", "1.0.0");
return okAsync(newCtx); // New context with data
```

#### Issue: Errors Not Being Caught
**Symptoms:** Unhandled promise rejections, crashes.

**Solution:**
Always check Result types:
```typescript
// Wrong ❌
const result = await service.operation();
const value = result.value; // Might crash if error

// Right ✅
const result = await service.operation();
if (result.isErr()) {
    return errAsync(result.error);
}
const value = result.value; // Safe
```

#### Issue: Skip Conditions Not Working
**Symptoms:** Tasks run when they should skip, or vice versa.

**Solution:**
Check skip condition logic:
```typescript
.skipWhen((ctx) => {
    // Ensure condition is correct
    const shouldSkip = !ctx.config.enabled;
    console.log(`Should skip: ${shouldSkip}`); // Debug
    return ok({ shouldSkip });
})
```

### Debug Workflow

1. **Enable Verbose Mode**
   ```bash
   firefly my-command --verbose
   ```

2. **Add Logging**
   ```typescript
   console.log("[DEBUG]", data);
   ```

3. **Use Dry Run**
   ```bash
   firefly my-command --dry-run
   ```

4. **Check Context at Each Step**
   ```typescript
   inspectContext(ctx, "checkpoint");
   ```

5. **Run Tests**
   ```bash
   bun test
   ```

## Security Considerations

### Input Validation
Always validate user input:

```typescript
import { ValidationService } from "#/rewrite/shared";

const validator = new ValidationService();

// Validate version
const versionResult = validator.validateVersion(userInput);
if (versionResult.isErr()) {
    return err(versionResult.error);
}

// Validate commit message
const commitResult = validator.validateCommitMessage(userInput);
```

### API Key Management
Never hardcode secrets:

```typescript
// Wrong ❌
const apiKey = "sk-abc123...";

// Right ✅
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    return err(toFireflyError("MISSING_API_KEY", "API key not configured"));
}
```

### Command Injection Prevention
Sanitize inputs used in shell commands:

```typescript
// Wrong ❌
await exec(`git commit -m "${userMessage}"`); // Vulnerable

// Right ✅
await exec("git", ["commit", "-m", userMessage]); // Safe
```

### File Path Validation
Validate file paths to prevent directory traversal:

```typescript
import path from "path";

function isPathSafe(filePath: string, baseDir: string): boolean {
    const resolved = path.resolve(baseDir, filePath);
    return resolved.startsWith(baseDir);
}
```

## Migration Guide

### From Old to New Architecture

#### Step 1: Understand Differences
See `02-ARCHITECTURE.md` § Comparison: Old vs New

#### Step 2: Migrate Commands

**Old:**
```typescript
export class ReleaseCommand extends Command {
    async execute(context: Context): Promise<void> {
        // Implementation
    }
}
```

**New:**
```typescript
export const releaseCommand = createCommand({
    meta: { name: "release", configSchema: ReleaseConfigSchema },
    buildTasks(ctx) {
        return okAsync([/* tasks */]);
    }
});
```

#### Step 3: Migrate Tasks

**Old:**
```typescript
export class BumpVersionTask extends Task {
    async execute(context: Context): Promise<void> {
        context.version = newVersion; // Mutation
    }
}
```

**New:**
```typescript
export function createBumpVersionTask(): Task {
    return TaskBuilder.create("bump-version")
        .execute((ctx) => okAsync(ctx.fork("version", newVersion)))
        .build();
}
```

#### Step 4: Migrate Context Usage

**Old:**
```typescript
context.version = "1.0.0"; // Mutable
context.data.push(item); // Side effects
```

**New:**
```typescript
const ctx2 = ctx.fork("version", "1.0.0"); // Immutable
const ctx3 = ctx2.fork("data", [...ctx2.data.data, item]); // Immutable
```

#### Step 5: Migrate Error Handling

**Old:**
```typescript
try {
    await operation();
} catch (error) {
    throw error;
}
```

**New:**
```typescript
const result = await operation();
if (result.isErr()) {
    return errAsync(result.error);
}
```

## Extension Points

### Adding Custom AI Providers
Implement the `AIProvider` interface:

```typescript
import { AIProvider } from "#/rewrite/shared/ai-provider";

export class ClaudeProvider implements AIProvider {
    async generateCommit(
        diff: string,
        context: CommitContext
    ): FireflyAsyncResult<string> {
        // Call Claude API
        // Return commit message
    }
}

// Register
aiProviderService.registerProvider("claude", new ClaudeProvider());
```

### Adding Custom Validators
Extend ValidationService:

```typescript
export class CustomValidationService extends ValidationService {
    public validateCustom(input: string): FireflyResult<boolean> {
        // Custom validation logic
        return ok(true);
    }
}
```

### Adding Custom Task Types
Create task factories:

```typescript
export function createInteractiveTask(prompt: string): Task {
    return TaskBuilder.create(`interactive-${Date.now()}`)
        .execute(async (ctx) => {
            const answer = await promptUser(prompt);
            return okAsync(ctx.fork("answer", answer));
        })
        .build();
}
```

## Monitoring & Observability

### Metrics Collection
```typescript
export class MetricsCollector {
    private metrics = {
        tasksExecuted: 0,
        tasksSkipped: 0,
        tasksFailed: 0,
        totalDuration: 0,
    };
    
    public recordTaskExecution(duration: number): void {
        this.metrics.tasksExecuted++;
        this.metrics.totalDuration += duration;
    }
    
    public recordTaskSkip(): void {
        this.metrics.tasksSkipped++;
    }
    
    public recordTaskFailure(): void {
        this.metrics.tasksFailed++;
    }
    
    public report(): void {
        console.log("\n=== Metrics ===");
        console.log(`Tasks executed: ${this.metrics.tasksExecuted}`);
        console.log(`Tasks skipped: ${this.metrics.tasksSkipped}`);
        console.log(`Tasks failed: ${this.metrics.tasksFailed}`);
        console.log(`Total duration: ${this.metrics.totalDuration}ms`);
    }
}
```

### Telemetry
```typescript
export class TelemetryService {
    public trackCommand(commandName: string, duration: number, success: boolean): void {
        // Send to telemetry backend
        this.send({
            event: "command_executed",
            properties: {
                command: commandName,
                duration,
                success,
                timestamp: new Date().toISOString(),
            },
        });
    }
}
```

### Health Checks
```typescript
export class HealthChecker {
    public async checkSystem(): Promise<HealthStatus> {
        const checks = await Promise.all([
            this.checkGitAvailable(),
            this.checkDiskSpace(),
            this.checkNetworkConnectivity(),
        ]);
        
        return {
            healthy: checks.every(c => c.ok),
            checks,
        };
    }
}
```

## Summary

Advanced topics covered:
- Task middleware and decorators
- Performance optimization strategies
- Debugging techniques and tools
- Troubleshooting common issues
- Security best practices
- Migration from old architecture
- Extension points for customization
- Monitoring and observability

For foundational topics, see:
- Architecture: `02-ARCHITECTURE.md`
- Core concepts: `03-CORE-CONCEPTS.md`
- Contributing: `04-CONTRIBUTING.md`
