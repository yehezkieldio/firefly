import { join } from "node:path";
import { logger } from "#/shared/logger";

export interface PackageJson {
    name?: string;
    repository?: string | { url: string };
    version?: string;
    [key: string]: unknown;
}

const VERSION_REGEX = /^(\s*"version"\s*:\s*)"[^"]*"(.*)$/m;

export class PackageJsonHandler {
    private readonly packageJsonPath: string;

    constructor(private cwd: string) {
        this.packageJsonPath = join(this.cwd, "package.json");
    }

    async read(): Promise<PackageJson | null> {
        try {
            const packageJsonText = await Bun.file(this.packageJsonPath).text();

            return JSON.parse(packageJsonText);
        } catch (error) {
            logger.debug("Could not read package.json:", error);
            return null;
        }
    }

    async updateVersion(newVersion: string): Promise<boolean> {
        try {
            const file = Bun.file(this.packageJsonPath);
            const text = await file.text();

            if (!VERSION_REGEX.test(text)) {
                logger.error("No version field found in package.json");
                return false;
            }

            const updatedText = text.replace(VERSION_REGEX, `$1${newVersion}$2`);
            await Bun.write(this.packageJsonPath, updatedText);

            logger.success(`Updated version to ${newVersion} in package.json`);
            return true;
        } catch (error) {
            logger.error("Failed to update version in package.json:", error);
            return false;
        }
    }

    async write(packageJson: PackageJson): Promise<boolean> {
        try {
            const content = `${JSON.stringify(packageJson, null, 2)}\n`;
            await Bun.write(this.packageJsonPath, content);

            logger.success("package.json written successfully");
            return true;
        } catch (error) {
            logger.error("Failed to write package.json:", error);
            return false;
        }
    }

    async exists(): Promise<boolean> {
        try {
            await Bun.file(this.packageJsonPath).exists();
            return true;
        } catch {
            return false;
        }
    }

    getPath(): string {
        return this.packageJsonPath;
    }
}
