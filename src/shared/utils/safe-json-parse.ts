import { Result } from "neverthrow";
import { FireflyError } from "#/shared/utils/error";

const toJsonParseError = (e: unknown) => new FireflyError("Failed to parse JSON", "JSON_PARSE_ERROR", e as Error);

export const safeJsonParse = Result.fromThrowable(JSON.parse, toJsonParseError);
