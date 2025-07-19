import z from "zod";
import type { FireflyResult } from "#/shared/result";

export const PackageJsonSchema = z
    .object({
        name: z.string().optional(),
        version: z.string().optional(),
    })
    .catchall(z.unknown());

export type PackageJson = z.infer<typeof PackageJsonSchema>;

export interface PackageJsonPort {
    read(): Promise<FireflyResult<PackageJson>>;
    updateVersion(version: string): Promise<FireflyResult<void>>;
}
