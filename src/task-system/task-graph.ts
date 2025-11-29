/**
 * Task Graph Module
 *
 * Provides utilities for analyzing and visualizing task dependency graphs.
 * Useful for validation, debugging, and documentation.
 *
 * @module task-system/task-graph
 */

import { err, ok } from "neverthrow";
import type { Task } from "#/task-system/task-types";
import { createFireflyError } from "#/utils/error";
import type { FireflyResult } from "#/utils/result";

// ============================================================================
// Graph Validation
// ============================================================================

/**
 * Result of task graph validation.
 */
export interface GraphValidationResult {
    /** Whether the graph is valid (no errors) */
    readonly isValid: boolean;
    /** Critical errors that prevent execution */
    readonly errors: string[];
    /** Non-critical warnings */
    readonly warnings: string[];
    /** Computed execution order (topological sort) */
    readonly executionOrder: string[];
    /** Map of task ID to its depth in the dependency tree */
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
        return err(
            createFireflyError({
                code: "INVALID",
                message: "Circular dependency detected in task graph",
                source: "task-graph/topologicalSort",
            })
        );
    }

    return ok(result);
}

// ============================================================================
// Graph Visualization
// ============================================================================

/**
 * Options for Mermaid diagram generation.
 */
export interface MermaidOptions {
    /** Direction of the graph flow */
    readonly direction?: "TB" | "BT" | "LR" | "RL";
    /** Whether to include task descriptions as tooltips */
    readonly includeDescriptions?: boolean;
    /** Custom node styles by task ID */
    readonly nodeStyles?: Record<string, string>;
    /** Title for the diagram */
    readonly title?: string;
}

/**
 * Generates a Mermaid diagram from a task graph.
 *
 * Creates a flowchart showing task dependencies that can be rendered
 * by Mermaid-compatible tools.
 *
 * @param tasks - Tasks to visualize
 * @param options - Diagram options
 * @returns Mermaid diagram source code
 *
 * @example
 * ```typescript
 * const diagram = taskGraphToMermaid(tasks, {
 *   direction: "LR",
 *   title: "Release Workflow",
 * });
 * console.log(diagram);
 * // flowchart LR
 * //   preflight[preflight]
 * //   bump[bump]
 * //   preflight --> bump
 * ```
 */
export function taskGraphToMermaid(tasks: Task[], options: MermaidOptions = {}): string {
    const { direction = "TB", includeDescriptions = false, nodeStyles = {}, title } = options;

    const lines: string[] = [];

    // Add title if provided
    if (title) {
        lines.push("---");
        lines.push(`title: ${title}`);
        lines.push("---");
    }

    lines.push(`flowchart ${direction}`);

    // Add nodes
    for (const task of tasks) {
        const nodeId = sanitizeId(task.meta.id);
        const label = task.meta.id;

        if (includeDescriptions && task.meta.description) {
            lines.push(`    ${nodeId}["${label}<br/><small>${escapeQuotes(task.meta.description)}</small>"]`);
        } else {
            lines.push(`    ${nodeId}[${label}]`);
        }
    }

    lines.push("");

    // Add edges
    for (const task of tasks) {
        const deps = task.meta.dependencies ?? [];
        const targetId = sanitizeId(task.meta.id);

        for (const depId of deps) {
            const sourceId = sanitizeId(depId);
            lines.push(`    ${sourceId} --> ${targetId}`);
        }
    }

    // Add custom styles
    const styleEntries = Object.entries(nodeStyles);
    if (styleEntries.length > 0) {
        lines.push("");
        for (const [taskId, style] of styleEntries) {
            lines.push(`    style ${sanitizeId(taskId)} ${style}`);
        }
    }

    return lines.join("\n");
}

/**
 * Generates an ASCII representation of the task graph.
 *
 * Useful for console output or environments without Mermaid support.
 *
 * @param tasks - Tasks to visualize
 * @returns ASCII diagram string
 *
 * @example
 * ```typescript
 * const ascii = taskGraphToAscii(tasks);
 * console.log(ascii);
 * // ┌──────────────┐
 * // │  preflight   │
 * // └──────┬───────┘
 * //        │
 * //        ▼
 * // ┌──────────────┐
 * // │    bump      │
 * // └──────────────┘
 * ```
 */
export function taskGraphToAscii(tasks: Task[]): string {
    const validation = validateTaskGraph(tasks);
    const lines: string[] = [];

    if (!validation.isValid) {
        lines.push("⚠️  Invalid graph - cannot generate ASCII representation");
        lines.push("");
        for (const error of validation.errors) {
            lines.push(`  ❌ ${error}`);
        }
        return lines.join("\n");
    }

    const taskMap = new Map<string, Task>();
    for (const task of tasks) {
        taskMap.set(task.meta.id, task);
    }

    // Group tasks by depth
    const depthGroups = new Map<number, string[]>();
    for (const [taskId, depth] of validation.depthMap) {
        const group = depthGroups.get(depth);
        if (group) {
            group.push(taskId);
        } else {
            depthGroups.set(depth, [taskId]);
        }
    }

    const maxDepth = Math.max(...depthGroups.keys(), 0);

    for (let depth = 0; depth <= maxDepth; depth++) {
        const tasksAtDepth = depthGroups.get(depth) ?? [];

        if (depth > 0) {
            lines.push("        │");
            lines.push("        ▼");
        }

        for (const taskId of tasksAtDepth) {
            const task = taskMap.get(taskId);
            if (!task) continue;

            const width = Math.max(taskId.length + 4, 14);
            const padding = " ".repeat(Math.floor((width - taskId.length) / 2));

            lines.push(`┌${"─".repeat(width)}┐`);
            lines.push(`│${padding}${taskId}${padding}${taskId.length % 2 === 0 ? "" : " "}│`);
            if (task.meta.description) {
                const desc = task.meta.description.slice(0, width - 2);
                const descPadding = " ".repeat(Math.floor((width - desc.length) / 2));
                lines.push(`│${descPadding}${desc}${descPadding}${desc.length % 2 === 0 ? "" : " "}│`);
            }
            lines.push(`└${"─".repeat(width)}┘`);
        }
    }

    return lines.join("\n");
}

// ============================================================================
// Graph Statistics
// ============================================================================

/**
 * Statistics about a task graph.
 */
export interface GraphStatistics {
    /** Total number of tasks */
    readonly totalTasks: number;
    /** Number of root tasks (no dependencies) */
    readonly rootTasks: number;
    /** Number of leaf tasks (no dependents) */
    readonly leafTasks: number;
    /** Maximum depth of the dependency tree */
    readonly maxDepth: number;
    /** Total number of dependency edges */
    readonly totalEdges: number;
    /** Average dependencies per task */
    readonly avgDependencies: number;
    /** Tasks with most dependencies */
    readonly mostDependentTasks: string[];
    /** Tasks that are dependencies for most other tasks */
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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sanitizes a task ID for use in Mermaid diagrams.
 */
function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Escapes quotes in a string for Mermaid.
 */
function escapeQuotes(str: string): string {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
