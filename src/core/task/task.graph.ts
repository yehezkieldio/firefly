import { FireflyOk, invalidErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import type { Task } from "#/core/task/task.types";
import { logger } from "#/infrastructure/logging";

/**
 * Result of task graph validation.
 */
export interface GraphValidationResult {
    /**
     * Whether the graph is valid (no errors)
     */
    readonly isValid: boolean;

    /**
     * Critical errors that prevent execution
     */
    readonly errors: string[];

    /**
     * Non-critical warnings
     */
    readonly warnings: string[];

    /**
     * Computed execution order (topological sort)
     */
    readonly executionOrder: string[];

    /**
     * Map of task ID to its depth in the dependency tree
     */
    readonly depthMap: Map<string, number>;
}

/**
 * Validates a task dependency graph.
 *
 * Checks for:
 * - Duplicate task IDs
 * - Missing dependencies (references to non-existent tasks)
 * - Circular dependencies
 *
 * Returns the execution order (topological sort) if valid.
 *
 * @param tasks - Array of tasks to validate
 * @returns Validation result with errors, warnings, and execution order
 *
 * @example
 * ```typescript
 * const result = validateTaskGraph(tasks);
 * if (!result.isValid) {
 *   console.error("Graph validation failed:", result.errors);
 * } else {
 *   console.log("Execution order:", result.executionOrder);
 * }
 * ```
 */
export function validateTaskGraph(tasks: Task[]): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const taskMap = buildTaskMap(tasks, errors);

    checkMissingDependencies(tasks, taskMap, errors, warnings);
    checkCyclicDependencies(tasks, taskMap, errors);

    const { executionOrder, depthMap } = computeExecutionOrder(tasks, taskMap, errors);

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        executionOrder,
        depthMap,
    };
}

/**
 * Builds a map of task IDs to Task objects for efficient lookup.
 *
 * Also detects and reports duplicate task IDs.
 *
 * @param tasks - Array of tasks to index
 * @param errors - Array to collect duplicate ID errors
 * @returns Map from task ID to Task object
 */
function buildTaskMap(tasks: Task[], errors: string[]): Map<string, Task> {
    const taskMap = new Map<string, Task>();
    for (const task of tasks) {
        if (taskMap.has(task.meta.id)) {
            errors.push(`Duplicate task ID: "${task.meta.id}"`);
        } else {
            taskMap.set(task.meta.id, task);
        }
    }
    return taskMap;
}

/**
 * Validates that all task dependencies reference existing tasks.
 *
 * Also warns about tasks missing descriptions.
 *
 * @param tasks - Array of tasks to validate
 * @param taskMap - Map of task IDs to Task objects
 * @param errors - Array to collect missing dependency errors
 * @param warnings - Array to collect non-critical warnings
 */
function checkMissingDependencies(
    tasks: Task[],
    taskMap: Map<string, Task>,
    errors: string[],
    warnings: string[]
): void {
    for (const task of tasks) {
        const deps = task.meta.dependencies ?? [];
        for (const depId of deps) {
            if (!taskMap.has(depId)) {
                errors.push(`Task "${task.meta.id}" depends on unknown task "${depId}"`);
            }
        }
        if (!task.meta.description || task.meta.description.trim() === "") {
            warnings.push(`Task "${task.meta.id}" has no description`);
        }
    }
}

/**
 * Detects circular dependencies in the task graph using DFS.
 *
 * When a cycle is detected, adds an error message showing the cycle path
 * (e.g., "A → B → C → A").
 *
 * @param tasks - Array of tasks to check
 * @param taskMap - Map of task IDs to Task objects
 * @param errors - Array to collect cycle detection errors
 */
