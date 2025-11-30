import type { RELEASE_SERVICES } from "#/commands/release/release.command";
import type { ReleaseConfig } from "#/commands/release/release.config";
import type { ReleaseData } from "#/commands/release/release.data";
import type { WorkflowContext } from "#/core/context/workflow.context";
import type { ResolvedServices } from "#/core/service/service.registry";

/**
 * Service keys required by the release command, derived from RELEASE_SERVICES
 */
export type ReleaseServiceKeys = (typeof RELEASE_SERVICES)[number];

/**
 * Type-alias for release workflow context
 */
export type ReleaseContext = WorkflowContext<ReleaseConfig, ReleaseData, ResolvedServices<ReleaseServiceKeys>>;
