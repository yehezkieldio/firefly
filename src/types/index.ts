import type { ReleaseType } from "semver";

export type EmptyOr<T> = T | "";

export type BumpStrategy = "auto" | "manual";

export type OptionalBumpStrategy = EmptyOr<BumpStrategy>;
export type OptionalReleaseType = EmptyOr<ReleaseType>;

export type PreReleaseBase = "0" | "1";
