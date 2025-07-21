import { err, ok } from "neverthrow";
import { parse } from "smol-toml";
import type { FileSystemService } from "#/infrastructure/services/file-system.service";
import type { CliffToml } from "#/shared/types/cliff-toml";
import { ParsingError } from "#/shared/utils/error";
import { isCliffToml } from "#/shared/utils/is-cliff-toml";
import type { FireflyResult } from "#/shared/utils/result";

export class CliffTomlParserService {
    constructor(private readonly fileSystem: FileSystemService) {}

    async parse(): Promise<FireflyResult<CliffToml>> {
        const contentResult = await this.fileSystem.read();
        if (contentResult.isErr()) {
            return err(contentResult.error);
        }

        return this.parseTomlContent(contentResult.value);
    }

    private parseTomlContent(content: string): FireflyResult<CliffToml> {
        const parsedResult = parse(content);
        if (!isCliffToml(parsedResult)) {
            return err(new ParsingError("Parsed TOML is not a valid CliffToml"));
        }

        return ok(parsedResult);
    }
}
