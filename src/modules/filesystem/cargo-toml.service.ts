import { join } from "node:path";
import { errAsync, okAsync } from "neverthrow";
import z from "zod";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { logger } from "#/shared/logger";
import { createFireflyError } from "#/shared/utils/error.util";
import { type FireflyAsyncResult, type FireflyResult, parseSchema } from "#/shared/utils/result.util";

export const CargoTomlSchema = z
    // Minimal structure of Cargo.toml as we only need the package.version field
    .object({
        package: z
            .object({
                name: z.string().optional(),
                version: z.string().optional(),
            })
            .catchall(z.unknown()),
    })
    .catchall(z.unknown());

export type CargoToml = z.infer<typeof CargoTomlSchema>;

export class CargoTomlService {
    private static instance: CargoTomlService | null = null;
    private static readonly VERSION_REGEX = /^(\s*version\s*=\s*)"[^"]*"(.*)$/m;
    private readonly pathToCargoToml: string;

    private constructor(pathToCargoToml: string) {
        this.pathToCargoToml = pathToCargoToml;
    }

    static getInstance(basePath: string): CargoTomlService {
        if (!CargoTomlService.instance) {
            CargoTomlService.instance = new CargoTomlService(join(basePath, "Cargo.toml"));
        }
        return CargoTomlService.instance;
    }

    async read(): Promise<FireflyResult<CargoToml>> {
        const contentResult = await FileSystemService.read(this.pathToCargoToml);
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        return this.parseAndValidateCargoToml(contentResult.value);
    }

    async updateVersion(version: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const contentResult = await FileSystemService.read(this.pathToCargoToml);
        if (contentResult.isErr()) {
            return errAsync(contentResult.error);
        }

        const updatedContent = this.replaceVersionInContent(contentResult.value, version);
        const writeResult = await FileSystemService.write(this.pathToCargoToml, updatedContent, dryRun);
        if (writeResult.isErr()) {
            return errAsync(writeResult.error);
        }

        logger.verbose(`CargoTomlService: Updated version to ${version} in ${this.pathToCargoToml}`);
        return this.verifyVersionUpdate(version, dryRun);
    }

    private parseAndValidateCargoToml(content: string): FireflyAsyncResult<CargoToml> {
        const parsedResult = Bun.TOML.parse(content);

        const validationResult = parseSchema(CargoTomlSchema, parsedResult);
        if (validationResult.isErr()) {
            return errAsync(validationResult.error);
        }

        return okAsync(validationResult.value);
    }

    private replaceVersionInContent(content: string, version: string): string {
        return content.replace(CargoTomlService.VERSION_REGEX, `$1"${version}"$2`);
    }

    private async verifyVersionUpdate(expectedVersion: string, dryRun?: boolean): Promise<FireflyAsyncResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return errAsync(readResult.error);
        }

        if (dryRun) {
            logger.verbose("CargoTomlService: Dry run mode enabled, not verifying version update.");
            return okAsync();
        }

        if (readResult.value.package.version !== expectedVersion) {
            return errAsync(
                createFireflyError({
                    code: "INVALID",
                    message: `Version verification failed. Expected version: ${expectedVersion}, but found: ${readResult.value.package.version}`,
                    source: "filesystem/cargo-toml-service",
                }),
            );
        }

        return okAsync();
    }
}
