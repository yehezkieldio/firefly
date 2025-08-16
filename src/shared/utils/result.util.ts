import { type Result, type ResultAsync, err, errAsync, ok, okAsync } from "neverthrow";
import type { FireflyError } from "#/shared/utils/error.util";

export type FireflyResult<T> = Result<T, FireflyError>;
export type FireflyAsyncResult<T> = ResultAsync<T, FireflyError>;

export const fireflyOk = <T = void>(value?: T): FireflyResult<T> => ok(value as T);
export const fireflyErr = (error: FireflyError): FireflyResult<never> => err(error);

export const fireflyOkAsync = <T = void>(value?: T): FireflyAsyncResult<T> => okAsync(value as T);
export const fireflyErrAsync = (error: FireflyError): FireflyAsyncResult<never> => errAsync(error);
