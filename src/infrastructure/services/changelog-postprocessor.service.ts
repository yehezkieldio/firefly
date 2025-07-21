import { err, ok } from "neverthrow";
import type { CliffTomlParserService } from "#/infrastructure/services/cliff-toml-parser.service";
import type { CliffToml } from "#/shared/types/cliff-toml";
import type { FireflyResult } from "#/shared/utils/result";

export class ChangelogPostProcessor {
    constructor(private readonly cliffService: CliffTomlParserService) {}

    async process(rawChangelog: string): Promise<FireflyResult<string>> {
        const cliffConfig = await this.cliffService.parse();
        if (cliffConfig.isErr()) {
            return err(cliffConfig.error);
        }

        const config = cliffConfig.value;
        return this.extractChangesSection(rawChangelog, config);
    }

    private extractChangesSection(rawChangelog: string, config: CliffToml): FireflyResult<string> {
        const header = config.changelog?.header;
        const bodyTemplate = config.changelog?.body;

        if (!(header && bodyTemplate)) {
            return ok(rawChangelog);
        }

        const changesStartIndex = this.findChangesStartIndex(rawChangelog);
        if (changesStartIndex === -1) {
            return ok(rawChangelog);
        }

        const result = rawChangelog.slice(changesStartIndex).trimStart();
        return ok(result);
    }

    private findChangesStartIndex(changelog: string): number {
        return changelog.indexOf("###");
    }
}
