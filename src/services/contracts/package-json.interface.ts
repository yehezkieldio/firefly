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
 *
 * @example
 * ```typescript
 * // In a task, access via context
 * const { packageJson } = ctx.services;
 *
 * // Read from workspace root
 * const pkg = await packageJson.read("package.json");
 *
 * // Read from a subdirectory
 * const subPkg = await packageJson.read("packages/core/package.json");
 *
 * // Update version
 * await packageJson.updateVersion("package.json", "2.0.0");
 * ```
 */
export interface IPackageJsonService {
    /**
     * Reads the contents of a package.json file and parses it.
     *
     * @param path - Path relative to the workspace root, or absolute
     * @returns Parsed package.json contents, or error if not found
     */
    read(path: string): FireflyAsyncResult<PackageJson>;

    /**
     * Updates the version in a package.json file.
     *
     * @param path - Path relative to the workspace root, or absolute
     * @param newVersion - New version string to set
     */
    updateVersion(path: string, newVersion: string): FireflyAsyncResult<void>;
}
