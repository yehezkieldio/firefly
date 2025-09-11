import type { FireflyConfig } from "#/platform/config";

export interface TemplateContext {
    version?: string;
    config: FireflyConfig;
}

export interface ResolvedTemplates {
    commitMessage: (message: string) => string;
    tagName: (tag: string) => string;
    releaseTitle: (title: string) => string;
}

export class ReleaseTemplateResolverService {
    private static readonly TEMPLATE_PATTERNS = {
        VERSION: /\{\{version\}\}/g,
        NAME: /\{\{name\}\}/g,
    } as const;

    withContext(ctx: TemplateContext): ResolvedTemplates {
        const variables = {
            version: ctx.version,
            name: this.getFullPackageName(ctx.config),
        };

        return {
            commitMessage: (message: string) => this.resolveTemplate(message, variables),
            tagName: (tag: string) => this.resolveTemplate(tag, variables),
            releaseTitle: (title: string) => this.resolveTemplate(title, variables),
        };
    }

    getFullPackageName(config: Partial<FireflyConfig>): string {
        if (!config.name) return "";
        return config.scope ? `@${config.scope}/${config.name}` : config.name;
    }

    private resolveTemplate(template: string, variables: { version?: string; name: string }): string {
        if (!template?.trim()) return template;

        let resolved = template;
        if (variables.version) {
            resolved = resolved.replace(ReleaseTemplateResolverService.TEMPLATE_PATTERNS.VERSION, variables.version);
        }
        resolved = resolved.replace(ReleaseTemplateResolverService.TEMPLATE_PATTERNS.NAME, variables.name);
        return resolved;
    }
}
