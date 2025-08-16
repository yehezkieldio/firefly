import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { type PackageJson, type PackageJsonPort, PackageJsonSchema } from "#/core/ports/package-json.port";
import { ConfigurationError, ProcessExecutionError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { AsyncFireflyResult, FireflyResult } from "#/shared/utils/result.util";
import { safeJsonParse } from "#/shared/utils/safe-json-parse.util";

export class BunPackageJsonAdapter implements PackageJsonPort {
    private constructor() {}

    static create(): FireflyResult<BunPackageJsonAdapter> {
        const versionResult = BunPackageJsonAdapter.validateBunVersion();
        if (versionResult.isErr()) {
            return err(versionResult.error);
        }

        return ok(new BunPackageJsonAdapter());
    }

    private static validateBunVersion(): FireflyResult<void> {
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

    async read(): Promise<AsyncFireflyResult<PackageJson>> {
        const readResult = await this.exec(["get"]);
        if (readResult.isErr()) {
            return err(readResult.error);
        }

        return this.parseAndValidatePackageJson(readResult.value);
    }

    async updateVersion(version: string, dryRun?: boolean): Promise<AsyncFireflyResult<void>> {
        const result = await this.exec(["set", `version=${version}`], dryRun);
        if (result.isErr()) {
            return err(result.error);
        }

        return this.verifyVersionUpdate(version, dryRun);
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

    private async verifyVersionUpdate(expectedVersion: string, dryRun?: boolean): Promise<FireflyResult<void>> {
        const readResult = await this.read();
        if (readResult.isErr()) {
            return err(readResult.error);
        }

        if (dryRun) {
            logger.verbose("BunPackageJsonAdapter: Dry run mode enabled, not verifying version update.");
            return ok(undefined);
        }

        if (readResult.value.version !== expectedVersion) {
            return err(new ConfigurationError(`Failed to update version to ${expectedVersion}`));
        }

        return ok(undefined);
    }

    private exec(args: string[], dryRun?: boolean): AsyncFireflyResult<string> {
        if (dryRun && args.includes("set")) {
            logger.verbose(
                `BunPackageJsonAdapter: Dry run enabled, skipping command execution: bun pm pkg ${args.join(" ")}`,
            );
            return okAsync("");
        }

        const command = Bun.spawn(["bun", "pm", "pkg", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new ProcessExecutionError("Failed to execute bun pm pkg command", e as Error),
        ).andTee(() => logger.verbose("BunPackageJsonAdapter: Executed command:", `bun pm pkg ${args.join(" ")}`));
    }
}
