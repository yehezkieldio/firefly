import { InvalidOptionArgumentError } from "commander";
import type { BumpStrategy, OptionalBumpStrategy, OptionalReleaseType } from "#/types";

export function createErrorFromUnknown(error: unknown, errorMessage: string): Error {
    if (error instanceof Error) {
        return new Error(`${errorMessage}: ${error.message}`);
    }
    return new Error(`${errorMessage}: ${error}`);
}

export const validateBumpStrategy = (strategy: string): OptionalBumpStrategy =>
    strategy === "" || ["auto", "manual"].includes(strategy as BumpStrategy)
        ? (strategy as OptionalBumpStrategy)
        : (() => {
              throw new InvalidOptionArgumentError(`Invalid bump strategy: ${strategy} (allowed: auto, manual)`);
          })();

export const validateReleaseType = (type: string): OptionalReleaseType =>
    type === "" ||
    ["major", "minor", "patch", "premajor", "preminor", "prepatch", "prerelease"].includes(type as OptionalReleaseType)
        ? (type as OptionalReleaseType)
        : (() => {
              throw new InvalidOptionArgumentError(
                  `Invalid release type: ${type} (allowed: major, minor, patch, premajor, preminor, prepatch, prerelease)`
              );
          })();
