import { Result } from "neverthrow";
import { createFireflyError, toFireflyError } from "#/shared/utils/error.util";

const toJsonParseError = (e: unknown) => createFireflyError(toFireflyError(e));

export const jsonParse = Result.fromThrowable(JSON.parse, toJsonParseError);
