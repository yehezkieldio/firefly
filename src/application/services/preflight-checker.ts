import { okAsync, ResultAsync } from "neverthrow";

export function preflightPipeline(): ResultAsync<void, Error> {
    return okAsync(undefined);
}
