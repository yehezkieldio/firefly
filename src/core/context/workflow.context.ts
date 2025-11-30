import { FireflyOk, validationErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import type { ResolvedServices, ServiceKey } from "#/core/service/service.registry";

// Default services type when using all available services
type DefaultServices = ResolvedServices<ServiceKey>;

// Base constraint for workflow data - must be a record with string keys
type WorkflowData = Record<string, unknown>;

/**
 * Immutable context that flows through workflow task execution.
 *
 * @template TConfig - Type of the workflow configuration
 * @template TData - Type of the accumulated workflow data (extends WorkflowData)
 * @template TServices - Type of the resolved services
 *
 * @example Basic usage in a task
 * ```typescript
 * type MyConfig = { version: string; dryRun: boolean };
 * type MyData = { processedAt: Date; result: string };
 *
 * const task: GenericWorkflowTask<MyConfig, MyData> = {
 *   id: "process-data",
 *   execute: (ctx) => {
 *     // Access configuration
 *     const { version, dryRun } = ctx.config;
 *
 *     // Update context with new data
 *     const updatedCtx = ctx.fork("processedAt", new Date());
 *     return FireflyOkAsync(updatedCtx);
 *   }
 * };
 * ```
 *
 * @example Accessing services
 * ```typescript
 * execute: (ctx) => {
 *   const { filesystem, packageJson } = ctx.services;
 *
 *   return filesystem.readFile("config.json")
 *     .andThen((content) => {
 *       const parsed = JSON.parse(content);
 *       return FireflyOkAsync(ctx.fork("config", parsed));
 *     });
 * }
 * ```
 *
 * @example Chaining multiple data updates
 * ```typescript
 * execute: (ctx) => {
 *   // Update multiple values at once
 *   const updatedCtx = ctx.forkMultiple({
 *     startedAt: new Date(),
 *     status: "processing",
 *     attemptCount: 1
 *   });
 *
 *   return FireflyOkAsync(updatedCtx);
 * }
 * ```
 */
export interface WorkflowContext<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    TServices = DefaultServices,
> {
    /**
     * Timestamp when the workflow started
     */
    readonly startTime: Date;

    /**
     * Frozen configuration for the workflow
     */
    readonly config: Readonly<TConfig>;

    /**
     * Frozen accumulated data from task executions
     */
    readonly data: Readonly<TData>;

    /**
     * Resolved services available to tasks
     */
    readonly services: TServices;

    /**
     * Retrieves a value from the context data.
     * @param key - The data key to retrieve
     * @returns `Ok(value)` if found, `Err` if key doesn't exist
     *
     * @example
     * ```typescript
     * const result = ctx.get("version");
     * if (result.isOk()) {
     *   console.log(`Version: ${result.value}`);
     * } else {
     *   console.error(`Missing key: ${result.error.message}`);
     * }
     * ```
     */
    get<K extends keyof TData>(key: K): FireflyResult<TData[K]>;

    /**
     * Creates a new context with an updated data value.
     * @param key - The data key to set
     * @param value - The new value
     * @returns New context with the updated data
     *
     * @example
     * ```typescript
     * // Original context remains unchanged (immutable)
     * const originalCtx = createContext({ count: 0 });
     * const updatedCtx = originalCtx.fork("count", 1);
     *
     * console.log(originalCtx.data.count); // 0
     * console.log(updatedCtx.data.count);  // 1
     * ```
     */
    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData, TServices>;

    /**
     * Creates a new context with multiple updated data values.
     * @param updates - Object containing key-value pairs to update
     * @returns New context with all updates applied
     *
     * @example
     * ```typescript
     * const ctx = createContext({ a: 1, b: 2, c: 3 });
     * const updated = ctx.forkMultiple({ a: 10, c: 30 });
     *
     * console.log(updated.data); // { a: 10, b: 2, c: 30 }
     * ```
     */
    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData, TServices>;

    /**
     * Checks if a key exists in the context data.
     * @param key - The data key to check
     *
     * @example
     * ```typescript
     * if (ctx.has("cachedResult")) {
     *   return ctx.get("cachedResult");
     * }
     * // Compute and store result
     * const result = computeExpensiveOperation();
     * return FireflyOkAsync(ctx.fork("cachedResult", result));
     * ```
     */
    has<K extends keyof TData>(key: K): boolean;

    /**
     * Returns a frozen snapshot of the current data.
     *
     * @example
     * ```typescript
     * const currentData = ctx.snapshot();
     * logger.info("Current workflow state", { data: currentData });
     *
     * // Safe to pass around - guaranteed immutable
     * await sendMetrics(currentData);
     * ```
     */
    snapshot(): Readonly<TData>;
}

/**
 * Immutable implementation of WorkflowContext.
 *
 * @template TConfig - Type of the workflow configuration
 * @template TData - Type of the accumulated workflow data
 * @template TServices - Type of the resolved services
 *
 * @example Creating a workflow context
 * ```typescript
 * type Config = { projectName: string; verbose: boolean };
 * type Data = { files: string[]; processedCount: number };
 *
 * const ctx = ImmutableWorkflowContext.create<Config, Data>(
 *   { projectName: "my-app", verbose: true },
 *   resolvedServices,
 *   { files: [], processedCount: 0 }
 * );
 * ```
 */
export class ImmutableWorkflowContext<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    TServices = DefaultServices,
> implements WorkflowContext<TConfig, TData, TServices>
{
    readonly startTime: Date;
    readonly config: Readonly<TConfig>;
    readonly services: TServices;

    /**
     * Internal data - frozen on access via snapshot()
     */
    readonly #data: TData;

    /**
     * Cached frozen snapshot
     */
    #frozenData: Readonly<TData> | null = null;

    get [Symbol.toStringTag](): string {
        return "WorkflowContext";
    }

    private constructor(startTime: Date, config: Readonly<TConfig>, data: TData, services: TServices) {
        this.startTime = startTime;
        this.config = config;
        this.#data = data;
        this.services = services;
    }

    /**
     * Provides read-only access to data with lazy freezing
     */
    get data(): Readonly<TData> {
        this.#frozenData ??= Object.freeze({ ...this.#data });
        return this.#frozenData;
    }

    /**
     * Creates a new workflow context.
     *
     * @template TC - Configuration type
     * @template TD - Data type
     * @template TS - Services type
     * @param config - Workflow configuration
     * @param services - Resolved services
     * @param initialData - Optional initial data values
     *
     * @example Without initial data
     * ```typescript
     * const ctx = ImmutableWorkflowContext.create(
     *   { version: "1.0.0" },
     *   services
     * );
     * ```
     *
     * @example With initial data
     * ```typescript
     * const ctx = ImmutableWorkflowContext.create(
     *   { version: "1.0.0" },
     *   services,
     *   { buildNumber: 42, artifacts: [] }
     * );
     * ```
     */
    static create<TC, TD extends WorkflowData = WorkflowData, TS = DefaultServices>(
        config: TC,
        services: TS,
        initialData?: Partial<TD>
    ): WorkflowContext<TC, TD, TS> {
        const startTime = new Date();
        const frozenConfig = Object.freeze({ ...config }) as Readonly<TC>;
        const data = (initialData ?? {}) as TD;

        return new ImmutableWorkflowContext<TC, TD, TS>(startTime, frozenConfig, data, services);
    }

    /**
     * @example Safely retrieving a value
     * ```typescript
     * const versionResult = ctx.get("version");
     * if (versionResult.isOk()) {
     *   console.log(`Processing version: ${versionResult.value}`);
     * }
     * ```
     *
     * @example Handling missing keys
     * ```typescript
     * const result = ctx.get("optionalField");
     * if (result.isErr()) {
     *   // Key doesn't exist - use default or handle error
     *   return FireflyOkAsync(ctx.fork("optionalField", defaultValue));
     * }
     * ```
     */
    get<K extends keyof TData>(key: K): FireflyResult<TData[K]> {
        if (!(key in this.#data)) {
            return validationErr({
                message: `Key "${String(key)}" not found in context`,
            });
        }

        return FireflyOk(this.#data[key]);
    }

    /**
     * @example Updating a single value
     * ```typescript
     * const updatedCtx = ctx.fork("status", "completed");
     * ```
     *
     * @example Chaining forks
     * ```typescript
     * const finalCtx = ctx
     *   .fork("startedAt", new Date())
     *   .fork("status", "in-progress");
     * ```
     *
     * @example No-op when value is identical (returns same instance)
     * ```typescript
     * const ctx1 = ctx.fork("count", 5);
     * const ctx2 = ctx1.fork("count", 5);
     * console.log(ctx1 === ctx2); // true - same reference
     * ```
     */
    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData, TServices> {
        // If value is identical, return self
        if (this.#data[key] === value) {
            return this;
        }

        // Reuse config and services, only copy data
        const updatedData = { ...this.#data, [key]: value } as TData;
        return new ImmutableWorkflowContext<TConfig, TData, TServices>(
            this.startTime,
            this.config,
            updatedData,
            this.services
        );
    }

    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData, TServices> {
        const updateKeys = Object.keys(updates) as Array<keyof TData>;

        // No updates means return self
        if (updateKeys.length === 0) {
            return this;
        }

        // Check if all values are identical
        const hasChanges = updateKeys.some((key) => this.#data[key] !== updates[key]);
        if (!hasChanges) {
            return this;
        }

        // Spread existing data, apply updates
        const updatedData = { ...this.#data, ...updates } as TData;
        return new ImmutableWorkflowContext<TConfig, TData, TServices>(
            this.startTime,
            this.config,
            updatedData,
            this.services
        );
    }

    has<K extends keyof TData>(key: K): boolean {
        return key in this.#data;
    }

    snapshot(): Readonly<TData> {
        return this.data;
    }
}