function checkCyclicDependencies(tasks: Task[], taskMap: Map<string, Task>, errors: string[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string, path: string[]): boolean => {
        if (recursionStack.has(taskId)) {
            const cycleStart = path.indexOf(taskId);
            const cycle = [...path.slice(cycleStart), taskId].join(" → ");
            errors.push(`Circular dependency detected: ${cycle}`);
            return true;
        }

        if (visited.has(taskId)) {
            return false;
        }

        visited.add(taskId);
        recursionStack.add(taskId);

        const task = taskMap.get(taskId);
        if (task) {
            const deps = task.meta.dependencies ?? [];
            for (const depId of deps) {
                if (taskMap.has(depId) && hasCycle(depId, [...path, taskId])) {
                    return true;
                }
            }
        }

        recursionStack.delete(taskId);
        return false;
    };

    for (const task of tasks) {
        if (!visited.has(task.meta.id)) {
            hasCycle(task.meta.id, []);
        }
    }
}

/**
 * Computes the execution order and depth map for a validated task graph.
 *
 * Uses topological sort to determine execution order and calculates
 * the depth of each task in the dependency tree.
 *
 * @param tasks - Array of tasks to order
 * @param taskMap - Map of task IDs to Task objects
 * @param errors - Array of existing validation errors (skips computation if non-empty)
 * @returns Object containing execution order (task IDs) and depth map
 */
function computeExecutionOrder(
    tasks: Task[],
    taskMap: Map<string, Task>,
    errors: string[]
): { executionOrder: string[]; depthMap: Map<string, number> } {
    const executionOrder: string[] = [];
    const depthMap = new Map<string, number>();

    if (errors.length === 0) {
        const sorted = topologicalSort(tasks);
        if (sorted.isOk()) {
            executionOrder.push(...sorted.value);

            for (const taskId of executionOrder) {
                const task = taskMap.get(taskId);
                if (task) {
                    const deps = task.meta.dependencies ?? [];
                    const maxDepDepth = deps.reduce((max, depId) => {
                        const depDepth = depthMap.get(depId) ?? 0;
                        return Math.max(max, depDepth);
                    }, -1);
                    depthMap.set(taskId, maxDepDepth + 1);
                }
            }
        }
    }

    return { executionOrder, depthMap };
}

/**
 * Performs topological sort on tasks.
 *
 * @param tasks - Tasks to sort
 * @returns Sorted task IDs or error if cycle detected
 */
export function topologicalSort(tasks: Task[]): FireflyResult<string[]> {
    const taskMap = new Map<string, Task>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const task of tasks) {
        taskMap.set(task.meta.id, task);
        inDegree.set(task.meta.id, 0);
        adjacency.set(task.meta.id, []);
    }

    // Build adjacency list and compute in-degrees
    for (const task of tasks) {
        const deps = task.meta.dependencies ?? [];
        for (const depId of deps) {
            const adjList = adjacency.get(depId);
            if (adjList) {
                adjList.push(task.meta.id);
                inDegree.set(task.meta.id, (inDegree.get(task.meta.id) ?? 0) + 1);
            }
        }
    }

    // Kahn's algorithm
    const queue: string[] = [];
    for (const [taskId, degree] of inDegree) {
        if (degree === 0) {
            queue.push(taskId);
        }
    }

    const result: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;
        result.push(current);

        const dependents = adjacency.get(current) ?? [];
        for (const dependent of dependents) {
            const newDegree = (inDegree.get(dependent) ?? 1) - 1;
            inDegree.set(dependent, newDegree);
            if (newDegree === 0) {
                queue.push(dependent);
            }
        }
    }

    if (result.length !== tasks.length) {
        return invalidErr({
            message: "Circular dependency detected in task graph",
        });
    }

    return FireflyOk(result);
}

/**
 * Statistics about a task graph.
 */
export interface GraphStatistics {
    /**
     * Total number of tasks
     */
    readonly totalTasks: number;

    /**
     * Number of root tasks (no dependencies)
     */
    readonly rootTasks: number;

    /**
     * Number of leaf tasks (no dependents)
     */
    readonly leafTasks: number;

