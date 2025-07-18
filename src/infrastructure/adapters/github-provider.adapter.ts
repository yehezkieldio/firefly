import { consola } from "consola";
import type { Release } from "#/core/domain/release.js";
import type { Repository } from "#/core/domain/repository.js";
import type {
    CreatedRelease,
    IHostingProvider,
    ReleaseAsset,
} from "#/core/ports/hosting.port.js";
import type { ArtemisResult } from "#/shared/result.js";
import { err, HostingError, ok } from "#/shared/result.js";

// Declare Bun global for TypeScript
declare const Bun: {
    spawn: (
        args: string[],
        options?: {
            cwd?: string;
            stdout?: string;
            stderr?: string;
            env?: Record<string, string>;
        }
    ) => {
        stdout: ReadableStream;
        stderr: ReadableStream;
        exited: Promise<void>;
        exitCode: number | null;
    };
};

export class GitHubProviderAdapter implements IHostingProvider {
    private readonly token?: string;
    private readonly basePath: string;

    constructor(token?: string, basePath: string = process.cwd()) {
        this.token = token;
        this.basePath = basePath;
    }

    async createRelease(
        repository: Repository,
        release: Release
    ): Promise<ArtemisResult<CreatedRelease>> {
        try {
            consola.info(
                `Creating GitHub release for ${repository.toString()}`
            );

            const args = [
                "release",
                "create",
                release.getFormattedTagName(),
                "--title",
                release.getFormattedTitle(),
                "--notes",
                release.getReleaseNotes(),
                "--repo",
                repository.toString(),
            ];

            if (release.isDraft) {
                args.push("--draft");
            }

            if (release.isPrerelease) {
                args.push("--prerelease");
            }

            if (!release.isLatest) {
                args.push("--latest=false");
            }

            const result = await this.runGhCommand(args);
            if (result.isErr()) {
                return err(result.error);
            }

            // Parse the output to get release information
            const releaseUrl = result.value.trim();

            return ok({
                id: release.getFormattedTagName(),
                url: releaseUrl,
                htmlUrl: releaseUrl,
                tagName: release.getFormattedTagName(),
                name: release.getFormattedTitle(),
                isDraft: release.isDraft,
                isPrerelease: release.isPrerelease,
            });
        } catch (error) {
            consola.error("Failed to create GitHub release:", error);
            return err(
                new HostingError(
                    "Failed to create GitHub release",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async updateRelease(
        repository: Repository,
        releaseId: string,
        release: Release
    ): Promise<ArtemisResult<CreatedRelease>> {
        try {
            consola.info(
                `Updating GitHub release ${releaseId} for ${repository.toString()}`
            );

            const args = [
                "release",
                "edit",
                releaseId,
                "--title",
                release.getFormattedTitle(),
                "--notes",
                release.getReleaseNotes(),
                "--repo",
                repository.toString(),
            ];

            if (release.isDraft) {
                args.push("--draft");
            } else {
                args.push("--draft=false");
            }

            if (release.isPrerelease) {
                args.push("--prerelease");
            } else {
                args.push("--prerelease=false");
            }

            const result = await this.runGhCommand(args);
            if (result.isErr()) {
                return err(result.error);
            }

            return ok({
                id: releaseId,
                url: result.value.trim(),
                htmlUrl: result.value.trim(),
                tagName: releaseId,
                name: release.getFormattedTitle(),
                isDraft: release.isDraft,
                isPrerelease: release.isPrerelease,
            });
        } catch (error) {
            consola.error("Failed to update GitHub release:", error);
            return err(
                new HostingError(
                    "Failed to update GitHub release",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async deleteRelease(
        repository: Repository,
        releaseId: string
    ): Promise<ArtemisResult<void>> {
        try {
            consola.info(
                `Deleting GitHub release ${releaseId} for ${repository.toString()}`
            );

            const result = await this.runGhCommand([
                "release",
                "delete",
                releaseId,
                "--repo",
                repository.toString(),
                "--yes",
            ]);

            if (result.isErr()) {
                return err(result.error);
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to delete GitHub release:", error);
            return err(
                new HostingError(
                    "Failed to delete GitHub release",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async getReleaseByTag(
        repository: Repository,
        tagName: string
    ): Promise<ArtemisResult<CreatedRelease>> {
        try {
            const result = await this.runGhCommand([
                "release",
                "view",
                tagName,
                "--repo",
                repository.toString(),
                "--json",
                "id,name,tagName,isDraft,isPrerelease,url,htmlUrl",
            ]);

            if (result.isErr()) {
                return err(result.error);
            }

            const releaseData = JSON.parse(result.value);
            return ok({
                id: releaseData.id,
                url: releaseData.url,
                htmlUrl: releaseData.htmlUrl,
                tagName: releaseData.tagName,
                name: releaseData.name,
                isDraft: releaseData.isDraft,
                isPrerelease: releaseData.isPrerelease,
            });
        } catch (error) {
            consola.error("Failed to get GitHub release:", error);
            return err(
                new HostingError(
                    "Failed to get GitHub release",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async hasReleaseForTag(
        repository: Repository,
        tagName: string
    ): Promise<ArtemisResult<boolean>> {
        try {
            const result = await this.getReleaseByTag(repository, tagName);
            return ok(result.isOk());
        } catch (error) {
            consola.error("Failed to check if GitHub release exists:", error);
            return err(
                new HostingError(
                    "Failed to check if GitHub release exists",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    async uploadAssets(
        repository: Repository,
        releaseId: string,
        assets: ReleaseAsset[]
    ): Promise<ArtemisResult<void>> {
        try {
            consola.info(
                `Uploading ${assets.length} assets to GitHub release ${releaseId}`
            );

            for (const asset of assets) {
                const result = await this.runGhCommand([
                    "release",
                    "upload",
                    releaseId,
                    asset.path,
                    "--repo",
                    repository.toString(),
                ]);

                if (result.isErr()) {
                    return err(result.error);
                }
            }

            return ok(undefined);
        } catch (error) {
            consola.error("Failed to upload assets to GitHub release:", error);
            return err(
                new HostingError(
                    "Failed to upload assets to GitHub release",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    getProviderName(): string {
        return "GitHub";
    }

    async isConfigured(): Promise<ArtemisResult<boolean>> {
        try {
            // Check if gh CLI is available and authenticated
            const result = await this.runGhCommand(["auth", "status"]);
            return ok(result.isOk());
        } catch (error) {
            consola.error("Failed to check GitHub configuration:", error);
            return err(
                new HostingError(
                    "Failed to check GitHub configuration",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }

    private async runGhCommand(args: string[]): Promise<ArtemisResult<string>> {
        try {
            const env: Record<string, string> = {};

            // Copy existing environment variables
            for (const [key, value] of Object.entries(process.env)) {
                if (value !== undefined) {
                    env[key] = value;
                }
            }

            // Add GitHub token if provided
            if (this.token) {
                env.GITHUB_TOKEN = this.token;
            }

            const proc = Bun.spawn(["gh", ...args], {
                cwd: this.basePath,
                stdout: "pipe",
                stderr: "pipe",
                env,
            });

            const output = await new Response(proc.stdout).text();
            const error = await new Response(proc.stderr).text();

            await proc.exited;

            if (proc.exitCode !== 0) {
                return err(
                    new HostingError(
                        `GitHub CLI command failed: ${error || "Unknown error"}`
                    )
                );
            }

            return ok(output);
        } catch (error) {
            consola.error("Failed to run GitHub CLI command:", error);
            return err(
                new HostingError(
                    "Failed to run GitHub CLI command",
                    error instanceof Error ? error : undefined
                )
            );
        }
    }
}
