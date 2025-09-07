import { err, ok } from "neverthrow";
import z from "zod";
import type { FileSystemService } from "#/modules/filesystem/filesystem.service";
import { createFireflyError } from "#/shared/utils/error.util";
import { jsonParse } from "#/shared/utils/json-parse.util";
import { type FireflyResult, parseSchema } from "#/shared/utils/result.util";

export const PackageJsonSchema = z
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export class PackageJsonService {
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    constructor(private readonly fileSystem: FileSystemService) {}

    async read(): Promise<FireflyResult<PackageJson>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        return this.validate(contentResult.value);
    }

    private validate(content: string): FireflyResult<PackageJson> {
        const parseResult = jsonParse(content);
        if (parseResult.isErr()) {
            return err(parseResult.error);
        }

        const validationResult = parseSchema(PackageJsonSchema, parseResult.value);
        if (validationResult.isErr()) {
            return err(validationResult.error);
        }

        return ok(validationResult.value);
    }

    async updateVersion(newVersion: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const contentResult = await this.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        if (!contentResult.value.version) {
            return err(
                createFireflyError({
                    message: "No version field found in package.json",
                    code: "NOT_FOUND",
                }),
            );
        }

        const updatedVersionContent = this.replaceVersion(contentResult.value.version, newVersion);
        const writeResult = await this.fileSystem.write(updatedVersionContent, dryRun);
        if (writeResult.isErr()) {
            return err(writeResult.error);
        }

        return ok(undefined);
    }

    private replaceVersion(content: string, newVersion: string): string {
        return content.replace(PackageJsonService.VERSION_REGEX, `$1"${newVersion}"$2`);
    }
}