    /**
     * Maximum depth of the dependency tree
     */
    readonly maxDepth: number;

    /**
     * Total number of dependency edges
     */
    readonly totalEdges: number;

    /**
     * Average dependencies per task
     */
    readonly avgDependencies: number;

    /**
     * Tasks with most dependencies
     */
    readonly mostDependentTasks: string[];

    /**
     * Tasks that are dependencies for most other tasks
     */
    readonly mostDependendUponTasks: string[];
}

/**
 * Computes statistics about a task graph.
 *
 * @param tasks - Tasks to analyze
 * @returns Graph statistics
 *
 * @example
 * ```typescript
 * const stats = getGraphStatistics(tasks);
 * console.log(`Total tasks: ${stats.totalTasks}`);
 * console.log(`Max depth: ${stats.maxDepth}`);
 * ```
 */
export function getGraphStatistics(tasks: Task[]): GraphStatistics {
    const validation = validateTaskGraph(tasks);
    const dependentCount = new Map<string, number>();

    // Initialize dependent count
    for (const task of tasks) {
        dependentCount.set(task.meta.id, 0);
    }

    // Count how many tasks depend on each task
    let totalEdges = 0;
    for (const task of tasks) {
        const deps = task.meta.dependencies ?? [];
        totalEdges += deps.length;
        for (const depId of deps) {
            dependentCount.set(depId, (dependentCount.get(depId) ?? 0) + 1);
        }
    }

    // Find roots and leaves
    const rootTasks = tasks.filter((t) => (t.meta.dependencies ?? []).length === 0);
    const leafTasks = tasks.filter((t) => (dependentCount.get(t.meta.id) ?? 0) === 0);

    // Find tasks with most dependencies
    const sortedByDeps = [...tasks].sort(
        (a, b) => (b.meta.dependencies ?? []).length - (a.meta.dependencies ?? []).length
    );
    const maxDeps = (sortedByDeps[0]?.meta.dependencies ?? []).length;
    const mostDependentTasks = sortedByDeps
        .filter((t) => (t.meta.dependencies ?? []).length === maxDeps && maxDeps > 0)
        .map((t) => t.meta.id);

    // Find tasks that are depended upon most
    const sortedByDependents = [...dependentCount.entries()].sort((a, b) => b[1] - a[1]);
    const maxDependents = sortedByDependents[0]?.[1] ?? 0;
    const mostDependendUponTasks = sortedByDependents
        .filter(([, count]) => count === maxDependents && maxDependents > 0)
        .map(([id]) => id);

    return {
        totalTasks: tasks.length,
        rootTasks: rootTasks.length,
        leafTasks: leafTasks.length,
        maxDepth: Math.max(...validation.depthMap.values(), 0),
        totalEdges,
        avgDependencies: tasks.length > 0 ? totalEdges / tasks.length : 0,
        mostDependentTasks,
        mostDependendUponTasks,
    };
}

/**
 * Logs graph statistics to the logger.
 *
 * @param stats - Graph statistics to log
 */
export function logGraphStatistics(stats: GraphStatistics): void {
    logger.verbose("");
    logger.verbose("Task Graph Statistics:");
    logger.verbose(`Total tasks: ${stats.totalTasks}`);
    logger.verbose(`Root tasks (can run first): ${stats.rootTasks}`);
    logger.verbose(`Leaf tasks (final): ${stats.leafTasks}`);
    logger.verbose(`Max depth: ${stats.maxDepth}`);
    logger.verbose(`Avg dependencies: ${stats.avgDependencies.toFixed(2)}`);

    if (stats.mostDependentTasks.length > 0) {
        logger.verbose(`Most dependent tasks: ${stats.mostDependentTasks.join(", ")}`);
    }

    if (stats.mostDependendUponTasks.length > 0) {
        logger.verbose(`Critical path tasks: ${stats.mostDependendUponTasks.join(", ")}`);
    }

    logger.verbose("");
}
