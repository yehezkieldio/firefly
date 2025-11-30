# Firefly Context Module Documentation

## Overview

The Context Module provides an immutable, type-safe workflow context system for Firefly's execution engine. It implements a functional programming pattern where context flows through tasks, accumulating data without mutation.

### Key Features

- **Immutability Guarantee**: Context is never mutated; updates produce new instances
- **Structural Sharing**: Efficient memory usage by reusing unchanged references
- **Type-Safe Access**: Full TypeScript generics for config, data, and services
- **Fork Pattern**: Functional-style updates via `fork()` and `forkMultiple()`
- **Builder Pattern**: Fluent API for context construction
- **Service Integration**: Lazy-resolved services available to all tasks
- **Testing Support**: Easy mocking via `ContextBuilder.forTesting()`

## Usage Guide

### Creating a Context with the Builder

```typescript
import { ContextBuilder } from "#/core/context/context.builder";

// Production usage - auto-resolves services
const context = ContextBuilder.create<MyConfig>("/path/to/project")
  .withConfig({
    version: "1.0.0",
    dryRun: false,
  })
  .withData("startedAt", new Date())
  .build();

if (context.isOk()) {
  const ctx = context.value;
  console.log(ctx.config.version); // "1.0.0"
}
```

### Creating a Context for Testing

```typescript
import { ContextBuilder } from "#/core/context/context.builder";

const mockServices = {
  fs: mockFileSystemService,
  git: mockGitService,
};

const testContext = ContextBuilder.forTesting<TestConfig, TestData, typeof mockServices>()
  .withConfig({ testMode: true })
  .withServices(mockServices)
  .withData("fixture", "test-value")
  .build();
```

### Using ImmutableWorkflowContext Directly

```typescript
import { ImmutableWorkflowContext } from "#/core/context/workflow.context";

const context = ImmutableWorkflowContext.create<MyConfig, MyData, MyServices>(
  config,
  services,
  { initialKey: "initialValue" }
);
```

### Updating Context with Fork

```typescript
// Single value update - returns new context
const ctx2 = ctx1.fork("processedAt", new Date());

// Multiple value update
const ctx3 = ctx1.forkMultiple({
  status: "complete",
  result: computedResult,
});

// Chaining updates
const ctx4 = ctx1
  .fork("step", 1)
  .fork("status", "processing")
  .fork("progress", 0.5);
```

### Accessing Data Safely

```typescript
// Type-safe access with Result
const valueResult = context.get("someKey");
if (valueResult.isOk()) {
  console.log(valueResult.value);
} else {
  console.error("Key not found");
}

// Check existence
if (context.has("optionalKey")) {
  // Safe to access
}

// Get frozen snapshot
const snapshot = context.snapshot();
```

---

## Best Practices

### 1. Use Fork for All Updates

```typescript
// ❌ Bad: Attempting to mutate (won't compile with proper types)
context.data.newKey = "value";

// ✅ Good: Use fork
const newContext = context.fork("newKey", "value");
```

### 2. Chain Forks for Multiple Updates

```typescript
// ❌ Bad: Multiple intermediate contexts
const ctx1 = context.fork("a", 1);
const ctx2 = ctx1.fork("b", 2);
const ctx3 = ctx2.fork("c", 3);

// ✅ Good: Use forkMultiple for related updates
const newContext = context.forkMultiple({
  a: 1,
  b: 2,
  c: 3,
});

// ✅ Also good: Chain when updates are sequential in logic
const result = context
  .fork("step", "validate")
  .fork("validated", true);
```

### 3. Define Typed Context for Commands

```typescript
// Define your types
type ReleaseConfig = {
  version: string;
  dryRun: boolean;
  changelog: boolean;
};

type ReleaseData = {
  previousVersion?: string;
  commits?: Commit[];
  changelogContent?: string;
};

type ReleaseServices = ResolvedServices<["fs", "git"]>;

// Use typed context
type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ReleaseServices>;
```

### 4. Use Builder for Complex Setup

