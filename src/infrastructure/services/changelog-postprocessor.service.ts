import { err, ok } from "neverthrow";
import type { CliffTomlParserService } from "#/infrastructure/services/cliff-toml-parser.service";
import type { CliffToml } from "#/shared/types/cliff-toml.type";
import { logger } from "#/shared/utils/logger.util";
import type { FireflyResult } from "#/shared/utils/result.util";

export class ChangelogPostProcessor {
    constructor(private readonly cliffTomlParseService: CliffTomlParserService) {}

    async process(rawChangelog: string): Promise<FireflyResult<string>> {
        const cliffConfig = await this.cliffTomlParseService.parse();
        if (cliffConfig.isErr()) {
            return err(cliffConfig.error);
        }

        logger.verbose("ChangelogPostProcessor: Cliff TOML config parsed successfully, processing changelog...");
        const config = cliffConfig.value;
        return this.extractChangesSection(rawChangelog, config);
    }

    private extractChangesSection(rawChangelog: string, config: CliffToml): FireflyResult<string> {
        const header = config.changelog?.header;
        const bodyTemplate = config.changelog?.body;

        if (!(header && bodyTemplate)) {
            logger.verbose(
                "ChangelogPostProcessor: No header/body template found in CliffToml, returning raw changelog."
            );
            return ok(rawChangelog);
        }

        const changesStartIndex = this.findChangesStartIndex(rawChangelog);
        if (changesStartIndex === -1) {
            logger.verbose("ChangelogPostProcessor: No changes section found, returning raw changelog.");
            return ok(rawChangelog);
        }

        const result = rawChangelog.slice(changesStartIndex).trimStart();
        logger.verbose("ChangelogPostProcessor: Extracted changes section from changelog.");
        return ok(result);
    }

    private findChangesStartIndex(changelog: string): number {
        return changelog.indexOf("###");
    }
}
