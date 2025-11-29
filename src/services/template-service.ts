/**
 * Template Service Module
 *
 * Provides template resolution for release-related strings like
 * commit messages, tag names, and release titles.
 *
 * Supported placeholders:
 * - {{version}} - The release version
 * - {{name}} - Full package name (with scope if present)
 * - {{unscopedName}} - Package name without scope
 *
 * @module services/template-service
 */

import type { FireflyResult } from "#/utils/result";
import { FireflyOk } from "#/utils/result";

// ============================================================================
// Types
// ============================================================================

/**
 * Context for template resolution.
 */
export interface TemplateContext {
    /** The release version (e.g., "1.2.3") */
    readonly version?: string;
    /** Package name without scope */
    readonly name?: string;
    /** Package scope without '@' prefix */
    readonly scope?: string;
}

/**
 * Resolved template functions.
 */
export interface ResolvedTemplates {
    /** Resolves a commit message template */
    readonly commitMessage: (template: string) => string;
    /** Resolves a tag name template */
    readonly tagName: (template: string) => string;
    /** Resolves a release title template */
    readonly releaseTitle: (template: string) => string;
}

// ============================================================================
// Template Resolution
// ============================================================================

/** Template placeholder patterns */
const TEMPLATE_PATTERNS = {
    VERSION: /\{\{version\}\}/g,
    NAME: /\{\{name\}\}/g,
    UNSCOPED_NAME: /\{\{unscopedName\}\}/g,
} as const;

/**
 * Computes the full package name from name and scope.
 * @param name - Package name without scope
 * @param scope - Optional scope without '@' prefix
 * @returns Full package name (e.g., "@scope/name" or "name")
 */
function getFullPackageName(name?: string, scope?: string): string {
    if (!name) return "";
    return scope ? `@${scope}/${name}` : name;
}

/**
 * Resolves a template string by replacing placeholders with values.
 * @param template - Template string with placeholders
 * @param variables - Values to substitute
 * @returns Resolved string
 */
function resolveTemplate(
    template: string,
    variables: {
        readonly version?: string;
        readonly name: string;
        readonly unscopedName: string;
    }
): string {
    if (!template?.trim()) return template;

    let resolved = template;

    if (variables.version) {
        resolved = resolved.replace(TEMPLATE_PATTERNS.VERSION, variables.version);
    }
    resolved = resolved.replace(TEMPLATE_PATTERNS.NAME, variables.name);
    resolved = resolved.replace(TEMPLATE_PATTERNS.UNSCOPED_NAME, variables.unscopedName);

    return resolved;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates template resolver functions from the given context.
 *
 * @param ctx - Template context with version and package info
 * @returns Object with template resolver functions
 *
 * @example
 * ```typescript
 * const templates = createTemplateResolver({
 *   version: "1.2.3",
 *   name: "my-package",
 *   scope: "org",
 * });
 *
 * templates.tagName("{{name}}@{{version}}");
 * // Returns: "@org/my-package@1.2.3"
 * ```
 */
export function createTemplateResolver(ctx: TemplateContext): FireflyResult<ResolvedTemplates> {
    const variables = {
        version: ctx.version,
        name: getFullPackageName(ctx.name, ctx.scope),
        unscopedName: ctx.name ?? "",
    };

    const resolver = (template: string): string => resolveTemplate(template, variables);

    return FireflyOk({
        commitMessage: resolver,
        tagName: resolver,
        releaseTitle: resolver,
    });
}

/**
 * Resolves a single template string with the given context.
 *
 * @param template - Template string with placeholders
 * @param ctx - Template context with version and package info
 * @returns Resolved string
 *
 * @example
 * ```typescript
 * const tagName = resolveTemplateString(
 *   "{{name}}@{{version}}",
 *   { version: "1.0.0", name: "app" }
 * );
 * // Returns: "app@1.0.0"
 * ```
 */
export function resolveTemplateString(template: string, ctx: TemplateContext): string {
    const variables = {
        version: ctx.version,
        name: getFullPackageName(ctx.name, ctx.scope),
        unscopedName: ctx.name ?? "",
    };

    return resolveTemplate(template, variables);
}
