import { err, ok, ResultAsync } from "neverthrow";
import { type PackageJson, type PackageJsonPort, PackageJsonSchema } from "#/core/ports/package-json.port";
import { ConfigurationError, ParsingError } from "#/shared/error";
import type { FireflyResult } from "#/shared/result";
import { safeJsonParse } from "#/shared/utils/safe-json-parse";

export class BunPackageJsonService implements PackageJsonPort {
    private readonly isSupported: boolean;

    constructor() {
        const versionParts = Bun.version.split(".").map(Number);
        const [major = 0, minor = 0, patch = 0] = versionParts;

        const isValidVersion = versionParts.length === 3 && !versionParts.some(Number.isNaN);

        if (!isValidVersion) {
            throw new ConfigurationError(`Invalid Bun version format: ${Bun.version}`);
        }

        this.isSupported =
            major > 1 || (major === 1 && minor > 2) || (major === 1 && minor === 2 && patch >= 19);

        if (!this.isSupported) {
            throw new ConfigurationError(`Bun v1.2.19+ is required for 'bun pm pkg'. Found: ${Bun.version}`);
        }
    }

    private exec(args: string[]) {
        const command = Bun.spawn(["bun", "pm", "pkg", ...args], {
            stdout: "pipe",
            stderr: "pipe",
        }).stdout;

        return ResultAsync.fromPromise(
            new Response(command).text(),
            (e) => new ParsingError("Failed to execute bun pm pkg command", e as Error)
        );
    }

    async read(): Promise<FireflyResult<PackageJson>> {
        const readable = await this.exec(["get"]);

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
        const result = await this.exec(["set", `version=${version}`]);
        if (result.isErr()) {
            return err(result.error);
        }

        // Verify the version was updated correctly
        const readResult = await this.read();
        if (readResult.isErr()) {
            return err(readResult.error);
        }

        if (readResult.value.version !== version) {
            return err(new ConfigurationError(`Failed to update version to ${version}`));
        }

        return ok(undefined);
    }
}
