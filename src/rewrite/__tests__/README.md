# Test Suite for Firefly Rewrite

Comprehensive test suite for the rewritten Firefly architecture.

## Quick Start

```bash
# Run all tests
bun test

# Run specific test file
bun test src/rewrite/__tests__/core/workflow-context.test.ts

# Run tests matching pattern
bun test --test-name-pattern="VersionService"

# Watch mode
bun test --watch

# Coverage report
bun test --coverage
```

## Test Structure

```
__tests__/
├── helpers/              # Test utilities and helper functions
│   └── test-helpers.ts   # Common test helpers
├── fixtures/             # Test data and mock files
│   ├── sample-commits.json
│   └── sample-package.json
├── shared/               # Service tests
│   ├── version-service.test.ts
│   └── conventional-commit-service.test.ts
├── tasks/                # Task tests
│   ├── release/
│   └── shared/
├── core/                 # Core system tests
│   ├── workflow-context.test.ts
│   ├── task-registry.test.ts
│   ├── context-builder.test.ts
│   └── command-registry.test.ts
├── cli/                  # CLI tests
└── integration/          # Integration tests
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, expect, it } from "bun:test";
import { MyService } from "#/rewrite/shared/my-service";

describe("MyService", () => {
    it("should perform operation successfully", () => {
        const service = new MyService();
        const result = service.doSomething();
        
        expect(result.isOk()).toBe(true);
    });
});
```

### Using Test Helpers

```typescript
import { createTestContext, expectOk } from "../helpers/test-helpers";

it("should execute task with context", async () => {
    const ctx = createTestContext({
        config: { verbose: true },
        data: { version: "1.0.0" }
    });
    
    const result = await task.execute(ctx);
    const newCtx = expectOk(result);
    
    expect(newCtx.data.version).toBe("1.0.0");
});
```

## Test Helpers

Located in `helpers/test-helpers.ts`:

- `createTestContext()` - Create workflow context for testing
- `expectOk()` - Assert Result is Ok and return value
- `expectErr()` - Assert Result is Err and return error
- `runTaskSequence()` - Execute multiple tasks in sequence
- `createMockTask()` - Create mock task for testing

## Test Fixtures

Located in `fixtures/`:

- `sample-commits.json` - Mock commit history
- `sample-package.json` - Mock package.json file

## Coverage Goals

- Unit Tests: 80%+ coverage
- Integration Tests: Key workflows covered
- E2E Tests: Critical user paths

## Current Status

- ✅ Test infrastructure setup
- ✅ Core system tests
- ✅ Service tests started
- ⚠️ Task tests in progress
- ⚠️ Integration tests planned

## Running Specific Suites

```bash
# Core tests
bun test __tests__/core/

# Service tests
bun test __tests__/shared/

# Task tests  
bun test __tests__/tasks/

# All tests
bun test __tests__/
```

## Test Output

Tests use Bun's built-in test runner which provides:
- ✅ Fast execution
- ✅ Native TypeScript support
- ✅ Clear output formatting
- ✅ Built-in coverage reporting

Expected output:
```
✓ WorkflowContext > fork > should create new context
✓ VersionService > parse > should parse valid version
✓ TaskRegistry > register > should register task
...
50 tests passed (0.15s)
```

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure tests pass
3. Check coverage
4. Update this README if needed
