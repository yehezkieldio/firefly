# Firefly Service Module Documentation

## Overview

The Service Module provides a lightweight dependency injection and service locator system for Firefly's workflow engine. It enables lazy-loaded, type-safe service resolution with automatic circular dependency detection.

### Key Features

- **Lazy Instantiation**: Services are created on-demand via ES Proxies, improving startup performance
- **Dependency Injection**: Services can depend on other services through a factory context
- **Circular Dependency Detection**: Runtime detection of circular dependencies with clear error messages
- **Type Safety**: Full TypeScript support with branded keys and registry inference
- **Dynamic Imports**: Services are loaded via `import()` for code splitting and smaller bundles
- **Eager Resolution**: Optional async resolution for when you need all services upfront
- **Result-Based API**: All service methods return `FireflyAsyncResult` for explicit error handling

## Usage Guide

### Resolving Services

```typescript
import { resolveServices, resolveService, resolveAllServices } from "#/core/service/service.proxy";

// Resolve specific services (lazy)
const services = resolveServices(["fs", "git"] as const, "/path/to/project");
await services.fs.read("package.json");

// Resolve a single service (lazy)
const git = resolveService("git", "/path/to/project");
const isRepo = await git.isRepository();

// Resolve all services (lazy)
const allServices = resolveAllServices("/path/to/project");
```

### Eager Resolution

```typescript
import { resolveServicesAsync, resolveServiceAsync } from "#/core/service/service.proxy";

// Resolve services eagerly (awaits instantiation)
const services = await resolveServicesAsync(["fs", "git"] as const, "/path/to/project");

// Resolve a single service eagerly
const fs = await resolveServiceAsync("fs", "/path/to/project");
```

### Defining Service Keys for Commands

```typescript
import { defineServiceKeys } from "#/core/service/service.registry";

// Type-safe tuple of service keys
const RELEASE_SERVICES = defineServiceKeys("fs", "git", "packageJson");
// Type: readonly ["fs", "git", "packageJson"]
```

---

## Adding a New Service

Follow these steps to add a new service to the system:

### Step 1: Create the Interface

Create a new file in `src/services/contracts/`:

```typescript
// src/services/contracts/changelog.interface.ts
import type { FireflyAsyncResult } from "#/core/result/result.types";

/**
 * Service for changelog operations.
 */
export interface IChangelogService {
    /**
     * Generates a changelog from commit history.
     */
    generate(fromTag: string, toTag: string): FireflyAsyncResult<string>;

    /**
     * Appends content to the changelog file.
     */
    append(content: string): FireflyAsyncResult<void>;
}
```

### Step 2: Create the Implementation

Create a new file in `src/services/implementations/`:

```typescript
// src/services/implementations/changelog.service.ts
import type { FireflyAsyncResult } from "#/core/result/result.types";
import { wrapPromise } from "#/core/result/result.utilities";
import type { IFileSystemService } from "#/services/contracts/filesystem.interface";
import type { IGitService } from "#/services/contracts/git.interface";
import type { IChangelogService } from "#/services/contracts/changelog.interface";

export class DefaultChangelogService implements IChangelogService {
    private readonly fs: IFileSystemService;
    private readonly git: IGitService;
    private readonly changelogPath: string;

    constructor(fs: IFileSystemService, git: IGitService, changelogPath = "CHANGELOG.md") {
        this.fs = fs;
        this.git = git;
        this.changelogPath = changelogPath;
    }

    generate(fromTag: string, toTag: string): FireflyAsyncResult<string> {
        // Implementation using this.git
        // ...
    }

    append(content: string): FireflyAsyncResult<void> {
        return this.fs.read(this.changelogPath)
            .andThen((existing) => this.fs.write(this.changelogPath, content + existing));
    }
}

/**
 * Factory function for the changelog service.
 */
export function createChangelogService(
    fs: IFileSystemService,
    git: IGitService
): IChangelogService {
    return new DefaultChangelogService(fs, git);
}
```

