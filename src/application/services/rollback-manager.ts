import type { ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export type RollbackOperation = {
    operation: (context: ArtemisContext) => ResultAsync<void, Error>;
    description: string;
};

export function createRollbackStack(): RollbackOperation[] {
    return [];
}
