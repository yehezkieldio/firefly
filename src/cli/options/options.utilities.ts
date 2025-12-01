/**
 * Compound words that should be treated as single units in kebab-case.
 * These are typically brand names or technical terms that shouldn't be split.
 */
const COMPOUND_WORDS = ["GitHub", "GitLab", "BitBucket"] as const;

/**
 * Converts a camelCase string to kebab-case.
 *
 * Handles compound words (e.g., "GitHub", "GitLab") as single units
 * to ensure consistent CLI flag naming.
 *
 * @param str - The camelCase string to convert
 * @returns The kebab-case equivalent
 *
 * @example
 * ```ts
 * camelToKebab("bumpStrategy") // "bump-strategy"
 * camelToKebab("skipGitHubRelease") // "skip-github-release"
 * camelToKebab("skipGitLabRelease") // "skip-gitlab-release"
 * ```
 */
export function camelToKebab(str: string): string {
    let result = str;
    for (const word of COMPOUND_WORDS) {
        // Insert hyphen before compound word when preceded by lowercase letter
        result = result.replace(new RegExp(`([a-z])${word}`, "g"), `$1-${word.toLowerCase()}`);
        // Handle compound word at start of string
        result = result.replace(new RegExp(`^${word}`, "g"), word.toLowerCase());
    }
    return result
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/_/g, "-");
}
