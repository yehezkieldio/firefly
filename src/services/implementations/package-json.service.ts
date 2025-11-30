import { Result } from "neverthrow";
import { toFireflyError } from "#/core/result/error.factories";
import { FireflyErr, validationErr } from "#/core/result/result.constructors";
import type { FireflyResult } from "#/core/result/result.types";
import { parseSchema } from "#/core/result/schema.utilities";
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

    async read(path: string): Promise<FireflyResult<PackageJson>> {
        const contentResult = await this.fs.read(path);

        if (contentResult.isErr()) {
            return FireflyErr(contentResult.error);
        }

        const jsonParseResult = this.parseJsonString(contentResult.value, path);

        if (jsonParseResult.isErr()) {
            return FireflyErr(jsonParseResult.error);
        }

        return parseSchema(PackageJsonSchema, jsonParseResult.value);
    }

    async updateVersion(path: string, newVersion: string): Promise<FireflyResult<void>> {
        const contentResult = await this.fs.read(path);

        if (contentResult.isErr()) {
            return FireflyErr(contentResult.error);
        }

        const updatedContent = this.replaceVersionInContent(contentResult.value, newVersion);
        const writeResult = await this.fs.write(path, updatedContent);

        if (writeResult.isErr()) {
            return FireflyErr(writeResult.error);
        }

        const verifyReadResult = await this.read(path);
        if (verifyReadResult.isErr()) {
            return FireflyErr(verifyReadResult.error);
        }

        if (verifyReadResult.value.version !== newVersion) {
            return validationErr({
                message: `Failed to verify updated version in package.json at path: ${path}`,
            });
        }

        return writeResult;
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
