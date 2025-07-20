import type { AsyncFireflyResult } from "#/shared/utils/result";

export interface Command {
    execute(): AsyncFireflyResult<void>;
    undo(): AsyncFireflyResult<void>;
    getName(): string;
    getDescription(): string;
}
