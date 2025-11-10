import { ResultAsync } from "neverthrow";
import { FileSystemService } from "../filesystem/filesystem-service";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";
import type { CommitType } from "../conventional-commit/conventional-commit-service";

/**
 * Cliff.toml commit parser configuration.
 */
export interface CliffCommitParser {
    message?: string;
    body?: string;
    group?: string;
    default_scope?: string;
    scope?: string;
    skip?: boolean;
}

/**
 * Cliff.toml git configuration.
 */
export interface CliffGitConfig {
    conventional_commits?: boolean;
    filter_unconventional?: boolean;
    split_commits?: boolean;
    commit_preprocessors?: Array<{ pattern: string; replace?: string }>;
    commit_parsers?: CliffCommitParser[];
    protect_breaking_commits?: boolean;
    filter_commits?: boolean;
    tag_pattern?: string;
    skip_tags?: string;
    ignore_tags?: string;
    topo_order?: boolean;
    sort_commits?: string;
}

/**
 * Parsed cliff.toml configuration.
 */
export interface CliffConfig {
    git?: CliffGitConfig;
    [key: string]: any;
}

/**
 * Cliff config service for parsing cliff.toml.
 * Used by release and commit commands.
 */
export class CliffConfigService {
    private readonly fs: FileSystemService;

    constructor(fs?: FileSystemService) {
        this.fs = fs || new FileSystemService();
    }

    /**
     * Load cliff.toml configuration.
     */
    load(path: string = "cliff.toml"): FireflyAsyncResult<CliffConfig> {
        return this.fs.readToml<CliffConfig>(path);
    }

    /**
     * Extract commit types from cliff.toml.
     */
    extractCommitTypes(config: CliffConfig): CommitType[] {
        const types: CommitType[] = [];

        if (!config.git?.commit_parsers) {
            return types;
        }

        const seen = new Set<string>();

        for (const parser of config.git.commit_parsers) {
            // Extract type from message pattern
            // Pattern typically looks like: "^feat.*" or "^fix\\(.*\\).*"
            if (parser.message) {
                const match = parser.message.match(/^\^?(\w+)/);
                if (match && match[1] && !seen.has(match[1])) {
                    const type = match[1];
                    seen.add(type);

                    types.push({
                        type,
                        description: parser.group || this.getDefaultDescription(type),
                    });
                }
            }
        }

        return types;
    }

    /**
     * Get default description for commit type.
     */
    private getDefaultDescription(type: string): string {
        const descriptions: Record<string, string> = {
            feat: "A new feature",
            fix: "A bug fix",
            docs: "Documentation changes",
            style: "Code style changes",
            refactor: "Code refactoring",
            perf: "Performance improvements",
            test: "Adding or updating tests",
            build: "Build system changes",
            ci: "CI/CD changes",
            chore: "Other changes",
            revert: "Revert a previous commit",
        };

        return descriptions[type] || "Changes";
    }

    /**
     * Check if cliff.toml exists.
     */
    exists(path: string = "cliff.toml"): FireflyAsyncResult<boolean> {
        return this.fs.fileExists(path);
    }

    /**
     * Find cliff.toml in current or parent directories.
     */
    find(): FireflyAsyncResult<string | null> {
        return this.fs.findFileUpwards("cliff.toml");
    }

    /**
     * Load cliff config, looking in multiple locations.
     */
    loadOrDefault(paths: string[] = ["cliff.toml", ".cliff.toml"]): FireflyAsyncResult<CliffConfig | null> {
        const tryLoad = async (index: number): Promise<CliffConfig | null> => {
            if (index >= paths.length) {
                return null;
            }

            const result = await this.load(paths[index]);

            if (result.isOk()) {
                return result.value;
            }

            return tryLoad(index + 1);
        };

        return ResultAsync.fromPromise(
            tryLoad(0),
            (error: any) => error,
        );
    }
}
