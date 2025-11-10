import { readFile, writeFile, access, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { ResultAsync } from "neverthrow";
import { parse as parseToml } from "smol-toml";
import { createFireflyError } from "#/shared/utils/error.util";
import type { FireflyAsyncResult } from "#/shared/utils/result.util";

/**
 * Package.json structure.
 */
export interface PackageJson {
    name?: string;
    version?: string;
    description?: string;
    [key: string]: any;
}

/**
 * File system service for file I/O operations.
 * Used by all commands for reading/writing config files, package.json, etc.
 */
export class FileSystemService {
    private readonly cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Resolve a path relative to cwd.
     */
    private resolvePath(path: string): string {
        return join(this.cwd, path);
    }

    /**
     * Check if file exists.
     */
    fileExists(path: string): FireflyAsyncResult<boolean> {
        return ResultAsync.fromPromise(
            access(this.resolvePath(path))
                .then(() => true)
                .catch(() => false),
            (error: any) => createFireflyError({ message: `Failed to check file: ${error.message}`, cause: error }),
        );
    }

    /**
     * Read file as text.
     */
    readFile(path: string): FireflyAsyncResult<string> {
        return ResultAsync.fromPromise(
            readFile(this.resolvePath(path), "utf-8"),
            (error: any) =>
                createFireflyError({
                    message: `Failed to read file ${path}: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Write file.
     */
    writeFile(path: string, content: string): FireflyAsyncResult<void> {
        const fullPath = this.resolvePath(path);
        return ResultAsync.fromPromise(
            mkdir(dirname(fullPath), { recursive: true })
                .then(() => writeFile(fullPath, content, "utf-8"))
                .then(() => undefined),
            (error: any) =>
                createFireflyError({
                    message: `Failed to write file ${path}: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Read JSON file.
     */
    readJson<T = any>(path: string): FireflyAsyncResult<T> {
        return this.readFile(path).andThen((content) => {
            return ResultAsync.fromPromise(
                Promise.resolve(JSON.parse(content) as T),
                (error: any) =>
                    createFireflyError({
                        message: `Failed to parse JSON from ${path}: ${error.message}`,
                        cause: error,
                    }),
            );
        });
    }

    /**
     * Write JSON file.
     */
    writeJson(path: string, data: any, options?: { spaces?: number }): FireflyAsyncResult<void> {
        const spaces = options?.spaces ?? 2;
        const content = JSON.stringify(data, null, spaces);
        return this.writeFile(path, content);
    }

    /**
     * Read TOML file.
     */
    readToml<T = any>(path: string): FireflyAsyncResult<T> {
        return this.readFile(path).andThen((content) => {
            return ResultAsync.fromPromise(
                Promise.resolve(parseToml(content) as T),
                (error: any) =>
                    createFireflyError({
                        message: `Failed to parse TOML from ${path}: ${error.message}`,
                        cause: error,
                    }),
            );
        });
    }

    /**
     * Read package.json.
     */
    readPackageJson(): FireflyAsyncResult<PackageJson> {
        return this.readJson<PackageJson>("package.json");
    }

    /**
     * Write package.json.
     */
    writePackageJson(data: PackageJson): FireflyAsyncResult<void> {
        return this.writeJson("package.json", data);
    }

    /**
     * Update package.json version.
     */
    updatePackageJsonVersion(version: string): FireflyAsyncResult<void> {
        return this.readPackageJson().andThen((pkg) => {
            pkg.version = version;
            return this.writePackageJson(pkg);
        });
    }

    /**
     * Read directory contents.
     */
    readDirectory(path: string): FireflyAsyncResult<string[]> {
        return ResultAsync.fromPromise(
            readdir(this.resolvePath(path)),
            (error: any) =>
                createFireflyError({
                    message: `Failed to read directory ${path}: ${error.message}`,
                    cause: error,
                }),
        );
    }

    /**
     * Find file in directory or parent directories.
     */
    findFileUpwards(filename: string, maxLevels: number = 5): FireflyAsyncResult<string | null> {
        let currentDir = this.cwd;

        const search = async (level: number): Promise<string | null> => {
            if (level >= maxLevels) {
                return null;
            }

            const filePath = join(currentDir, filename);
            try {
                await access(filePath);
                return filePath;
            } catch {
                const parentDir = dirname(currentDir);
                if (parentDir === currentDir) {
                    return null;
                }
                currentDir = parentDir;
                return search(level + 1);
            }
        };

        return ResultAsync.fromPromise(
            search(0),
            (error: any) =>
                createFireflyError({
                    message: `Failed to find file ${filename}: ${error.message}`,
                    cause: error,
                }),
        );
    }
}
