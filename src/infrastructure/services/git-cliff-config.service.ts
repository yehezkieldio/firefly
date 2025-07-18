import { join } from "node:path";
import { parse } from "smol-toml";
import { ChangelogError } from "#/shared/result";
import type { CliffToml } from "#/shared/types/git-cliff";
import { isCliffToml } from "#/shared/utils/git-cliff";

export class GitCliffConfigService {
    constructor(private cwd: string) {}

    private get cliffPath(): string {
        return join(this.cwd, join(process.cwd(), "cliff.toml"));
    }

    async parseCliffConfig(): Promise<CliffToml> {
        try {
            const cliffConfig = await Bun.file(this.cliffPath).text();
            const parsedConfig = parse(cliffConfig);

            if (!isCliffToml(parsedConfig)) {
                throw new ChangelogError("Invalid cliff.toml format");
            }

            return parsedConfig;
        } catch (error) {
            throw new ChangelogError(
                "Failed to parse cliff.toml",
                error instanceof Error ? error : undefined
            );
        }
    }
}
