import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { jsonParse } from "#/shared/utils/json-parse.util";
import { type FireflyAsyncResult, parseSchema } from "#/shared/utils/result.util";

export const PackageJsonSchema = z
    // Minimal structure of package.json as we don't need the full schema
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export class PackageJsonService {
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;
    private readonly pathToPackageJson;

    constructor(pathToPackageJson: string) {
        this.pathToPackageJson = pathToPackageJson;
    }

    async read(): Promise<FireflyAsyncResult<PackageJson>> {
        const contentResult = await FileSystemService.read(this.pathToPackageJson);
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        return this.parseAndValidatePackageJson(contentResult.value);
    }

    async updateVersion(version: string, dryRun?: boolean): Promise<FireflyAsyncResult<void>> {
        const contentResult = await FileSystemService.read(this.pathToPackageJson);
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        const updatedContent = this.replaceVersionInContent(contentResult.value, version);
        const writeResult = await FileSystemService.write(this.pathToPackageJson, updatedContent, dryRun);
        if (writeResult.isErr()) {
            return errAsync(writeResult.error);
        }

        logger.verbose(`PackageJsonService: Updated version to ${version} in ${this.pathToPackageJson}`);
        return this.verifyVersionUpdate(version, dryRun);
    }

    private parseAndValidatePackageJson(content: string): FireflyAsyncResult<PackageJson> {
        const parseResult = jsonParse(content);
        if (parseResult.isErr()) {
            return errAsync(parseResult.error);
        }

        const validationResult = parseSchema(PackageJsonSchema, parseResult.value);
        if (validationResult.isErr()) {
            return errAsync(validationResult.error);
        }

        return okAsync(validationResult.value);
    }

    private replaceVersionInContent(content: string, version: string): string {
        return content.replace(PackageJsonService.VERSION_REGEX, `$1"${version}"$2`);
    }

    private async verifyVersionUpdate(expectedVersion: string, dryRun?: boolean): Promise<FireflyAsyncResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return errAsync(readResult.error);
        }

        if (dryRun) {
            logger.verbose("PackageJsonService: Dry run mode enabled, not verifying version update.");
            return okAsync();
        }

        if (readResult.value.version !== expectedVersion) {
            return errAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Version verification failed. Expected version: ${expectedVersion}, but found: ${readResult.value.version}`,
                    source: "filesystem/package-json-service",
                }),
            );
        }

        return okAsync();
    }
}
