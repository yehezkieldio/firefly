import { ok, err } from "neverthrow";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyResult } from "#/shared/utils/result.util";

/**
 * Parsed conventional commit.
 */
export interface ConventionalCommit {
    type: string;
    scope?: string;
    subject: string;
    body?: string;
    footer?: string;
    breaking: boolean;
    raw: string;
}

/**
 * Validation result for conventional commit.
 */
export interface CommitValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Commit type definition.
 */
export interface CommitType {
    type: string;
    description?: string;
    emoji?: string;
}

/**
 * Conventional commit service for parsing, validating, and formatting commits.
 * Used by all commands (release, autocommit, commit).
 */
export class ConventionalCommitService {
    // Standard conventional commit types
    private static readonly STANDARD_TYPES = [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
    ];

    /**
     * Parse a conventional commit message.
     */
    parse(message: string): FireflyResult<ConventionalCommit> {
        if (!message || message.trim().length === 0) {
            return err(createFireflyError({ message: "Commit message cannot be empty" }));
        }

        const lines = message.split("\n");
        const headerLine = lines[0];

        // Parse header: type(scope)!: subject
        const headerRegex = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/;
        const match = headerLine.match(headerRegex);

        if (!match) {
            return err(
                createFireflyError({
                    message: "Invalid conventional commit format. Expected: type(scope): subject",
                }),
            );
        }

        const [, type, scope, breakingMark, subject] = match;

        // Parse body and footer
        let body: string | undefined;
        let footer: string | undefined;
        let breaking = breakingMark === "!";

        if (lines.length > 1) {
            // Skip empty line after header
            let bodyStart = 1;
            while (bodyStart < lines.length && lines[bodyStart].trim() === "") {
                bodyStart++;
            }

            // Find footer (starts with token like "BREAKING CHANGE:")
            let footerStart = -1;
            for (let i = bodyStart; i < lines.length; i++) {
                if (lines[i].match(/^[A-Z][A-Z-\s]+:/)) {
                    footerStart = i;
                    break;
                }
            }

            if (footerStart > -1) {
                body = lines.slice(bodyStart, footerStart).join("\n").trim();
                footer = lines.slice(footerStart).join("\n").trim();

                // Check for BREAKING CHANGE in footer
                if (footer.includes("BREAKING CHANGE:")) {
                    breaking = true;
                }
            } else {
                body = lines.slice(bodyStart).join("\n").trim();
            }
        }

        return ok({
            type,
            scope,
            subject,
            body: body || undefined,
            footer: footer || undefined,
            breaking,
            raw: message,
        });
    }

    /**
     * Validate a conventional commit message.
     */
    validate(message: string, allowedTypes?: string[]): FireflyResult<CommitValidationResult> {
        const errors: string[] = [];

        const parseResult = this.parse(message);

        if (parseResult.isErr()) {
            errors.push(parseResult.error.message);
            return ok({ valid: false, errors });
        }

        const commit = parseResult.value;

        // Validate type
        const types = allowedTypes || ConventionalCommitService.STANDARD_TYPES;
        if (!types.includes(commit.type)) {
            errors.push(`Invalid commit type "${commit.type}". Allowed types: ${types.join(", ")}`);
        }

        // Validate subject
        if (!commit.subject || commit.subject.trim().length === 0) {
            errors.push("Subject cannot be empty");
        }

        if (commit.subject && commit.subject.length > 72) {
            errors.push(`Subject is too long (${commit.subject.length} > 72 characters)`);
        }

        // Validate subject doesn't end with period
        if (commit.subject && commit.subject.endsWith(".")) {
            errors.push("Subject should not end with a period");
        }

        // Validate subject starts with lowercase (convention)
        if (commit.subject && /^[A-Z]/.test(commit.subject)) {
            errors.push("Subject should start with lowercase letter");
        }

        return ok({
            valid: errors.length === 0,
            errors,
        });
    }

    /**
     * Format a conventional commit from parts.
     */
    format(parts: {
        type: string;
        scope?: string;
        subject: string;
        body?: string;
        footer?: string;
        breaking?: boolean;
    }): FireflyResult<string> {
        if (!parts.type || !parts.subject) {
            return err(createFireflyError({ message: "Type and subject are required" }));
        }

        let message = parts.type;

        if (parts.scope) {
            message += `(${parts.scope})`;
        }

        if (parts.breaking) {
            message += "!";
        }

        message += `: ${parts.subject}`;

        if (parts.body) {
            message += `\n\n${parts.body}`;
        }

        if (parts.footer) {
            message += `\n\n${parts.footer}`;
        }

        return ok(message);
    }

    /**
     * Check if commit is a breaking change.
     */
    isBreakingChange(commit: ConventionalCommit): boolean {
        return commit.breaking;
    }

    /**
     * Extract type from commit message.
     */
    extractType(message: string): string | null {
        const match = message.match(/^(\w+)(?:\([^)]+\))?(!)?: /);
        return match ? match[1] : null;
    }

    /**
     * Extract scope from commit message.
     */
    extractScope(message: string): string | null {
        const match = message.match(/^\w+\(([^)]+)\)(!)?: /);
        return match ? match[1] : null;
    }

    /**
     * Get standard commit types.
     */
    getStandardTypes(): CommitType[] {
        return [
            { type: "feat", description: "A new feature", emoji: "✨" },
            { type: "fix", description: "A bug fix", emoji: "🐛" },
            { type: "docs", description: "Documentation changes", emoji: "📚" },
            { type: "style", description: "Code style changes (formatting, etc.)", emoji: "💎" },
            { type: "refactor", description: "Code refactoring", emoji: "♻️" },
            { type: "perf", description: "Performance improvements", emoji: "⚡" },
            { type: "test", description: "Adding or updating tests", emoji: "✅" },
            { type: "build", description: "Build system changes", emoji: "🔧" },
            { type: "ci", description: "CI/CD changes", emoji: "👷" },
            { type: "chore", description: "Other changes", emoji: "🔨" },
            { type: "revert", description: "Revert a previous commit", emoji: "⏪" },
        ];
    }

    /**
     * Determine version bump type from commit.
     */
    getBumpType(commit: ConventionalCommit): "major" | "minor" | "patch" {
        if (commit.breaking) {
            return "major";
        }

        if (commit.type === "feat") {
            return "minor";
        }

        return "patch";
    }

    /**
     * Determine version bump type from multiple commits.
     */
    getBumpTypeFromCommits(commits: ConventionalCommit[]): "major" | "minor" | "patch" {
        let hasMajor = false;
        let hasMinor = false;

        for (const commit of commits) {
            if (commit.breaking) {
                hasMajor = true;
            } else if (commit.type === "feat") {
                hasMinor = true;
            }
        }

        if (hasMajor) return "major";
        if (hasMinor) return "minor";
        return "patch";
    }
}
