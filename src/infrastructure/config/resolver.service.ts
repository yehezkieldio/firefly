import type { ApplicationContext } from "#/application/context";
import type { FireflyConfig } from "#/infrastructure/config/schema";

interface TemplateVariables {
    version?: string;
    name: string;
}

export class ConfigResolverService {
    private static readonly TEMPLATE_PATTERNS = {
        VERSION: /\{\{version\}\}/g,
        NAME: /\{\{name\}\}/g,
    } as const;

    getFullPackageName(config: Partial<FireflyConfig>): string {
        if (!config.name) {
            return "";
        }

        return config.scope ? `@${config.scope}/${config.name}` : config.name;
    }

    resolveCommitMessage(message: string, context: ApplicationContext): string {
        return this.resolveTemplate(message, this.createTemplateVariables(context));
    }

    resolveTagName(tag: string, context: ApplicationContext): string {
        return this.resolveTemplate(tag, this.createTemplateVariables(context));
    }

    resolveReleaseTitle(title: string, context: ApplicationContext): string {
        return this.resolveTemplate(title, this.createTemplateVariables(context));
    }

    getTokenByEnvironmentVariable(): string {
        const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

        return githubToken;
    }

    private createTemplateVariables(context: ApplicationContext): TemplateVariables {
        return {
            version: context.getNextVersion(),
            name: this.getFullPackageName(context.getConfig()),
        };
    }

    private resolveTemplate(template: string, variables: TemplateVariables): string {
        if (!template?.trim()) {
            return template;
        }

        let resolved = template;

        if (variables.version) {
            resolved = resolved.replace(ConfigResolverService.TEMPLATE_PATTERNS.VERSION, variables.version);
        }

        resolved = resolved.replace(ConfigResolverService.TEMPLATE_PATTERNS.NAME, variables.name);

        return resolved;
    }
}
