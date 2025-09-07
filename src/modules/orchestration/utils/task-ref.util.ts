import type { Task } from "#/modules/orchestration/contracts/task.interface";

export function taskRef<T extends Task>(taskClass: { new (): T } & { id?: string }): string {
    return "id" in taskClass && typeof taskClass.id === "string" ? taskClass.id : new taskClass().id;
}
