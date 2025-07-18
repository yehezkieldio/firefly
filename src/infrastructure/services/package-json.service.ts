import { err, ok } from "neverthrow";
import { z } from "zod";
import { ConfigurationError, type FireflyResult } from "#/shared/result";
import { safeJsonParse } from "#/shared/utils/safe-json-parse";
import type { FileSystemService } from "./file-system.service";

export const PackageJsonSchema = z
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export class PackageJsonService {
    private static readonly VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

    constructor(private readonly fs: FileSystemService) {}

    async read(): Promise<FireflyResult<PackageJson>> {
        const readable = await this.fs.read();

        if (readable.isErr()) {
            return readable.map(() => ({}) as PackageJson);
        }

        return readable.andThen(safeJsonParse).andThen((parsed) => {
            const result = PackageJsonSchema.safeParse(parsed);
            if (!result.success) {
                return err(new ConfigurationError("package.json validation failed", result.error));
            }

            return ok(result.data);
        });
    }

    async updateVersion(version: string): Promise<FireflyResult<void>> {
        const result = await this.fs.read();
        if (result.isErr()) {
            return err(result.error);
        }

        const content = result.value;
        const updatedContent = content.replace(PackageJsonService.VERSION_REGEX, `$1"${version}"$2`);

        const writeable = await this.fs.write(updatedContent);
        if (writeable.isErr()) {
            return err(writeable.error);
        }

        return writeable.map(() => undefined);
    }
}
