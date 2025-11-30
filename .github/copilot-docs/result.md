# Firefly Result Module Documentation

## Overview

The Result Module is the foundation of Firefly's error handling strategy. It provides a Rust-inspired, type-safe approach to handling success and failure states without using exceptions. Built on top of `neverthrow`, it offers explicit error handling through discriminated union types.

### Key Features

- **No Exceptions**: Eliminates `try/catch` with explicit `Result` types
- **Type Safety**: Full TypeScript support with discriminated unions
- **Standardized Errors**: Consistent `FireflyError` structure across the codebase
- **Error Factories**: Pre-built error constructors for common failure scenarios
- **Result Utilities**: Rich set of combinators for composing and transforming results
- **Schema Integration**: Seamless Zod schema validation with Result semantics
- **Async Support**: First-class support for asynchronous operations via `ResultAsync`

## Usage Guide

### Creating Results

```typescript
import { FireflyOk, FireflyErr, FireflyOkAsync, FireflyErrAsync } from "#/core/result/result.constructors";
import { validationError } from "#/core/result/error.factories";

// Synchronous success
function computeValue(): FireflyResult<number> {
  return FireflyOk(42);
}

// Synchronous failure
function validateInput(input: string): FireflyResult<string> {
  if (!input.trim()) {
    return FireflyErr(validationError({ message: "Input cannot be empty" }));
  }
  return FireflyOk(input);
}

// Asynchronous success
function fetchData(): FireflyAsyncResult<Data> {
  return FireflyOkAsync(cachedData);
}

// Asynchronous failure
function fetchUser(id: string): FireflyAsyncResult<User> {
  if (!id) {
    return FireflyErrAsync(validationError({ message: "User ID required" }));
  }
  return wrapPromise(api.getUser(id));
}
```

### Result Types

```typescript
import type { FireflyResult, FireflyAsyncResult } from "#/core/result/result.types";

// Synchronous result - use for pure computations
function parseVersion(input: string): FireflyResult<Version> {
  // ...
}

// Asynchronous result - use for I/O operations
// Do NOT mark as async, do NOT wrap in Promise
function readConfig(path: string): FireflyAsyncResult<Config> {
  return wrapPromise(fs.readFile(path, "utf-8"))
    .andThen((content) => parseConfig(content));
}

// Promise<FireflyResult<T>> - use when awaiting inside function body
async function processWorkflow(id: string): Promise<FireflyResult<WorkflowResult>> {
  const configResult = await readConfig("./config.json");
  if (configResult.isErr()) return FireflyErr(configResult.error);

  const workflowResult = await executeWorkflow(configResult.value);
  return workflowResult;
}
```

### Handling Results

```typescript
// Using isOk() / isErr() guards
const result = computeValue();

if (result.isOk()) {
  console.log("Success:", result.value);
} else {
  console.error("Error:", result.error.message);
}

// Using map/andThen for transformations
const transformed = result
  .map((value) => value * 2)
  .andThen((doubled) =>
    doubled > 100
      ? validationErr({ message: "Value too large" })
      : FireflyOk(doubled)
  );

// Using match for exhaustive handling
const message = result.match(
  (value) => `Got value: ${value}`,
  (error) => `Failed: ${error.message}`,
);
```

### Error Shorthand Constructors

```typescript
import {
  validationErr,
  validationErrAsync,
  notFoundErr,
  notFoundErrAsync,
  conflictErr,
  conflictErrAsync,
  failedErr,
  failedErrAsync,
  invalidErr,
  invalidErrAsync,
  timeoutErr,
  timeoutErrAsync,
  unexpectedErr,
  unexpectedErrAsync,
} from "#/core/result/result.constructors";

// Validation errors
if (!isValidSemver(version)) {
  return validationErr({ message: "Invalid semver format" });
}

// Not found errors
if (!configFile) {
  return notFoundErrAsync({ message: "Config file not found", source: "cli" });
}

// Conflict errors
if (tagExists) {
  return conflictErr({ message: `Tag ${tag} already exists` });
}

// Failed operation errors
if (exitCode !== 0) {
  return failedErr({ message: "Command failed", details: stderr });
}

// Invalid state errors
if (!task.execute) {
  return invalidErr({ message: "Task must have an execute function" });
}

// Timeout errors
return timeoutErrAsync({ message: "Operation timed out after 30s" });

// Unexpected errors
return unexpectedErr({ message: "Unknown error occurred", cause: e });
```

