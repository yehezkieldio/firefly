import { join } from "node:path";
import { err, ok } from "neverthrow";
import { FileSystemService } from "#/modules/filesystem/file-system.service";
import { logger } from "#/shared/logger";
import type { CliffToml } from "#/shared/types/cliff-toml.type";
import type { TomlValue } from "#/shared/types/toml-types";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class CliffTomlService {
    private static instance: CliffTomlService | null = null;
    private readonly pathToCliffToml: string;

    private constructor(pathToCliffToml: string) {
        this.pathToCliffToml = pathToCliffToml;
    }

    static getInstance(basePath: string): CliffTomlService {
        if (!CliffTomlService.instance) {
            CliffTomlService.instance = new CliffTomlService(join(basePath, "cliff.toml"));
        }
        return CliffTomlService.instance;
    }

    async parse(): Promise<FireflyResult<CliffToml>> {
        const contentResult = await FileSystemService.read(this.pathToCliffToml);
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        logger.verbose("CliffTomlService: TOML file content successfully read, parsing...");
        return this.parseContent(contentResult.value);
    }

    private parseContent(content: string): FireflyResult<CliffToml> {
        const parsedResult = Bun.TOML.parse(content);

        if (!CliffTomlService.isCliffToml(parsedResult)) {
            return err(
                createFireflyError({
                    message: "CliffTomlService: Parsed TOML is not a valid CliffToml",
                    code: "INVALID",
                }),
            );
        }

        logger.verbose("CliffTomlService: TOML parsed and validated as CliffToml");
        return ok(parsedResult);
    }

    static isCliffToml(value: TomlValue | unknown): value is CliffToml {
        return CliffTomlService.isObject(value);
    }

    private static isObject<T extends new (...args: unknown[]) => unknown = ObjectConstructor>(
        input: unknown,
        constructorType?: T,
    ): input is object {
        return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
    }
}
