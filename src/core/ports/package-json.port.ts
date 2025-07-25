import z from "zod";
import type { AsyncFireflyResult } from "#/shared/utils/result.util";

export const PackageJsonSchema = z
    // Minimal structure of package.json as we don't need the full schema
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export interface PackageJsonPort {
    read(): Promise<AsyncFireflyResult<PackageJson>>;
    updateVersion(version: string, dryRun?: boolean): Promise<AsyncFireflyResult<void>>;
}
