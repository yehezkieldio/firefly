import type { Result } from "neverthrow";
import type { FireflyError } from "#/shared/error";

export type FireflyResult<T> = Result<T, FireflyError>;
