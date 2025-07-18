import type { Release } from "#/core/domain/release.js";
import type { Repository } from "#/core/domain/repository.js";
import type { ArtemisResult } from "#/shared/result.js";

export interface ReleaseAsset {
    name: string;
    path: string;
    contentType?: string;
}

export interface CreatedRelease {
    id: string;
    url: string;
    htmlUrl: string;
    tagName: string;
    name: string;
    isDraft: boolean;
    isPrerelease: boolean;
}

export interface IHostingProvider {
    /**
     * Create a release on the hosting platform
     */
    createRelease(
        repository: Repository,
        release: Release
    ): Promise<ArtemisResult<CreatedRelease>>;

    /**
     * Update an existing release
     */
    updateRelease(
        repository: Repository,
        releaseId: string,
        release: Release
    ): Promise<ArtemisResult<CreatedRelease>>;

    /**
     * Delete a release
     */
    deleteRelease(
        repository: Repository,
        releaseId: string
    ): Promise<ArtemisResult<void>>;

    /**
     * Get release by tag name
     */
    getReleaseByTag(
        repository: Repository,
        tagName: string
    ): Promise<ArtemisResult<CreatedRelease>>;

    /**
     * Check if a release exists for a given tag
     */
    hasReleaseForTag(
        repository: Repository,
        tagName: string
    ): Promise<ArtemisResult<boolean>>;

    /**
     * Upload assets to a release
     */
    uploadAssets(
        repository: Repository,
        releaseId: string,
        assets: ReleaseAsset[]
    ): Promise<ArtemisResult<void>>;

    /**
     * Get the hosting provider name
     */
    getProviderName(): string;

    /**
     * Check if the provider is configured and authenticated
     */
    isConfigured(): Promise<ArtemisResult<boolean>>;
}