### Step 3: Register the Service

Update `src/core/service/service.registry.ts`:

```typescript
import type { IChangelogService } from "#/services/contracts/changelog.interface";

// 1. Add to ServiceRegistryType
type ServiceRegistryType = {
    readonly fs: IFileSystemService;
    readonly packageJson: IPackageJsonService;
    readonly git: IGitService;
    readonly changelog: IChangelogService;  // Add here
};

// 2. Add to SERVICE_DEFINITIONS
export const SERVICE_DEFINITIONS = {
    // ... existing services ...

    changelog: defineService<IChangelogService>({
        dependencies: ["fs", "git"],  // Declare dependencies
        factory: async ({ getService }) => {
            const fs = await getService("fs");
            const git = await getService("git");
            const { createChangelogService } = await import(
                "#/services/implementations/changelog.service"
            );
            return createChangelogService(fs, git);
        },
    }),
} as const satisfies Record<string, ServiceDefinition<unknown, ServiceRegistryType>>;
```

### Step 4: Use the Service

```typescript
const services = resolveServices(["changelog"] as const, basePath);
const changelogContent = await services.changelog.generate("v1.0.0", "v1.1.0");
```

---

## Best Practices

### 1. Define Clear Interfaces

```typescript
// ✅ Good: Clear, focused interface
export interface INotificationService {
    sendSlack(message: string): FireflyAsyncResult<void>;
    sendEmail(to: string, subject: string, body: string): FireflyAsyncResult<void>;
}

// ❌ Bad: Too generic or too broad
export interface IService {
    doSomething(data: unknown): FireflyAsyncResult<unknown>;
}
```

### 2. Use Factory Functions

```typescript
// ✅ Good: Factory function for instantiation
export function createMyService(dep: IDependency): IMyService {
    return new DefaultMyService(dep);
}

// ❌ Bad: Direct class export forces consumers to know implementation
export class MyService implements IMyService { }
```

### 3. Declare Dependencies Explicitly

```typescript
// ✅ Good: Dependencies declared in definition
changelog: defineService<IChangelogService>({
    dependencies: ["fs", "git"],  // Clear dependency declaration
    factory: async ({ getService }) => {
        const fs = await getService("fs");
        const git = await getService("git");
        return createChangelogService(fs, git);
    },
}),

// ❌ Bad: Hidden dependencies
changelog: defineService<IChangelogService>({
    factory: async ({ basePath }) => {
        // Dependencies resolved internally - not visible
        const fs = await resolveServiceAsync("fs", basePath);
        return createChangelogService(fs);
    },
}),
```

### 4. Return Result Types from Service Methods

```typescript
// ✅ Good: Explicit error handling with FireflyAsyncResult
interface IFileService {
    read(path: string): FireflyAsyncResult<string>;
}

// ❌ Bad: Throwing exceptions
interface IFileService {
    read(path: string): Promise<string>;  // Can throw!
}
```

### 5. Keep Services Focused

```typescript
// ✅ Good: Single responsibility
interface IFileSystemService { /* file operations */ }
interface IGitService { /* git operations */ }
interface IChangelogService { /* changelog operations */ }

// ❌ Bad: God service
interface IProjectService {
    readFile(): void;
    writeFile(): void;
    gitCommit(): void;
    gitPush(): void;
    generateChangelog(): void;
    publishNpm(): void;
}
```

### 6. Use Lazy Resolution by Default

```typescript
// ✅ Good: Lazy resolution - services created only when accessed
const services = resolveServices(["fs", "git"], basePath);

// ❌ Bad: Eager resolution unless you need it
const services = await resolveServicesAsync(["fs", "git"], basePath);
```

---

## Cheatsheet

### Service Resolution Quick Reference

```typescript
// Lazy resolution (preferred)
resolveServices(["fs", "git"] as const, basePath);
resolveService("fs", basePath);
resolveAllServices(basePath);

// Eager resolution (when needed)
await resolveServicesAsync(["fs", "git"] as const, basePath);
await resolveServiceAsync("fs", basePath);
```

