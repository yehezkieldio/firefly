import { Result } from "neverthrow";
import { toFireflyError } from "#/core/result/error.factories";
import { FireflyOkAsync, validationErr, validationErrAsync } from "#/core/result/result.constructors";
import type { FireflyAsyncResult, FireflyResult } from "#/core/result/result.types";
import { parseSchema } from "#/core/result/schema.utilities";
import { logger } from "#/infrastructure/logging";
import type { IFileSystemService } from "#/services/contracts/filesystem.interface";
import {
    type IPackageJsonService,
    type PackageJson,
    PackageJsonSchema,
} from "#/services/contracts/package-json.interface";

export class DefaultPackageJsonService implements IPackageJsonService {
    private readonly fs: IFileSystemService;
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    constructor(fileSystemService: IFileSystemService) {
        this.fs = fileSystemService;
    }

    read(path: string): FireflyAsyncResult<PackageJson> {
        return this.fs.read(path).andThen((content) => {
            const jsonParseResult = this.parseJsonString(content, path);

            if (jsonParseResult.isErr()) {
                return validationErrAsync(jsonParseResult.error);
            }

            return parseSchema(PackageJsonSchema, jsonParseResult.value);
        });
    }

    updateVersion(path: string, newVersion: string): FireflyAsyncResult<void> {
        return this.fs
            .read(path)
            .map((content) => this.replaceVersionInContent(content, newVersion))
            .andThen((updatedContent) => this.fs.write(path, updatedContent))
            .andThen(() =>
                this.read(path).andThen((pkg) => {
                    if (pkg.version !== newVersion) {
                        return validationErrAsync<void>({
                            message: `Failed to verify updated version in package.json at path: ${path}`,
                        });
                    }
                    return FireflyOkAsync(undefined);
                })
            )
            .andTee(() =>
                logger.verbose(
                    `DefaultPackageJsonService: Updated version in package.json at path: ${path} to ${newVersion}`
                )
            );
    }

    /**
     * Replaces the version string in the package.json content.
     * We use a regex to avoid parsing the entire JSON structure, as it may conflict with end-user formatting.
     * This way, we only change the version line, preserving all other formatting.
     *
     * @param content - Original package.json content
     * @param version - New version string to set
     * @returns Updated package.json content
     */
    private replaceVersionInContent(content: string, version: string): string {
        return content.replace(DefaultPackageJsonService.VERSION_REGEX, `$1"${version}"$2`);
    }

    /**
     * Parses a JSON string into an unknown value.
     *
     * @param content - JSON string to parse
     * @param path - Path of the file being parsed (for error reporting)
     * @returns Parsed JSON value or validation error
     */
    private parseJsonString(content: string, path: string): FireflyResult<unknown> {
        const jsonParse = Result.fromThrowable(JSON.parse, toFireflyError);
        const parsed = jsonParse(content);

        if (parsed.isErr()) {
            return validationErr({
                message: `Failed to parse JSON from file at path: ${path}`,
                source: parsed.error.source,
            });
        }

        return parsed;
    }
}

/**
 * Creates a package.json service instance.
 * @param fileSystemService - File system service for file operations
 */
export function createPackageJsonService(fileSystemService: IFileSystemService): IPackageJsonService {
    return new DefaultPackageJsonService(fileSystemService);
}
