import * as path from "node:path";

/**
 * Workspace configuration options.
 */
export interface WorkspaceOptions {
    /**
     * The base working directory for all operations.
     * Defaults to `process.cwd()` if not specified.
     */
    readonly basePath?: string;
}

/**
 * Represents the workspace context for CLI operations.
 *
 * The workspace provides:
 * - Centralized base path management
 * - Path resolution relative to the workspace root
 * - Consistent working directory across all services
 *
 * @example
 * ```typescript
 * // Create a workspace from current directory
 * const workspace = Workspace.current();
 *
 * // Create a workspace from explicit path
 * const workspace = Workspace.from("/path/to/project");
 *
 * // Resolve paths relative to workspace
 * const configPath = workspace.resolve("firefly.config.ts");
 * const srcPath = workspace.resolve("src", "index.ts");
 * ```
 */
export class Workspace {
    readonly #basePath: string;

    private constructor(basePath: string) {
        this.#basePath = path.resolve(basePath);
    }

    /**
     * The absolute path to the workspace root directory.
     */
    get basePath(): string {
        return this.#basePath;
    }

    /**
     * Alias for `basePath` - the current working directory for operations.
     */
    get cwd(): string {
        return this.#basePath;
    }

    /**
     * Creates a workspace from the current working directory.
     *
     * @returns A new Workspace instance rooted at `process.cwd()`
     *
     * @example
     * ```typescript
     * const workspace = Workspace.current();
     * console.log(workspace.basePath); // /current/working/directory
     * ```
     */
    static current(): Workspace {
        return new Workspace(process.cwd());
    }

    /**
     * Creates a workspace from an explicit path.
     *
     * @param basePath - The root directory for the workspace
     * @returns A new Workspace instance rooted at the specified path
     *
     * @example
     * ```typescript
     * const workspace = Workspace.from("/path/to/project");
     * console.log(workspace.basePath); // /path/to/project
     * ```
     */
    static from(basePath: string): Workspace {
        return new Workspace(basePath);
    }

    /**
     * Creates a workspace from options, falling back to current directory.
     *
     * @param options - Optional workspace configuration
     * @returns A new Workspace instance
     *
     * @example
     * ```typescript
     * // From CLI options
     * const workspace = Workspace.fromOptions({ basePath: cliOptions.cwd });
     *
     * // Falls back to process.cwd() if basePath is undefined
     * const workspace = Workspace.fromOptions({});
     * ```
     */
    static fromOptions(options?: WorkspaceOptions): Workspace {
        return options?.basePath ? Workspace.from(options.basePath) : Workspace.current();
    }

    /**
     * Resolves a path relative to the workspace root.
     *
     * @param segments - Path segments to join and resolve
     * @returns The absolute resolved path
     *
     * @example
     * ```typescript
     * const workspace = Workspace.from("/project");
     *
     * workspace.resolve("src", "index.ts");
     * // => "/project/src/index.ts"
     *
     * workspace.resolve("package.json");
     * // => "/project/package.json"
     *
     * // Absolute paths are returned as-is
     * workspace.resolve("/absolute/path");
     * // => "/absolute/path"
     * ```
     */
    resolve(...segments: string[]): string {
        const joined = path.join(...segments);

        if (path.isAbsolute(joined)) {
            return joined;
        }

        return path.join(this.#basePath, joined);
    }

    /**
     * Checks if a path is within the workspace boundaries.
     *
     * @param targetPath - The path to check
     * @returns `true` if the path is within the workspace
     *
     * @example
     * ```typescript
     * const workspace = Workspace.from("/project");
     *
     * workspace.contains("/project/src/file.ts"); // true
     * workspace.contains("/other/path"); // false
     * ```
     */
    contains(targetPath: string): boolean {
        const resolved = path.resolve(targetPath);
        return resolved.startsWith(this.#basePath);
    }

    /**
     * Returns a string representation of the workspace.
     */
    toString(): string {
        return `Workspace(${this.#basePath})`;
    }

    /**
     * Returns the workspace as a JSON-serializable object.
     */
    toJSON(): { basePath: string } {
        return { basePath: this.#basePath };
    }
}

/**
 * Gets the current workspace base path.
 *
 * This is a convenience function for cases where you just need the path
 * without creating a full Workspace instance.
 *
 * @returns The current working directory
 *
 * @example
 * ```typescript
 * const basePath = getCurrentWorkspacePath();
 * ```
 */
export function getCurrentWorkspacePath(): string {
    return process.cwd();
}
