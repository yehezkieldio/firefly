import { okAsync } from "neverthrow";
import { ImmutableWorkflowContext, type WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Testing utilities for the rewritten architecture.
 */

/**
 * Create a test context with given config and data.
 */
export function createTestContext<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(
    options: { config?: TConfig; data?: Partial<TData>; executionId?: string; startTime?: Date } = {},
): WorkflowContext<TConfig, TData> {
    const config = (options.config ?? {}) as TConfig;
    const data = (options.data ?? {}) as TData;

    const context = ImmutableWorkflowContext.create<TConfig, TData>(config, data);

    // Override execution ID and start time if provided
    if (options.executionId || options.startTime) {
        // Since context is immutable, we'd need to extend the class or use a test-specific implementation
        // For now, return the basic context
    }

    return context;
}

/**
 * Create a mock task for testing.
 */
export function mockTask(
    id: string,
    options: {
        description?: string;
        dependencies?: string[];
        shouldSkip?: boolean;
        execute?: (
            context: WorkflowContext<unknown, Record<string, unknown>>,
        ) => FireflyAsyncResult<WorkflowContext<unknown, Record<string, unknown>>>;
        undo?: (context: WorkflowContext<unknown, Record<string, unknown>>) => FireflyAsyncResult<void>;
    } = {},
): Task {
    return {
        meta: {
            id,
            description: options.description ?? `Mock task: ${id}`,
            dependencies: options.dependencies,
        },
        shouldSkip: options.shouldSkip
            ? () => ({
                  _tag: "Ok",
                  value: { shouldSkip: true, reason: "Mocked skip" },
              })
            : undefined,
        execute: options.execute ?? ((ctx) => okAsync(ctx)),
        undo: options.undo,
    };
}

/**
 * Create a spy task that records its calls.
 */
export interface TaskSpy {
    task: Task;
    calls: {
        execute: Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>;
        undo: Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>;
        shouldSkip: Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>;
    };
    reset: () => void;
}

export function createTaskSpy(
    id: string,
    options: {
        description?: string;
        dependencies?: string[];
    } = {},
): TaskSpy {
    const calls = {
        execute: [] as Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>,
        undo: [] as Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>,
        shouldSkip: [] as Array<{ context: WorkflowContext<unknown, Record<string, unknown>> }>,
    };

    const task: Task = {
        meta: {
            id,
            description: options.description ?? `Spy task: ${id}`,
            dependencies: options.dependencies,
        },
        shouldSkip(ctx) {
            calls.shouldSkip.push({ context: ctx });
            return {
                _tag: "Ok",
                value: { shouldSkip: false },
            };
        },
        execute(ctx) {
            calls.execute.push({ context: ctx });
            return okAsync(ctx);
        },
        undo(ctx) {
            calls.undo.push({ context: ctx });
            return okAsync();
        },
    };

    return {
        task,
        calls,
        reset() {
            calls.execute = [];
            calls.undo = [];
            calls.shouldSkip = [];
        },
    };
}

/**
 * Test workflow builder for integration testing.
 */
export class TestWorkflow<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>> {
    private config?: TConfig;
    private initialData?: Partial<TData>;
    private taskMocks: Map<string, Task> = new Map();

    private constructor() {}

    static create<TConfig = unknown, TData extends Record<string, unknown> = Record<string, unknown>>(): TestWorkflow<
        TConfig,
        TData
    > {
        return new TestWorkflow<TConfig, TData>();
    }

    /**
     * Set the workflow configuration.
     */
    withConfig(config: TConfig): TestWorkflow<TConfig, TData> {
        this.config = config;
        return this;
    }

    /**
     * Set initial workflow data.
     */
    withData(data: Partial<TData>): TestWorkflow<TConfig, TData> {
        this.initialData = data;
        return this;
    }

    /**
     * Mock a specific task.
     */
    mockTask(taskId: string, mockTask: Task): TestWorkflow<TConfig, TData> {
        this.taskMocks.set(taskId, mockTask);
        return this;
    }

    /**
     * Get the test context.
     */
    getContext(): WorkflowContext<TConfig, TData> {
        return createTestContext({
            config: this.config,
            data: this.initialData,
        });
    }

    /**
     * Get mocked tasks.
     */
    getMockedTasks(): Map<string, Task> {
        return this.taskMocks;
    }
}

/**
 * Assertion helpers for testing.
 */
export const expect = {
    /**
     * Assert that a Result is Ok.
     */
    resultOk<T>(result: { isOk: () => boolean; value: T }): T {
        if (!result.isOk()) {
            throw new Error("Expected Result to be Ok, but it was Err");
        }
        return result.value;
    },

    /**
     * Assert that a Result is Err.
     */
    resultErr(result: { isErr: () => boolean; error: unknown }): unknown {
        if (!result.isErr()) {
            throw new Error("Expected Result to be Err, but it was Ok");
        }
        return result.error;
    },

    /**
     * Assert that a context has a specific value.
     */
    contextHas<TData extends Record<string, unknown>>(
        context: WorkflowContext<unknown, TData>,
        key: keyof TData,
    ): boolean {
        return context.has(key);
    },

    /**
     * Get a value from context and assert it exists.
     */
    contextValue<TData extends Record<string, unknown>, K extends keyof TData>(
        context: WorkflowContext<unknown, TData>,
        key: K,
    ): TData[K] {
        const result = context.get(key);
        if (result.isErr()) {
            throw new Error(`Expected context to have key "${String(key)}"`);
        }
        return result.value;
    },
};