### Creating Custom Errors

```typescript
import {
  validationError,
  notFoundError,
  conflictError,
  ioError,
  timeoutError,
  failedError,
  invalidError,
  unexpectedError,
  createFireflyError,
  toFireflyError,
} from "#/core/result/error.factories";

// Using factory functions
const error = validationError({
  message: "Invalid configuration",
  source: "config-loader",
  details: { field: "version", expected: "semver" },
});

// Converting unknown errors
function handleUnknown(e: unknown): FireflyError {
  return toFireflyError(e, "UNEXPECTED", "my-module");
}

// Creating custom error with stack trace
const customError = createFireflyError({
  code: "VALIDATION",
  message: "Custom validation failed",
  details: { validationRules: ["rule1", "rule2"] },
  retryable: false,
});
```

### Wrapping Promises

```typescript
import { wrapPromise } from "#/core/result/result.utilities";

// Convert any Promise to FireflyAsyncResult
function fetchUser(id: string): FireflyAsyncResult<User> {
  return wrapPromise(api.getUser(id));
}

// Chain with other Result operations
function getUserPosts(userId: string): FireflyAsyncResult<Post[]> {
  return wrapPromise(api.getUser(userId))
    .andThen((user) => wrapPromise(api.getPosts(user.id)));
}
```

### Schema Validation

```typescript
import { parseSchema, parseSchemaAsync } from "#/core/result/schema.utilities";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

// Synchronous validation
function validateUser(data: unknown): FireflyResult<User> {
  return parseSchema(UserSchema, data);
}

// Asynchronous validation
function validateUserAsync(data: unknown): FireflyAsyncResult<User> {
  return parseSchemaAsync(UserSchema, data);
}

// With schema composition
import { composeEffects, composeShape } from "#/core/result/schema.utilities";

const BaseSchema = z.object({ id: z.string() });
const ExtendedSchema = composeShape(BaseSchema, { name: z.string() });

const result = parseSchema(ExtendedSchema, data);
```

---

## Best Practices

### 1. Never Use try/catch or throw

```typescript
// ❌ Bad: Using exceptions
function riskyOperation(): string {
  try {
    return performOperation();
  } catch (e) {
    throw new Error("Operation failed");
  }
}

// ✅ Good: Using Result
function safeOperation(): FireflyResult<string> {
  const result = performOperation();
  if (!result) {
    return failedErr({ message: "Operation failed" });
  }
  return FireflyOk(result);
}
```

### 2. Always Handle Results Explicitly

```typescript
// ❌ Bad: Ignoring the Result
const result = validateInput(input);
// Proceeding without checking...

// ✅ Good: Explicit handling
const result = validateInput(input);
if (result.isErr()) {
  return FireflyErr(result.error);
}
const validInput = result.value;
```

### 3. Use Appropriate Result Type

```typescript
// ❌ Bad: Wrapping FireflyAsyncResult in Promise
function getData(): Promise<FireflyAsyncResult<Data>> {
  return Promise.resolve(FireflyOkAsync(data));
}

// ✅ Good: Return FireflyAsyncResult directly
function getData(): FireflyAsyncResult<Data> {
  return FireflyOkAsync(data);
}

// ✅ Good: Use Promise<FireflyResult> when awaiting inside
async function getProcessedData(): Promise<FireflyResult<Data>> {
  const rawResult = await fetchRawData();
  if (rawResult.isErr()) return FireflyErr(rawResult.error);
  return processData(rawResult.value);
}
```

