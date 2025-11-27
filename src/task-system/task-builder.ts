import { ok } from "neverthrow";
import type { z } from "zod";
import type {
	GenericWorkflowContext,
	SkipCondition,
	Task,
	TaskMetadata,
} from "#/task-system/task-types";
import type { FireflyAsyncResult, FireflyResult } from "#/utils/result";

export class TaskBuilder {
	private taskId: string;
	private taskDescription?: string;
	private taskDependencies: string[] = [];
	private taskConfigSchema?: z.ZodType;
	private skipFn?: (
		context: GenericWorkflowContext,
	) => FireflyResult<SkipCondition>;
	private executeFn?: (
		context: GenericWorkflowContext,
	) => FireflyAsyncResult<GenericWorkflowContext>;
	private undoFn?: (
		context: GenericWorkflowContext,
	) => FireflyAsyncResult<void>;

	private constructor(id: string) {
		this.taskId = id;
	}

	static create(id: string): TaskBuilder {
		return new TaskBuilder(id);
	}

	description(desc: string): TaskBuilder {
		this.taskDescription = desc;
		return this;
	}

	dependsOn(taskId: string): TaskBuilder {
		this.taskDependencies.push(taskId);
		return this;
	}

	dependsOnAll(...taskIds: string[]): TaskBuilder {
		this.taskDependencies.push(...taskIds);
		return this;
	}

	withConfigSchema(schema: z.ZodType): TaskBuilder {
		this.taskConfigSchema = schema;
		return this;
	}

	skipWhen(
		predicate: (context: GenericWorkflowContext) => boolean,
	): TaskBuilder {
		this.skipFn = (ctx) =>
			ok({
				shouldSkip: predicate(ctx),
				reason: "Skip condition met",
			});
		return this;
	}

	skipWhenWithReason(
		predicate: (context: GenericWorkflowContext) => boolean,
		reason: string,
	): TaskBuilder {
		this.skipFn = (ctx) =>
			ok({
				shouldSkip: predicate(ctx),
				reason,
			});
		return this;
	}

	skipWhenAndJumpTo(
		predicate: (context: GenericWorkflowContext) => boolean,
		skipToTasks: string[],
	): TaskBuilder {
		this.skipFn = (ctx) =>
			ok({
				shouldSkip: predicate(ctx),
				reason: "Skip condition met",
				skipToTasks,
			});
		return this;
	}

	shouldSkip(
		fn: (context: GenericWorkflowContext) => FireflyResult<SkipCondition>,
	): TaskBuilder {
		this.skipFn = fn;
		return this;
	}

	execute(
		fn: (
			context: GenericWorkflowContext,
		) => FireflyAsyncResult<GenericWorkflowContext>,
	): TaskBuilder {
		this.executeFn = fn;
		return this;
	}

	withUndo(
		fn: (context: GenericWorkflowContext) => FireflyAsyncResult<void>,
	): TaskBuilder {
		this.undoFn = fn;
		return this;
	}

	build(): Task {
		if (!this.executeFn) {
			throw new Error(`Task "${this.taskId}" must have an execute function`);
		}

		if (!this.taskDescription) {
			throw new Error(`Task "${this.taskId}" must have a description`);
		}

		const meta: TaskMetadata = {
			id: this.taskId,
			description: this.taskDescription,
			dependencies:
				this.taskDependencies.length > 0 ? this.taskDependencies : undefined,
			configSchema: this.taskConfigSchema,
		};

		return {
			meta,
			shouldSkip: this.skipFn,
			execute: this.executeFn,
			undo: this.undoFn,
		};
	}
}

export function buildTask(id: string): TaskBuilder {
	return TaskBuilder.create(id);
}
