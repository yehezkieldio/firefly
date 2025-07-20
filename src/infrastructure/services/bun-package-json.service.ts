import { err, ok, type Result, ResultAsync } from "neverthrow";
import { type PackageJson, type PackageJsonPort, PackageJsonSchema } from "#/core/ports/package-json.port";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error";
import type { FireflyResult } from "#/shared/utils/result";
import { safeJsonParse } from "#/shared/utils/safe-json-parse";

export class BunPackageJsonService implements PackageJsonPort {
    private constructor() {}

    static create(): Result<BunPackageJsonService, ConfigurationError> {
        const versionResult = BunPackageJsonService.validateBunVersion();
        if (versionResult.isErr()) {
            return err(versionResult.error);
        }

        return ok(new BunPackageJsonService());
    }

    private static validateBunVersion(): Result<void, ConfigurationError> {
        const versionParts = Bun.version.split(".").map(Number);

        if (versionParts.length !== 3 || versionParts.some(Number.isNaN)) {
            return err(new ConfigurationError(`Invalid Bun version format: ${Bun.version}`));
        }

        const [major = 0, minor = 0, patch = 0] = versionParts;

        // Bun v1.2.19+ is required for 'bun pm pkg'
        const isSupported = major > 1 || (major === 1 && minor > 2) || (major === 1 && minor === 2 && patch >= 19);

        if (!isSupported) {
            return err(new ConfigurationError(`Bun v1.2.19+ is required for 'bun pm pkg'. Found: ${Bun.version}`));
        }

        return ok(undefined);
    }

    async read(): Promise<FireflyResult<PackageJson>> {
        const readable = await this.executeCommand(["get"]);
        if (readable.isErr()) {
            return err(readable.error);
        }

        return this.parseAndValidatePackageJson(readable.value);
    }

    async updateVersion(version: string): Promise<FireflyResult<void>> {
        const result = await this.executeCommand(["set", `version=${version}`]);
        if (result.isErr()) {
            return err(result.error);
        }

        return this.verifyVersionUpdate(version);
    }

    private parseAndValidatePackageJson(content: string): FireflyResult<PackageJson> {
        const parseResult = safeJsonParse(content);
        if (parseResult.isErr()) {
            return err(new ConfigurationError("Failed to parse package.json", parseResult.error));
        }

        const validationResult = PackageJsonSchema.safeParse(parseResult.value);
        if (!validationResult.success) {
            return err(new ConfigurationError("package.json validation failed", validationResult.error));
        }

        return ok(validationResult.data);
    }

    private async verifyVersionUpdate(expectedVersion: string): Promise<FireflyResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return err(readResult.error);
        }

        if (readResult.value.version !== expectedVersion) {
            return err(new ConfigurationError(`Failed to update version to ${expectedVersion}`));
        }

        return ok(undefined);
    }

    private executeCommand(args: string[]): ResultAsync<string, ProcessExecutionError> {
        const command = Bun.spawn(["bun", "pm", "pkg", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new ProcessExecutionError("Failed to execute bun pm pkg command", e as Error)
        );
    }
}