### 4. Keep Method Chains Shallow

```typescript
// ❌ Bad: Deep chaining obscures intent
const result = data
  .andThen(validate)
  .andThen(transform)
  .andThen(enrich)
  .andThen(format)
  .andThen(save)
  .map(toResponse);

// ✅ Good: Named intermediate results (max 3 links)
const validated = data.andThen(validate);
const transformed = validated.andThen(transform);
const enriched = transformed.andThen(enrich);
const saved = enriched.andThen(format).andThen(save);
const response = saved.map(toResponse);
```

### 5. Use Descriptive Error Messages

```typescript
// ❌ Bad: Vague error messages
return validationErr({ message: "Invalid" });
return failedErr({ message: "Error" });

// ✅ Good: Descriptive with context
return validationErr({
  message: "Version must be valid semver (e.g., 1.0.0)",
  source: "version-validator",
  details: { received: version },
});

return failedErr({
  message: `Git commit failed with exit code ${code}`,
  source: "git-service",
  details: { stderr, command: "git commit" },
});
```

### 6. Provide Source for Error Tracing

```typescript
// ✅ Good: Include source for debugging
return notFoundErr({
  message: "Config file not found",
  source: "config-loader",  // Helps trace error origin
});
```

### 7. Use Error Shorthand Constructors

```typescript
// ❌ Verbose: Manual error construction
return FireflyErr(validationError({ message: "Invalid input" }));

// ✅ Concise: Use shorthand
return validationErr({ message: "Invalid input" });
```

---

## Cheatsheet

### Result Constructors Quick Reference

```typescript
// Sync success
FireflyOk(value)

// Sync error
FireflyErr(fireflyError)

// Async success
FireflyOkAsync(value)

// Async error
FireflyErrAsync(fireflyError)
```

### Error Shorthand Constructors

```typescript
// Sync versions
validationErr({ message, source?, details? })
notFoundErr({ message, source?, details? })
conflictErr({ message, source?, details? })
failedErr({ message, source?, details? })
invalidErr({ message, source?, details? })
timeoutErr({ message, source?, details? })
unexpectedErr({ message, source?, details? })

// Async versions (append "Async")
validationErrAsync({ message, source?, details? })
notFoundErrAsync({ message, source?, details? })
// ... etc
```

### Error Factory Functions

```typescript
// Create error objects (for custom handling)
validationError(opts)   // code: "VALIDATION"
notFoundError(opts)     // code: "NOT_FOUND"
conflictError(opts)     // code: "CONFLICT"
ioError(opts)           // code: "IO"
timeoutError(opts)      // code: "TIMEOUT"
failedError(opts)       // code: "FAILED"
invalidError(opts)      // code: "INVALID"
unexpectedError(opts)   // code: "UNEXPECTED"

// Convert unknown to FireflyError
toFireflyError(err, code?, source?)

// Wrap error message with prefix
wrapErrorMessage(error, "Prefix")  // "Prefix: original message"
```

### Result Utilities

```typescript
// Wrap Promise to FireflyAsyncResult
wrapPromise(promise)

// Collect results into array
collectResults([result1, result2])           // Sync, short-circuits
collectAsyncResults([asyncResult1, asyncResult2])  // Parallel

// Ensure conditions
ensure(condition, errorOpts)       // Error if false
ensureNot(condition, errorOpts)    // Error if true

// Nullable handling
fromNullable(maybeValue, errorOpts)  // NOT_FOUND if null/undefined

// Traverse arrays
traverseResults(items, fn)          // Sequential, sync
traverseResultsAsync(items, fn)     // Sequential, async
traverseResultsParallel(items, fn)  // Parallel, async

// Filter and partition
filterResults(results, predicate)
partitionResults(results)  // { successes, failures }

// Pipe operations
pipe(initial, fn1, fn2, fn3)       // Sync chain
pipeAsync(initial, fn1, fn2, fn3)  // Async chain

// Default values
withDefault(result, defaultValue)
withDefaultLazy(result, () => computeDefault())

// Recovery
recoverIf(result, ["NOT_FOUND"], recovery)
recoverIfAsync(asyncResult, ["TIMEOUT"], recovery)

// Combine results
zip(resultA, resultB)      // FireflyResult<[A, B]>
zip3(a, b, c)              // FireflyResult<[A, B, C]>
zipAsync(a, b)             // FireflyAsyncResult<[A, B]>
zip3Async(a, b, c)         // FireflyAsyncResult<[A, B, C]>

// Side effects
tap(result, (value) => log(value))
tapError(result, (error) => logError(error))
tapAsync(asyncResult, (value) => log(value))
tapErrorAsync(asyncResult, (error) => logError(error))
```

