import z from "zod";
import type { FireflyAsyncResult } from "#/core/result/result.types";

export const PackageJsonSchema = z
    // Minimal structure of package.json as we don't need the full schema
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

/**
 * Options for updating the version in package.json.
 */
export interface UpdateVersionOptions {
    /**
     * When true, the operation is simulated without making actual changes.
     */
    readonly dryRun?: boolean;
}

/**
 * Service for package.json operations.
 */
export interface IPackageJsonService {
    /**
     * Reads the contents of a package.json file and parses it.
     *
     * @param path - Path relative to the service's base path, or absolute
     * @returns Parsed package.json contents, or error if not found
     */
    read(path: string): FireflyAsyncResult<PackageJson>;

    /**
     * Updates the version in a package.json file.
     *
     * @param path - Path relative to the service's base path, or absolute
     * @param newVersion - New version string to set
     */
    updateVersion(path: string, newVersion: string): FireflyAsyncResult<void>;
}
