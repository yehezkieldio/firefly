import type { Result, ResultAsync } from "neverthrow";
import type { FireflyError } from "#/shared/utils/error.util";

export type FireflyResult<T> = Result<T, FireflyError>;
export type AsyncFireflyResult<T> = ResultAsync<T, FireflyError>;