### Schema Utilities

```typescript
// Parse with Result semantics
parseSchema(zodSchema, data)         // FireflyResult<T>
parseSchemaAsync(zodSchema, data)    // FireflyAsyncResult<T>

// Schema composition
composeEffects(schema1, schema2)     // Intersection
composeShape(baseSchema, ...shapes)  // Object extension
```

### FireflyError Structure

```typescript
interface FireflyError {
  code: FireflyErrorCode;  // "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "IO" | "TIMEOUT" | "UNEXPECTED" | "FAILED" | "INVALID"
  message: string;
  details?: unknown;
  cause?: unknown;
  retryable?: boolean;
  source?: string;
}
```

---

## Common Patterns

### Pattern: Validation Pipeline

```typescript
function validateRelease(config: ReleaseConfig): FireflyResult<ValidatedConfig> {
  return pipe(
    FireflyOk(config),
    (c) => validateVersion(c),
    (c) => validateBranch(c),
    (c) => validatePermissions(c),
  );
}

function validateVersion(config: ReleaseConfig): FireflyResult<ReleaseConfig> {
  if (!isValidSemver(config.version)) {
    return validationErr({
      message: `Invalid version: ${config.version}`,
      source: "release-validator",
    });
  }
  return FireflyOk(config);
}
```

### Pattern: Fallback Chain

```typescript
function fetchConfig(): FireflyAsyncResult<Config> {
  return recoverIfAsync(
    loadFromFile("./config.json"),
    ["NOT_FOUND"],
    () => recoverIfAsync(
      loadFromEnv(),
      ["NOT_FOUND"],
      () => FireflyOkAsync(defaultConfig)
    )
  );
}
```

### Pattern: Batch Processing with Collection

```typescript
async function processItems(items: Item[]): Promise<FireflyResult<ProcessedItem[]>> {
  const results = await traverseResultsParallel(items, processItem);

  if (results.isErr()) {
    return FireflyErr(results.error);
  }

  return FireflyOk(results.value);
}
```

### Pattern: Error Context Enrichment

```typescript
function loadConfig(path: string): FireflyAsyncResult<Config> {
  return wrapPromise(fs.readFile(path, "utf-8"))
    .mapErr((error) => wrapErrorMessage(error, `Failed to load config from ${path}`))
    .andThen((content) => parseSchema(ConfigSchema, JSON.parse(content)));
}
```

### Pattern: Conditional Execution

```typescript
function maybePublish(ctx: ReleaseContext): FireflyAsyncResult<void> {
  if (ctx.config.dryRun) {
    return FireflyOkAsync(undefined);
  }

  return publishPackage(ctx.data.packagePath);
}
```

### Pattern: Resource Acquisition

```typescript
function withTempFile<T>(
  fn: (path: string) => FireflyAsyncResult<T>
): FireflyAsyncResult<T> {
  const tempPath = generateTempPath();

  return fn(tempPath)
    .andThen((result) =>
      wrapPromise(fs.unlink(tempPath))
        .map(() => result)
        .orElse(() => FireflyOkAsync(result)) // Cleanup failure is non-fatal
    );
}
```

