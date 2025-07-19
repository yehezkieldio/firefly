import { Result } from "neverthrow";
import { ParsingError } from "#/shared/error";

const toParsingError = (e: unknown) => new ParsingError("Failed to parse JSON", e as Error);

export const safeJsonParse = Result.fromThrowable(JSON.parse, toParsingError);
