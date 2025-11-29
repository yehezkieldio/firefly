import { ok } from "neverthrow";
import type { FireflyErrorCode } from "#/utils/error";
import { conflictError, notFoundError } from "#/utils/error";
import { FireflyErr, type FireflyResult } from "#/utils/result";

/**
 * Configuration options for the base Registry class.
 *
 * @template T - The type of items stored in the registry
 * @template K - The key type used to identify items (defaults to string)
 */
export interface RegistryConfig<T, K extends string = string> {
    /**
     * Human-readable name of the registry for error messages.
     * @example "Task", "Command", "Service"
     */
    readonly name: string;

    /**
     * Source identifier used in error reporting.
     * Should follow the "module/file" or "Module.method" convention.
     * @example "TaskRegistry", "CommandRegistry"
     */
    readonly source: string;

    /**
     * Extracts the unique key from an item.
     * @param item - The item to extract the key from
     * @returns The unique identifier for the item
     */
    readonly getKey: (item: T) => K;

    /**
     * Optional error code to use when a duplicate item is detected.
     * @default "CONFLICT"
     */
    readonly duplicateErrorCode?: FireflyErrorCode;

    /**
     * Optional error code to use when an item is not found.
     * @default "NOT_FOUND"
     */
    readonly notFoundErrorCode?: FireflyErrorCode;
}

/**
 * Abstract base class providing common registry functionality.
 *
 * Implements the registry pattern with:
 * - Type-safe item storage and retrieval
 * - Duplicate detection with configurable error codes
 * - Batch registration with fail-fast semantics
 * - Standard CRUD-like operations (register, get, has, clear)
 *
 * @template T - The type of items stored in the registry
 * @template K - The key type used to identify items (defaults to string)
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; }
 *
 * class UserRegistry extends BaseRegistry<User> {
 *   constructor() {
 *     super({
 *       name: "User",
 *       source: "UserRegistry",
 *       getKey: (user) => user.id,
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseRegistry<T, K extends string = string> {
    /** Internal storage for registry items */
    protected readonly items = new Map<K, T>();

    /** Configuration for this registry instance */
    protected readonly config: Required<RegistryConfig<T, K>>;

    /**
     * Creates a new registry instance.
     * @param config - Configuration options for the registry
     */
    constructor(config: RegistryConfig<T, K>) {
        this.config = {
            duplicateErrorCode: "CONFLICT",
            notFoundErrorCode: "NOT_FOUND",
            ...config,
        };
    }

    /**
     * Registers a single item in the registry.
     *
     * @param item - The item to register
     * @returns `Ok(void)` on success, `Err(FireflyError)` if duplicate detected
     *
     * @example
     * ```typescript
     * const result = registry.register({ id: "task-1", name: "My Task" });
     * if (result.isErr()) {
     *   console.error(result.error.message);
     * }
     * ```
     */
    register(item: T): FireflyResult<void> {
        const key = this.config.getKey(item);

        if (this.items.has(key)) {
            return FireflyErr(
                this.config.duplicateErrorCode === "CONFLICT"
                    ? conflictError({
                          message: `${this.config.name} "${key}" is already registered`,
                          source: this.config.source,
                      })
                    : notFoundError({
                          message: `${this.config.name} "${key}" is already registered`,
                          source: this.config.source,
                      })
            );
        }

        this.items.set(key, item);
        return ok();
    }

    /**
     * Registers multiple items in sequence.
     * Stops on first error (fail-fast semantics).
     *
     * @param items - Array of items to register
     * @returns `Ok(void)` if all items registered, `Err(FireflyError)` on first failure
     */
    registerAll(items: T[]): FireflyResult<void> {
        for (const item of items) {
            const result = this.register(item);
            if (result.isErr()) {
                return result;
            }
        }
        return ok();
    }

    /**
     * Retrieves an item by its key.
     *
     * @param key - The unique identifier of the item
     * @returns `Ok(T)` if found, `Err(FireflyError)` if not found
     */
    get(key: K): FireflyResult<T> {
        const item = this.items.get(key);

        if (!item) {
            return FireflyErr(
                notFoundError({
                    message: `${this.config.name} "${key}" not found in registry`,
                    source: this.config.source,
                })
            );
        }

        return ok(item);
    }

    /**
     * Returns all registered items as an array.
     * @returns Array of all items in registration order
     */
    getAll(): T[] {
        return Array.from(this.items.values());
    }

    /**
     * Returns all registered keys.
     * @returns Array of all keys in registration order
     */
    getKeys(): K[] {
        return Array.from(this.items.keys());
    }

    /**
     * Checks if an item with the given key exists.
     * @param key - The key to check
     * @returns `true` if the item exists, `false` otherwise
     */
    has(key: K): boolean {
        return this.items.has(key);
    }

    /**
     * Returns the number of registered items.
     * @returns The count of items in the registry
     */
    size(): number {
        return this.items.size;
    }

    /**
     * Removes all items from the registry.
     */
    clear(): void {
        this.items.clear();
    }
}
