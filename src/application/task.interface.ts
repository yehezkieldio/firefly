export interface Task {
    execute(): Promise<void>;
    undo(): Promise<void>;
    getName(): string;
    getDescription(): string;
    isUndoable?(): boolean;
}