### Pattern: Parallel with Partition

```typescript
async function validateAll(items: Item[]): Promise<FireflyResult<ValidationReport>> {
  const results = await Promise.all(
    items.map((item) => validateItem(item))
  );

  const { successes, failures } = partitionResults(results);

  if (failures.length > 0) {
    return FireflyOk({
      valid: successes,
      invalid: failures,
      hasErrors: true,
    });
  }

  return FireflyOk({
    valid: successes,
    invalid: [],
    hasErrors: false,
  });
}
```

---

## Advanced Use Cases

### Custom Error Codes and Handling

```typescript
// Type-safe error code checking
function handleError(error: FireflyError): string {
  switch (error.code) {
    case "VALIDATION":
      return `Validation failed: ${error.message}`;
    case "NOT_FOUND":
      return `Resource not found: ${error.message}`;
    case "CONFLICT":
      return `Conflict detected: ${error.message}`;
    case "IO":
      return `I/O error: ${error.message}`;
    case "TIMEOUT":
      return `Operation timed out: ${error.message}`;
    case "FAILED":
      return `Operation failed: ${error.message}`;
    case "INVALID":
      return `Invalid state: ${error.message}`;
    case "UNEXPECTED":
      return `Unexpected error: ${error.message}`;
  }
}

// Selective retry based on error properties
function shouldRetry(error: FireflyError): boolean {
  return error.retryable === true ||
         error.code === "TIMEOUT" ||
         error.code === "IO";
}
```

### Complex Schema Composition

```typescript
import { composeEffects, composeShape, parseSchema } from "#/core/result/schema.utilities";
import { z } from "zod";

// Base schemas
const IdentifiableSchema = z.object({ id: z.string() });
const TimestampedSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Composition via intersection
const AuditedEntitySchema = composeEffects(
  IdentifiableSchema,
  TimestampedSchema,
  z.object({ auditLog: z.array(z.string()) })
);

// Composition via shape extension
const UserSchema = composeShape(
  IdentifiableSchema,
  { name: z.string() },
  { email: z.string().email() },
  { role: z.enum(["admin", "user"]) }
);

// Use with parseSchema
function validateUser(data: unknown): FireflyResult<z.infer<typeof UserSchema>> {
  return parseSchema(UserSchema, data);
}
```

### Result-Based Retry Logic

```typescript
function withRetry<T>(
  operation: () => FireflyAsyncResult<T>,
  options: { maxAttempts: number; delayMs: number }
): FireflyAsyncResult<T> {
  const attempt = (remaining: number): FireflyAsyncResult<T> => {
    return operation().orElse((error) => {
      if (remaining <= 1 || !shouldRetry(error)) {
        return FireflyErrAsync(error);
      }

      return wrapPromise(delay(options.delayMs))
        .andThen(() => attempt(remaining - 1));
    });
  };

  return attempt(options.maxAttempts);
}

// Usage
const result = await withRetry(
  () => fetchFromApi(endpoint),
  { maxAttempts: 3, delayMs: 1000 }
);
```

### Transactional Operations

```typescript
type Rollback = () => FireflyAsyncResult<void>;

interface TransactionStep<T> {
  execute: () => FireflyAsyncResult<T>;
  rollback: (value: T) => FireflyAsyncResult<void>;
}

async function runTransaction<T>(
  steps: TransactionStep<unknown>[],
  finalStep: () => FireflyAsyncResult<T>
): Promise<FireflyResult<T>> {
  const rollbacks: Rollback[] = [];

  for (const step of steps) {
    const result = await step.execute();

    if (result.isErr()) {
      // Rollback in reverse order
      for (const rollback of rollbacks.reverse()) {
        await rollback();
      }
      return FireflyErr(result.error);
    }

    rollbacks.push(() => step.rollback(result.value));
  }

  const finalResult = await finalStep();

  if (finalResult.isErr()) {
    for (const rollback of rollbacks.reverse()) {
      await rollback();
    }
    return FireflyErr(finalResult.error);
  }

  return FireflyOk(finalResult.value);
}
```

