/**
 * Rewritten Firefly Architecture
 *
 * A simplified, plugin-based command and task orchestration system.
 */

// Command System
export { CommandRegistry } from "./command-registry/command-registry";
export type { Command, CommandMetadata } from "./command-registry/command-types";
export { createCommand } from "./command-registry/command-types";
export { autocommitCommand } from "./commands/autocommit";
export { commitCommand } from "./commands/commit";
// Commands
export { releaseCommand } from "./commands/release";
export type { WorkflowContext } from "./context/workflow-context";
// Context System
export { ImmutableWorkflowContext } from "./context/workflow-context";
export { ContextBuilder } from "./context/context-builder";

// Examples
export { demoCommand } from "./examples/demo-command";
export type {
    WorkflowExecutionResult,
    WorkflowExecutorOptions,
} from "./execution/workflow-executor";
// Execution System
export { WorkflowExecutor } from "./execution/workflow-executor";
export type { WorkflowOrchestratorOptions } from "./execution/workflow-orchestrator";
export { WorkflowOrchestrator } from "./execution/workflow-orchestrator";
export { TaskBuilder, buildTask } from "./task-system/task-builder";
// Task System
export { TaskRegistry } from "./task-system/task-registry";
export type { SkipCondition, Task, TaskMetadata } from "./task-system/task-types";
export { createTask } from "./task-system/task-types";
// Task Composition
export {
    composeSequential,
    composeConditional,
    composeRetry,
    composeGroup,
} from "./task-system/task-composition";

// Testing Utilities
export {
    type TaskSpy,
    TestWorkflow,
    createTaskSpy,
    createTestContext,
    expect as testExpect,
    mockTask,
} from "./testing";

// Shared Services
export * from "./shared";
