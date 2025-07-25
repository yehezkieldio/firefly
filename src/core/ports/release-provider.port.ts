import type { FireflyResult } from "#/shared/utils/result.util";

export interface CreateReleaseOptions {
    title: string;
    content: string;
    tag: string;
    latest: boolean;
    draft: boolean;
    prerelease: boolean;
    dryRun?: boolean;
}

export interface ReleaseProviderPort {
    createRelease(input: CreateReleaseOptions): Promise<FireflyResult<void>>;
}