### Combining Multiple Async Operations

```typescript
function fetchUserProfile(userId: string): FireflyAsyncResult<UserProfile> {
  return zip3Async(
    fetchUser(userId),
    fetchUserSettings(userId),
    fetchUserPermissions(userId)
  ).map(([user, settings, permissions]) => ({
    ...user,
    settings,
    permissions,
  }));
}
```

---

## Troubleshooting

### Common Errors

#### "Property 'value' does not exist"

```typescript
// ❌ Accessing value without guard
const result = computeValue();
console.log(result.value);  // TypeScript error!

// ✅ Use isOk() guard first
if (result.isOk()) {
  console.log(result.value);  // OK - narrowed to Ok type
}

// ✅ Or use match
result.match(
  (value) => console.log(value),
  (error) => console.error(error.message),
);
```

#### "Type 'Promise<ResultAsync>' is not assignable"

```typescript
// ❌ Wrong: Wrapping FireflyAsyncResult in Promise
function getData(): Promise<FireflyAsyncResult<Data>> {
  return Promise.resolve(wrapPromise(fetch()));
}

// ✅ Correct: Return FireflyAsyncResult directly
function getData(): FireflyAsyncResult<Data> {
  return wrapPromise(fetch());
}
```

#### "Cannot chain after async result"

```typescript
// ❌ Wrong: Using sync methods on async result
const result = fetchDataAsync()
  .andThen((data) => FireflyOk(transform(data)));  // Error!

// ✅ Correct: Return async result from andThen
const result = fetchDataAsync()
  .andThen((data) => FireflyOkAsync(transform(data)));
```

#### "Error is not being propagated"

```typescript
// ❌ Wrong: Ignoring error propagation
async function process(): Promise<FireflyResult<Output>> {
  const input = await fetchInput();
  // input.error is lost if we don't check!
  return processInput(input.value);
}

// ✅ Correct: Propagate errors explicitly
async function process(): Promise<FireflyResult<Output>> {
  const inputResult = await fetchInput();
  if (inputResult.isErr()) return FireflyErr(inputResult.error);
  return processInput(inputResult.value);
}

// ✅ Or use andThen chain
function process(): FireflyAsyncResult<Output> {
  return fetchInput().andThen((input) => processInput(input));
}
```

#### "Schema parse returns generic unknown"

```typescript
// ❌ Problem: Type not inferred
const result = parseSchema(UserSchema, data);
// result is FireflyResult<unknown>

// ✅ Solution: Ensure schema is properly typed
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;

const result = parseSchema(UserSchema, data);
// result is FireflyResult<{ id: string; name: string }>
```

### Debugging Tips

#### Trace Error Source

```typescript
// Always include source in errors for debugging
return validationErr({
  message: "Invalid input",
  source: "my-module",  // Helps identify where error originated
  details: { input, validationRules },
});
```

#### Use tapError for Logging

```typescript
const result = await fetchData()
  .mapErr((error) => {
    console.error(`[${error.source}] ${error.code}: ${error.message}`);
    return error;
  });

// Or use tapError utility
const result = tapErrorAsync(
  fetchData(),
  (error) => console.error(`Failed: ${error.message}`)
);
```

#### Inspect Result State

```typescript
function debugResult<T>(result: FireflyResult<T>, label: string): FireflyResult<T> {
  if (result.isOk()) {
    console.log(`[${label}] Success:`, result.value);
  } else {
    console.log(`[${label}] Error:`, {
      code: result.error.code,
      message: result.error.message,
      source: result.error.source,
      details: result.error.details,
    });
  }
  return result;
}

// Usage in chain
const finalResult = pipe(
  debugResult(step1(), "step1"),
  (v) => debugResult(step2(v), "step2"),
  (v) => debugResult(step3(v), "step3"),
);
```