### Service Definition Template

```typescript
// In service.registry.ts
serviceName: defineService<IServiceInterface>({
    dependencies: ["dep1", "dep2"],  // Optional: informational
    description: "Human-readable description",  // Optional
    factory: async ({ basePath, getService }) => {
        const dep1 = await getService("dep1");
        const { createService } = await import("#/services/implementations/service.impl");
        return createService(dep1);
    },
}),
```

### Type Utilities

```typescript
// Service key types
type ServiceKey = "fs" | "git" | "packageJson";
type ValidatedServiceKey = BrandedServiceKey<ServiceKey>;

// Registry types
type ServiceRegistry = { fs: IFileSystemService; git: IGitService; ... };
type DefaultServices = ResolvedServices<ServiceKey>;

// Partial resolution
type MyServices = ResolvedServices<"fs" | "git">;

// Define service keys tuple
const KEYS = defineServiceKeys("fs", "git");  // readonly ["fs", "git"]

// Validate key at runtime
const key = validateServiceKey("fs");  // BrandedServiceKey | undefined
```

### Interface Template

```typescript
// src/services/contracts/my-service.interface.ts
import type { FireflyAsyncResult } from "#/core/result/result.types";

export interface IMyService {
    operation1(param: string): FireflyAsyncResult<Result1>;
    operation2(param: number): FireflyAsyncResult<Result2>;
}
```

### Implementation Template

```typescript
// src/services/implementations/my-service.service.ts
import type { FireflyAsyncResult } from "#/core/result/result.types";
import type { IMyService } from "#/services/contracts/my-service.interface";

export class DefaultMyService implements IMyService {
    constructor(private readonly basePath: string) {}

    operation1(param: string): FireflyAsyncResult<Result1> {
        // Implementation
    }

    operation2(param: number): FireflyAsyncResult<Result2> {
        // Implementation
    }
}

export function createMyService(basePath: string): IMyService {
    return new DefaultMyService(basePath);
}
```

---

## Common Patterns

### Pattern: Service with Dependencies

```typescript
// Interface: services/contracts/package-manager.interface.ts
export interface IPackageManagerService {
    install(): FireflyAsyncResult<void>;
    publish(tag: string): FireflyAsyncResult<void>;
}

// Implementation: services/implementations/package-manager.service.ts
export class DefaultPackageManagerService implements IPackageManagerService {
    constructor(
        private readonly fs: IFileSystemService,
        private readonly basePath: string
    ) {}

    install(): FireflyAsyncResult<void> {
        // Uses this.fs for file operations
    }
}

export function createPackageManagerService(
    fs: IFileSystemService,
    basePath: string
): IPackageManagerService {
    return new DefaultPackageManagerService(fs, basePath);
}

// Registration
packageManager: defineService<IPackageManagerService>({
    dependencies: ["fs"],
    factory: async ({ basePath, getService }) => {
        const fs = await getService("fs");
        const { createPackageManagerService } = await import(
            "#/services/implementations/package-manager.service"
        );
        return createPackageManagerService(fs, basePath);
    },
}),
```

### Pattern: Service with Configuration

```typescript
// Interface with options
export interface ILoggerServiceOptions {
    readonly level: "debug" | "info" | "warn" | "error";
    readonly prefix?: string;
}

export interface ILoggerService {
    log(level: string, message: string): FireflyAsyncResult<void>;
}

// Factory accepts configuration
export function createLoggerService(options: ILoggerServiceOptions): ILoggerService {
    return new DefaultLoggerService(options);
}

// Registration with config
logger: defineService<ILoggerService>({
    factory: async () => {
        const { createLoggerService } = await import(
            "#/services/implementations/logger.service"
        );
        return createLoggerService({ level: "info", prefix: "[firefly]" });
    },
}),
```

### Pattern: Dry-Run Support

