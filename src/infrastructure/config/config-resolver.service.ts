import type { FireflyConfig } from "#/infrastructure/config/schema";

export interface ConfigTemplateContext {
    version?: string;
    name: string;
    unscopedName: string;
}

export class ConfigResolverService {
    private static readonly TEMPLATE_PATTERNS = {
        VERSION: /\{\{version\}\}/g,
        NAME: /\{\{name\}\}/g,
        UNSCOPED_NAME: /\{\{unscopedName\}\}/g,
    } as const;

    getFullPackageName(config: Partial<FireflyConfig>): string {
        if (!config.name) {
            return "";
        }
        return config.scope ? `@${config.scope}/${config.name}` : config.name;
    }

    resolveCommitMessage(message: string, context: ConfigTemplateContext): string {
        return this.resolveTemplate(message, context);
    }

    resolveTagName(tag: string, context: ConfigTemplateContext): string {
        return this.resolveTemplate(tag, context);
    }

    resolveReleaseTitle(title: string, context: ConfigTemplateContext): string {
        return this.resolveTemplate(title, context);
    }

    getTokenByEnvironmentVariable(): string {
        const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
        return githubToken;
    }

    private resolveTemplate(template: string, variables: ConfigTemplateContext): string {
        if (!template?.trim()) {
            return template;
        }

        let resolved = template;
        if (variables.version) {
            resolved = resolved.replace(ConfigResolverService.TEMPLATE_PATTERNS.VERSION, variables.version);
        }

        resolved = resolved.replace(ConfigResolverService.TEMPLATE_PATTERNS.NAME, variables.name);
        resolved = resolved.replace(ConfigResolverService.TEMPLATE_PATTERNS.UNSCOPED_NAME, variables.unscopedName);
        return resolved;
    }
}
