import { okAsync, ResultAsync } from "neverthrow";
import type { ArtemisContext } from "#/application/context";

export class ReleaseOrchestrator {
    run(initialContext: ArtemisContext): ResultAsync<void, Error> {
        return okAsync(undefined);
    }
}