```typescript
// ✅ Good: Clear, readable setup
const context = ContextBuilder.create<Config>("/project")
  .withConfig(config)
  .withData("startTime", new Date())
  .withDataBatch({
    environment: process.env.NODE_ENV,
    user: process.env.USER,
  })
  .build();
```

### 5. Always Handle Builder Results

```typescript
const contextResult = ContextBuilder.create<Config>(basePath)
  .withConfig(config)
  .build();

if (contextResult.isErr()) {
  // Handle error - missing services, invalid config, etc.
  return FireflyErrAsync(contextResult.error);
}

const context = contextResult.value;
```

---

## Cheatsheet

### Context Creation

```typescript
// Via Builder (production)
ContextBuilder.create<Config>(basePath)
  .withConfig(config)
  .build();

// Via Builder (testing)
ContextBuilder.forTesting<Config, Data, Services>()
  .withConfig(config)
  .withServices(mockServices)
  .build();

// Direct creation
ImmutableWorkflowContext.create<Config, Data, Services>(
  config,
  services,
  initialData
);
```

### Context Updates

```typescript
context.fork("key", value);                  // Single update
context.forkMultiple({ a: 1, b: 2 });        // Multiple updates
context.fork("a", 1).fork("b", 2);           // Chained updates
```

### Context Access

```typescript
context.config                               // Frozen config object
context.data                                 // Frozen data object (via snapshot)
context.services                             // Service container
context.get("key")                           // FireflyResult<T>
context.has("key")                           // boolean
context.snapshot()                           // Frozen data copy
context.startTime                            // Date
```

### Builder Methods

```typescript
.withConfig(config)                          // Set full config
.withPartialConfig(partial)                  // Merge partial config
.withData("key", value)                      // Add single data value
.withMockedData("key", value)                // Alias for withData (testing)
.withDataBatch({ k1: v1, k2: v2 })           // Add multiple data values
.withBasePath("/path")                       // Set service instantiation path
.withServices(services)                      // Override services (mocking)
.build()                                     // Create WorkflowContext
```

---

## Common Patterns

### Pattern: Task Context Flow

```typescript
// Task receives context, returns updated context
const processTask = TaskBuilder.create<MyContext>("process")
  .description("Processes data")
  .execute((ctx) => {
    const result = processData(ctx.data.input);

    // Return new context with result
    return FireflyOkAsync(ctx.forkMultiple({
      processedAt: new Date(),
      result: result,
    }));
  })
  .build();
```

### Pattern: Conditional Data Updates

```typescript
execute: (ctx) => {
  const newCtx = ctx.config.verbose
    ? ctx.forkMultiple({
        logs: [...(ctx.data.logs ?? []), logEntry],
        lastLogAt: new Date(),
      })
    : ctx.fork("lastLogAt", new Date());

  return FireflyOkAsync(newCtx);
}
```

### Pattern: Service Access in Tasks

```typescript
execute: (ctx) => {
  // Services are typed based on command requirements
  const fs = ctx.services.fs;
  const git = ctx.services.git;

  return fs.readFile(ctx.config.inputPath)
    .andThen((content) => git.add(ctx.config.inputPath))
    .map(() => ctx.fork("fileProcessed", true));
}
```

### Pattern: Data Accumulation Across Tasks

```typescript
// Task 1: Gather commits
const gatherCommits = TaskBuilder.create("gather-commits")
  .execute((ctx) => {
    return ctx.services.git.getCommits()
      .map((commits) => ctx.fork("commits", commits));
  });

// Task 2: Analyze commits (depends on gather-commits)
const analyzeCommits = TaskBuilder.create("analyze-commits")
  .dependsOn("gather-commits")
  .execute((ctx) => {
    const analysis = analyzeCommitTypes(ctx.data.commits!);
    return FireflyOkAsync(ctx.fork("analysis", analysis));
  });

// Task 3: Generate changelog (depends on analyze-commits)
const generateChangelog = TaskBuilder.create("generate-changelog")
  .dependsOn("analyze-commits")
  .execute((ctx) => {
    const changelog = buildChangelog(ctx.data.commits!, ctx.data.analysis!);
    return FireflyOkAsync(ctx.fork("changelog", changelog));
  });
```

