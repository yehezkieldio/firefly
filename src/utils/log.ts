import { createConsola } from "consola";
import { colors } from "consola/utils";

export const logger = createConsola({
    formatOptions: {
        date: false,
        compact: true,
        columns: 0,
    },
});

// ============================================================================
// Intl.ListFormat for grammatically correct list formatting
// ============================================================================

const listFormatter = new Intl.ListFormat("en", { type: "conjunction" });
const disjunctionFormatter = new Intl.ListFormat("en", { type: "disjunction" });

/**
 * Formats a list with proper grammar (e.g., "a, b, and c").
 * Uses Intl.ListFormat for locale-aware formatting.
 *
 * @param items - Array of strings to format
 * @returns Formatted string with proper conjunctions
 *
 * @example
 * ```ts
 * formatList(["apple", "banana", "cherry"]) // "apple, banana, and cherry"
 * formatList(["one", "two"]) // "one and two"
 * formatList(["single"]) // "single"
 * ```
 */
export function formatList(items: string[]): string {
    return listFormatter.format(items);
}

/**
 * Formats a list with "or" (e.g., "a, b, or c").
 * Uses Intl.ListFormat for locale-aware formatting.
 *
 * @param items - Array of strings to format
 * @returns Formatted string with proper disjunctions
 *
 * @example
 * ```ts
 * formatDisjunction(["patch", "minor", "major"]) // "patch, minor, or major"
 * ```
 */
export function formatDisjunction(items: string[]): string {
    return disjunctionFormatter.format(items);
}

// ============================================================================
// Tagged Template Literal DSL for CLI Output
// ============================================================================

type StyleFn = (text: string) => string;

interface CliValue {
    readonly value: unknown;
    readonly style: StyleFn;
}

/**
 * Creates a styled value for use with the `cli` tagged template.
 *
 * @param value - The value to style
 * @param style - The style function to apply
 * @returns Styled value object
 *
 * @example
 * ```ts
 * cli`Version: ${styled("1.0.0", colors.green)}`
 * ```
 */
export function styled(value: unknown, style: StyleFn): CliValue {
    return { value, style };
}

// Pre-configured style helpers for common use cases
export const styles = {
    /** Cyan style for identifiers, versions, branches */
    version: (value: unknown): CliValue => styled(value, colors.cyan),
    /** Green style for success messages, paths */
    success: (value: unknown): CliValue => styled(value, colors.green),
    /** Yellow style for warnings */
    warning: (value: unknown): CliValue => styled(value, colors.yellow),
    /** Red style for errors */
    error: (value: unknown): CliValue => styled(value, colors.red),
    /** Dim style for secondary information */
    dim: (value: unknown): CliValue => styled(value, colors.dim),
    /** Bold style for emphasis */
    bold: (value: unknown): CliValue => styled(value, colors.bold),
    /** Magenta style for commands */
    command: (value: unknown): CliValue => styled(value, colors.magenta),
} as const;

/**
 * Tagged template literal for styled CLI output.
 *
 * Automatically applies cyan styling to interpolated values for consistency.
 * Use `styled()` or `styles.*` helpers for custom styling.
 *
 * @example
 * ```ts
 * // Basic usage - values are cyan by default
 * logger.info(cli`Releasing version ${version} to ${remote}`);
 *
 * // Custom styling with helpers
 * logger.info(cli`Status: ${styles.success("OK")} - ${styles.dim("completed in 2s")}`);
 *
 * // Custom styling with styled()
 * logger.info(cli`Error: ${styled(message, colors.red)}`);
 * ```
 */
export function cli(strings: TemplateStringsArray, ...values: unknown[]): string {
    return strings.reduce((result, str, i) => {
        if (i === 0) return str;

        const rawValue = values[i - 1];
        let styledValue: string;

        if (isCliValue(rawValue)) {
            // Apply custom style
            styledValue = rawValue.style(String(rawValue.value));
        } else {
            // Default to cyan for consistency
            styledValue = colors.cyan(String(rawValue));
        }

        return result + styledValue + str;
    }, "");
}

/**
 * Type guard for CliValue objects.
 */
function isCliValue(value: unknown): value is CliValue {
    return (
        typeof value === "object" &&
        value !== null &&
        "value" in value &&
        "style" in value &&
        typeof (value as CliValue).style === "function"
    );
}
