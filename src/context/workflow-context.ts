/**
 * Workflow Context Module
 *
 * Provides an immutable context object that flows through workflow execution.
 * The context carries configuration, accumulated data, and service references
 * throughout the task execution lifecycle.
 *
 * Key design principles:
 * - **Immutability**: Data changes create new context instances via `fork()`
 * - **Type Safety**: Generic parameters ensure compile-time type checking
 * - **Service Access**: Centralized access to all resolved services
 * - **Structural Sharing**: Fork operations share unchanged references
 *
 * @module context/workflow-context
 */

import { err, ok } from "neverthrow";
import type { ResolvedServices, ServiceKey } from "#/services/service-registry";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

/** Default services type when using all available services */
type DefaultServices = ResolvedServices<ServiceKey>;

// ============================================================================
// Simplified Generic Constraints
// ============================================================================

/** Base constraint for workflow data - must be a record with string keys */
type WorkflowData = Record<string, unknown>;

// ============================================================================
// WorkflowContext Interface
// ============================================================================

/**
 * Immutable context that flows through workflow task execution.
 *
 * The context provides:
 * - Read-only access to configuration
 * - Immutable data accumulation via fork operations
 * - Service access for external operations
 *
 * @template TConfig - Type of the workflow configuration
 * @template TData - Type of the accumulated workflow data (extends WorkflowData)
 * @template TServices - Type of the resolved services
 *
 * @example
 * ```typescript
 * // In a task's execute function:
 * execute: (ctx) => {
 *   const version = ctx.config.version;
 *   const newCtx = ctx.fork("processedAt", new Date());
 *   return okAsync(newCtx);
 * }
 * ```
 */
export interface WorkflowContext<
    TConfig = unknown,
    TData extends WorkflowData = WorkflowData,
    TServices = DefaultServices,
> {
    /** Timestamp when the workflow started */
    readonly startTime: Date;
    /** Frozen configuration for the workflow */
    readonly config: Readonly<TConfig>;
    /** Frozen accumulated data from task executions */
    readonly data: Readonly<TData>;
    /** Resolved services available to tasks */
    readonly services: TServices;

    /**
     * Retrieves a value from the context data.
     * @param key - The data key to retrieve
     * @returns `Ok(value)` if found, `Err` if key doesn't exist
     */
    get<K extends keyof TData>(key: K): FireflyResult<TData[K]>;

    /**
     * Creates a new context with an updated data value.
     * Original context remains unchanged (immutable).
     * Uses structural sharing for optimal memory usage.
     * @param key - The data key to set
     * @param value - The new value
     * @returns New context with the updated data
     */
    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData, TServices>;

    /**
     * Creates a new context with multiple updated data values.
     * Uses structural sharing - only creates new objects for changed paths.
     * @param updates - Object containing key-value pairs to update
     * @returns New context with all updates applied
     */
    forkMultiple(updates: Partial<TData>): WorkflowContext<TConfig, TData, TServices>;

    /**
     * Checks if a key exists in the context data.
     * @param key - The data key to check
     */
    has<K extends keyof TData>(key: K): boolean;

    /**
     * Returns a frozen snapshot of the current data.
     */
    snapshot(): Readonly<TData>;
}

// ============================================================================
// ImmutableWorkflowContext Implementation
// ============================================================================

/**
 * Immutable implementation of WorkflowContext with optimized structural sharing.
 *
 * All data modifications create new instances, ensuring task execution
 * doesn't accidentally mutate shared state. Uses Object.freeze() for
 * runtime immutability enforcement.
 *
 * Optimizations:
 * - Structural sharing: config and services are shared across forks
 * - Lazy freezing: data is only frozen when accessed via snapshot()
 * - Fast path: forkMultiple with empty updates returns same instance
 *
 * @template TConfig - Type of the workflow configuration
 * @template TData - Type of the accumulated workflow data
 * @template TServices - Type of the resolved services
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

    /** Internal data - frozen on access via snapshot() */
    readonly #data: TData;
    /** Cached frozen snapshot */
    #frozenData: Readonly<TData> | null = null;

    private constructor(startTime: Date, config: Readonly<TConfig>, data: TData, services: TServices) {
        this.startTime = startTime;
        this.config = config;
        this.#data = data;
        this.services = services;
    }

    /** Provides read-only access to data with lazy freezing */
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

    get<K extends keyof TData>(key: K): FireflyResult<TData[K]> {
        if (!(key in this.#data)) {
            return err(
                createFireflyError({
                    code: "VALIDATION",
                    message: `Key "${String(key)}" not found in context`,
                    source: "WorkflowContext.get",
                })
            );
        }

        return ok(this.#data[key]);
    }

    fork<K extends keyof TData>(key: K, value: TData[K]): WorkflowContext<TConfig, TData, TServices> {
        // Fast path: if value is identical, return self
        if (this.#data[key] === value) {
            return this;
        }

        // Structural sharing: reuse config and services, only copy data
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

        // Fast path: no updates means return self
        if (updateKeys.length === 0) {
            return this;
        }

        // Fast path: check if all values are identical
        const hasChanges = updateKeys.some((key) => this.#data[key] !== updates[key]);
        if (!hasChanges) {
            return this;
        }

        // Structural sharing: spread existing data, apply updates
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
