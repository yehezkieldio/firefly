import { ok, err, okAsync, errAsync } from "neverthrow";
import type { Result } from "neverthrow";
import { WorkflowContext } from "#/rewrite/context/workflow-context";
import type { Task } from "#/rewrite/task-system/task-types";
import type { FireflyError, FireflyResult } from "#/rewrite/shared/types";

/**
 * Create a test context with mock config and data
 */
export function createTestContext<TConfig extends Record<string, unknown> = Record<string, unknown>>(
    options: {
        config?: Partial<TConfig>;
        data?: Record<string, unknown>;
    } = {}
): WorkflowContext<TConfig> {
    const defaultConfig = {
        verbose: false,
        dryRun: false,
        enableRollback: true,
        ...options.config,
    } as TConfig;

    return new WorkflowContext(defaultConfig, options.data || {});
}

/**
 * Assert that a Result is Ok and return the value
 */
export function expectOk<T, E>(result: Result<T, E>): T {
    if (result.isErr()) {
        throw new Error(`Expected Ok, got Err: ${result.error}`);
    }
    return result.value;
}

/**
 * Assert that a Result is Err and return the error
 */
export function expectErr<T, E>(result: Result<T, E>): E {
    if (result.isOk()) {
        throw new Error(`Expected Err, got Ok: ${result.value}`);
    }
    return result.error;
}

/**
 * Run a sequence of tasks and return the final context
 */
export async function runTaskSequence<TConfig extends Record<string, unknown>>(
    tasks: Task<TConfig>[],
    initialContext: WorkflowContext<TConfig>
): Promise<FireflyResult<WorkflowContext<TConfig>>> {
    let ctx = initialContext;
    
    for (const task of tasks) {
        // Check skip condition
        const shouldSkipResult = task.shouldSkip ? task.shouldSkip(ctx) : ok({ shouldSkip: false });
        if (shouldSkipResult.isErr()) {
            return err(shouldSkipResult.error);
        }
        
        if (shouldSkipResult.value.shouldSkip) {
            continue;
        }
        
        // Execute task
        const result = await task.execute(ctx);
        if (result.isErr()) {
            return err(result.error);
        }
        
        ctx = result.value;
    }
    
    return ok(ctx);
}

/**
 * Create a mock task for testing
 */
export function createMockTask<TConfig extends Record<string, unknown>>(
    id: string,
    options: {
        shouldSkip?: boolean;
        executeResult?: WorkflowContext<TConfig>;
        error?: Error;
    } = {}
): Task<TConfig> {
    return {
        meta: {
            id,
            description: `Mock task ${id}`,
            dependencies: [],
        },
        shouldSkip: options.shouldSkip !== undefined
            ? () => ok({ shouldSkip: options.shouldSkip!, reason: "Mock skip" })
            : undefined,
        execute: (ctx: WorkflowContext<TConfig>) => {
            if (options.error) {
                return errAsync(options.error as FireflyError);
            }
            return okAsync(options.executeResult || ctx);
        },
    };
}
