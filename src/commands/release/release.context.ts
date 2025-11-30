import type { ReleaseConfig } from "#/commands/release/release.config";
import type { ReleaseData } from "#/commands/release/release.data";
import type { WorkflowContext } from "#/core/context/workflow.context";

/**
 * Type-alias for release workflow context
 */
export type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, unknown>;
