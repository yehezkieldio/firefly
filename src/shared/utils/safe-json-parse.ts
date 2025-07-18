import { Result } from "neverthrow";
import { ParseError } from "#/shared/result";

const toParseError = (e: unknown) => new ParseError("Failed to parse JSON", e as Error);

export const safeJsonParse = Result.fromThrowable(JSON.parse, toParseError);