---

## Advanced Use Cases

### Custom Context with Extended Services

```typescript
// Define extended service requirements
interface ExtendedServices extends ResolvedServices<["fs", "git"]> {
  cache: ICacheService;
  metrics: IMetricsService;
}

type ExtendedContext = WorkflowContext<Config, Data, ExtendedServices>;

// Create with custom services
const context = ContextBuilder.forTesting<Config, Data, ExtendedServices>()
  .withConfig(config)
  .withServices({
    fs: fileSystemService,
    git: gitService,
    cache: cacheService,
    metrics: metricsService,
  })
  .build();
```

### Context Transformation Helper

```typescript
// Helper to transform context data through a pipeline
function transformContext<TConfig, TData, TServices>(
  ctx: WorkflowContext<TConfig, TData, TServices>,
  transforms: Array<(data: Partial<TData>) => Partial<TData>>
): WorkflowContext<TConfig, TData, TServices> {
  const updates = transforms.reduce(
    (acc, transform) => ({ ...acc, ...transform(acc) }),
    {} as Partial<TData>
  );
  return ctx.forkMultiple(updates);
}

// Usage
const newCtx = transformContext(ctx, [
  (data) => ({ step: (data.step ?? 0) + 1 }),
  (data) => ({ status: `Step ${data.step} complete` }),
]);
```

### Snapshot for Debugging/Logging

```typescript
execute: (ctx) => {
  // Take snapshot for logging (frozen, safe to log)
  const snapshot = ctx.snapshot();
  logger.debug("Context state:", JSON.stringify(snapshot, null, 2));

  // Process and update
  return processAndUpdate(ctx);
}
```

---

## Troubleshooting

### "Key not found" when using get()

```typescript
// ❌ Error: Key doesn't exist in data
const result = context.get("nonExistentKey");
// result.isErr() === true

// ✅ Solution: Check with has() first or use optional chaining
if (context.has("optionalKey")) {
  const value = context.get("optionalKey").value;
}

// ✅ Or: Access via snapshot with optional chaining
const value = context.snapshot().optionalKey;
```

### Context Not Updating in Tests

```typescript
// ❌ Problem: Ignoring the new context
const ctx1 = createTestContext();
ctx1.fork("key", "value");  // Returns new context, but it's ignored!
expect(ctx1.data.key).toBe("value");  // Fails!

// ✅ Solution: Capture the returned context
const ctx1 = createTestContext();
const ctx2 = ctx1.fork("key", "value");
expect(ctx2.snapshot().key).toBe("value");  // Passes
```

### Services Not Available

```typescript
// ❌ Error: Service not resolved
context.services.git.commit(...);  // Error: 'git' is undefined

// ✅ Solution: Ensure service is in requiredServices
const command = createCommand({
  meta: {
    requiredServices: defineServiceKeys("fs", "git"),  // Include git
    // ...
  },
});
```

### Type Errors with Fork

```typescript
// ❌ Error: Type not matching Data definition
type MyData = { count: number };
ctx.fork("count", "string");  // Type error!

// ✅ Solution: Ensure value matches the type in Data
ctx.fork("count", 42);  // Correct

// ❌ Error: Key not in Data type
ctx.fork("unknownKey", value);  // Type error!

// ✅ Solution: Add key to your Data type definition
type MyData = {
  count: number;
  unknownKey?: string;  // Add the key
};
```

### Builder Returning Error

```typescript
// ❌ Problem: Build fails
const result = ContextBuilder.create<Config>(basePath)
  .withConfig(config)
  .build();

if (result.isErr()) {
  // Common causes:
  // 1. Missing required config fields
  // 2. Invalid basePath
  // 3. Service resolution failed
  console.error(result.error.message);
}

// ✅ Solution: Check error message and ensure all requirements are met
```