```typescript
import { withDryRun } from "#/infrastructure/dry-run";

export class DefaultFileSystemService implements IFileSystemService {
    write(path: string, content: string, options?: WriteOptions): FireflyAsyncResult<void> {
        return withDryRun(
            options,
            `Writing to ${this.resolvePath(path)}`,
            () => wrapPromise(Bun.write(this.resolvePath(path), content).then(() => {}))
        );
    }
}
```

### Pattern: Service Using External Commands

```typescript
import { executeGitCommand } from "#/infrastructure/executors/git-command.executor";

export class DefaultGitService implements IGitService {
    private git(args: string[], options?: GitExecutionOptions): FireflyAsyncResult<string> {
        return executeGitCommand(args, {
            cwd: this.cwd,
            dryRun: options?.dryRun,
            verbose: options?.verbose ?? false,
        });
    }

    isRepository(): FireflyAsyncResult<boolean> {
        return this.git(["rev-parse", "--is-inside-work-tree"])
            .map(() => true)
            .orElse(() => FireflyOkAsync(false));
    }
}
```

### Pattern: Schema Validation in Services

```typescript
import { parseSchema } from "#/core/result/schema.utilities";
import z from "zod";

export const PackageJsonSchema = z.object({
    name: z.string().optional(),
    version: z.string().optional(),
}).catchall(z.unknown());

export class DefaultPackageJsonService implements IPackageJsonService {
    async read(path: string): Promise<FireflyResult<PackageJson>> {
        const contentResult = await this.fs.read(path);
        if (contentResult.isErr()) return FireflyErr(contentResult.error);

        const jsonParseResult = this.parseJsonString(contentResult.value, path);
        if (jsonParseResult.isErr()) return FireflyErr(jsonParseResult.error);

        return parseSchema(PackageJsonSchema, jsonParseResult.value);
    }
}
```

---

## Advanced Use Cases

### Custom Service Context

```typescript
// Extended context with additional metadata
interface ExtendedServiceFactoryContext<TRegistry> extends ServiceFactoryContext<TRegistry> {
    readonly environment: "development" | "production";
    readonly logger: ILoggerService;
}

// Use in factory
factory: async (context: ExtendedServiceFactoryContext<ServiceRegistryType>) => {
    const { environment, logger, basePath } = context;
    logger.log("info", `Creating service in ${environment} mode`);
    // ...
}
```

### Service Mocking for Tests

```typescript
// Create mock services for testing
function createMockFileSystemService(): IFileSystemService {
    const files = new Map<string, string>();

    return {
        exists: (path) => FireflyOkAsync(files.has(path)),
        read: (path) => {
            const content = files.get(path);
            return content
                ? FireflyOkAsync(content)
                : notFoundErrAsync({ message: `File not found: ${path}` });
        },
        write: (path, content) => {
            files.set(path, content);
            return FireflyOkAsync(undefined);
        },
    };
}

// Use in tests
const mockFs = createMockFileSystemService();
const packageJsonService = createPackageJsonService(mockFs);
```

### Service Decorator Pattern

```typescript
// Logging decorator for any service
function withLogging<T extends object>(service: T, serviceName: string): T {
    return new Proxy(service, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === "function") {
                return (...args: unknown[]) => {
                    console.log(`[${serviceName}] ${String(prop)} called`);
                    return value.apply(target, args);
                };
            }
            return value;
        },
    });
}

// Usage
const fs = withLogging(createFileSystemService(basePath), "FileSystem");
```

### Conditional Service Registration

```typescript
// Register different implementations based on environment
export const SERVICE_DEFINITIONS = {
    fs: defineService<IFileSystemService>({
        factory: async ({ basePath }) => {
            if (process.env.NODE_ENV === "test") {
                const { createMockFileSystemService } = await import(
                    "#/services/mocks/filesystem.mock"
                );
                return createMockFileSystemService();
            }
            const { createFileSystemService } = await import(
                "#/services/implementations/filesystem.service"
            );
            return createFileSystemService(basePath);
        },
    }),
};
```

### Service Composition

