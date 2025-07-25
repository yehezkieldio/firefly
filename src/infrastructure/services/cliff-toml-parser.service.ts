import { err, ok } from "neverthrow";
import { parse, type TomlValue } from "smol-toml";
import type { FileSystemService } from "#/infrastructure/services/file-system.service";
import type { CliffToml } from "#/shared/types/cliff-toml.type";
import { ConfigurationError } from "#/shared/utils/error.util";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class CliffTomlParserService {
    constructor(private readonly fileSystem: FileSystemService) {}

    async parse(): Promise<FireflyResult<CliffToml>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        logger.verbose("CliffTomlParserService: TOML file content successfully read, parsing...");
        return this.parseContent(contentResult.value);
    }

    private parseContent(content: string): FireflyResult<CliffToml> {
        const parsedResult = parse(content);
        if (!CliffTomlParserService.isCliffToml(parsedResult)) {
            return err(new ConfigurationError("Parsed TOML is not a valid CliffToml"));
        }

        logger.verbose("CliffTomlParserService: TOML parsed and validated as CliffToml");
        return ok(parsedResult);
    }

    static isCliffToml(value: TomlValue | unknown): value is CliffToml {
        return CliffTomlParserService.isObject(value);
    }

    private static isObject<T extends new (...args: unknown[]) => unknown = ObjectConstructor>(
        input: unknown,
        constructorType?: T
    ): input is object {
        return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
    }
}
