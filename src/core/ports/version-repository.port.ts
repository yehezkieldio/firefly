import type { Version } from "#/core/domain/version";
import type { FireflyResult } from "#/shared/utils/result";

export interface VersionRepositoryPort {
    getCurrentVersion(): Promise<FireflyResult<Version>>;
    setVersion(version: Version): Promise<FireflyResult<void>>;
    hasVersionFile(): Promise<boolean>;
}
