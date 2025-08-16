// /**
//  * Example demonstrating how to use the new narrowed context system
//  */

// import { createReleaseWorkflow } from "#/application/workflows/release.workflow";
// import {
//     type WorkflowFactory,
//     WorkflowRunnerService,
// } from "#/modules/orchestration/application/workflow-runner.service";
// import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
// import type { Workflow } from "#/modules/orchestration/core/contracts/workflow.interface";
// import type { ReleaseContextData } from "#/modules/orchestration/core/schemas/context-data.schema";
// import { ReleaseNarrowedContext } from "#/modules/orchestration/core/services/narrowed-context.service";
// import { fireflyOk } from "#/shared/utils/result.util";

// // Example 1: Using the generic NarrowedContext
// export function createReleaseWorkflowWithGenericContext(): Workflow<"release"> {
//     return {
//         id: "example-release-workflow",
//         name: "Example Release Workflow",
//         description: "Example workflow using generic narrowed context",
//         command: "release",

//         buildTasks(context: OrchestrationContext<ReleaseContextData, "release">) {
//             // Type-safe access to configuration
//             const config = context.getConfig(); // Type: ReleaseFinalConfig

//             // Type-safe access to release-specific data
//             context.get("currentVersion"); // Type: FireflyResult<string | undefined>
//             context.get("nextVersion"); // Type: FireflyResult<string | undefined>

//             // Set release-specific data
//             const setResult = context.set("currentVersion", "1.0.0");
//             if (setResult.isErr()) {
//                 console.error("Failed to set current version", setResult.error);
//             }

//             // Use configuration to determine tasks
//             if (!config.skipBump) {
//                 console.log("Version bump is enabled");
//             }

//             return fireflyOk([]);
//         },
//     };
// }

// // Example 2: Using the specialized ReleaseNarrowedContext
// export function demonstrateReleaseSpecificContext() {
//     // Create a release-specific context
//     const contextResult = ReleaseNarrowedContext.create({
//         command: "release",
//         config: {
//             dryRun: false,
//             skipBump: false,
//             bumpStrategy: "patch",
//         },
//     });

//     if (contextResult.isErr()) {
//         console.error("Failed to create context", contextResult.error);
//         return;
//     }

//     const context = contextResult.value;

//     // Use release-specific convenience methods
//     context.setCurrentVersion("1.0.0");
//     context.setNextVersion("1.0.1");
//     context.setChangelogContent("## v1.0.1\n\n- Bug fixes");

//     // Type-safe access
//     const currentVersion = context.getCurrentVersion(); // Type: string | undefined
//     const nextVersion = context.getNextVersion(); // Type: string | undefined
//     const config = context.getConfig(); // Type: ReleaseFinalConfig

//     console.log(`Releasing from ${currentVersion} to ${nextVersion}`);
//     console.log(`Dry run: ${config.dryRun}`);
// }

// // Example 3: Running a workflow with the new system
// export async function runReleaseWorkflowExample() {
//     const workflowFactory: WorkflowFactory<"release"> = () => createReleaseWorkflow();

//     const runner = new WorkflowRunnerService();

//     await runner.run(
//         "release",
//         {
//             dryRun: false,
//             verbose: true,
//             config: {
//                 skipBump: false,
//                 skipChangelog: false,
//                 bumpStrategy: "patch",
//             },
//         },
//         workflowFactory,
//     );
// }

// // Example 4: Type-safe workflow creation helper
// export function createTypedWorkflow<TCommand extends "release">(
//     command: TCommand,
//     implementation: Omit<Workflow<TCommand>, "command">,
// ): Workflow<TCommand> {
//     return {
//         ...implementation,
//         command,
//     };
// }

// // Usage of the helper
// export const exampleTypedWorkflow = createTypedWorkflow("release", {
//     id: "typed-release-workflow",
//     name: "Typed Release Workflow",
//     description: "A workflow created with the type-safe helper",

//     buildTasks(context) {
//         // context is automatically typed as OrchestrationContext<ReleaseContextData, "release">
//         context.getConfig(); // Fully type-safe
//         return fireflyOk([]);
//     },
// });

// // Example 5: Context extension for custom data
// export interface CustomReleaseData extends ReleaseContextData {
//     buildNumber: number;
//     releaseNotes: string[];
// }

// export function createCustomReleaseWorkflow(): Workflow<"release"> {
//     return {
//         id: "custom-release-workflow",
//         name: "Custom Release Workflow",
//         description: "Workflow with custom data handling",
//         command: "release",

//         buildTasks(context) {
//             // While the context is typed as ReleaseContextData, you can extend it
//             // by setting additional properties that fit within the schema

//             context.getConfig();

//             // Example of setting custom data (if it fits the schema)
//             const updateResult = context.update("changelogContent", (current) => {
//                 const customNotes = "## Custom Release Notes\n\n- Feature A\n- Feature B";
//                 return current ? `${current}\n\n${customNotes}` : customNotes;
//             });

//             if (updateResult.isErr()) {
//                 console.error("Failed to update changelog", updateResult.error);
//             }

//             return fireflyOk([]);
//         },
//     };
// }