```typescript
// Compose multiple services into a higher-level abstraction
interface IProjectService {
    bumpVersion(bump: "major" | "minor" | "patch"): FireflyAsyncResult<string>;
}

class ProjectService implements IProjectService {
    constructor(
        private readonly fs: IFileSystemService,
        private readonly packageJson: IPackageJsonService,
        private readonly git: IGitService
    ) {}

    bumpVersion(bump: "major" | "minor" | "patch"): FireflyAsyncResult<string> {
        return this.packageJson.read("package.json")
            .andThen((pkg) => {
                const newVersion = incrementSemver(pkg.version ?? "0.0.0", bump);
                return this.packageJson.updateVersion("package.json", newVersion)
                    .map(() => newVersion);
            });
    }
}

// Registration
project: defineService<IProjectService>({
    dependencies: ["fs", "packageJson", "git"],
    factory: async ({ getService }) => {
        const [fs, packageJson, git] = await Promise.all([
            getService("fs"),
            getService("packageJson"),
            getService("git"),
        ]);
        return new ProjectService(fs, packageJson, git);
    },
}),
```

---

## Troubleshooting

### Common Errors

#### "Circular service dependency detected"

```
Error: Circular service dependency detected: fs -> packageJson -> fs
```

**Cause**: Service A depends on Service B, which depends on Service A.

```typescript
// ❌ Bad: Circular dependency
fs: defineService({
    dependencies: ["packageJson"],  // fs needs packageJson
    factory: async ({ getService }) => {
        const pj = await getService("packageJson");
        // ...
    },
}),
packageJson: defineService({
    dependencies: ["fs"],  // packageJson needs fs -> CIRCULAR!
    factory: async ({ getService }) => {
        const fs = await getService("fs");
        // ...
    },
}),

// ✅ Good: Restructure to break the cycle
// Option 1: Only packageJson depends on fs (not vice versa)
// Option 2: Extract shared functionality into a third service
```

#### "Service key not found in definitions"

```typescript
// ❌ Bad: Using undefined key
const services = resolveServices(["invalidKey"] as const, basePath);

// ✅ Good: Use defineServiceKeys for type safety
const KEYS = defineServiceKeys("fs", "git");  // Compile-time check
const services = resolveServices(KEYS, basePath);
```

#### "Cannot read property of undefined (service method)"

**Cause**: Lazy proxy hasn't resolved yet, or service doesn't have that method.

```typescript
// ❌ Bad: Accessing non-existent method
const result = await services.fs.nonExistentMethod();

// ✅ Good: Check interface for available methods
const result = await services.fs.read("file.txt");  // Method exists
```

#### "Service factory threw an error"

```typescript
// ❌ Bad: Factory can throw
factory: async ({ basePath }) => {
    const result = await somethingThatCanThrow();  // Unhandled!
    return createService(result);
},

// ✅ Good: Handle errors in factory
factory: async ({ basePath }) => {
    const { createService } = await import("#/services/implementations/my.service");
    return createService(basePath);  // Factory handles its own errors
},
```

### Debugging Tips

#### Check Service Resolution Order

```typescript
// Add logging to track resolution
factory: async ({ getService }) => {
    console.log("[ServiceName] Resolving...");
    const dep = await getService("dependency");
    console.log("[ServiceName] Got dependency, creating service...");
    const service = createService(dep);
    console.log("[ServiceName] Created!");
    return service;
},
```

#### Verify Service is Registered

```typescript
import { ALL_SERVICE_KEYS, validateServiceKey } from "#/core/service/service.registry";

// List all registered services
console.log("Available services:", ALL_SERVICE_KEYS);

// Check if a key is valid
const isValid = validateServiceKey("myService");
if (!isValid) {
    console.error("Service 'myService' is not registered!");
}
```

#### Test Service in Isolation

```typescript
// Test service factory directly
import { createMyService } from "#/services/implementations/my.service";

const service = createMyService(mockDependency);
const result = await service.myMethod();
console.log("Result:", result);
```