import { join } from "node:path";
import { logger } from "#/shared/logger";

export interface PackageJson {
    name?: string;
    repository?: string | { url: string };
}

export class PackageJsonReader {
    constructor(private cwd: string) {}

    async read(): Promise<PackageJson | null> {
        try {
            const packageJsonPath = join(this.cwd, "package.json");
            const packageJsonText = await Bun.file(packageJsonPath).text();

            return JSON.parse(packageJsonText);
        } catch (error) {
            logger.debug("Could not read package.json:", error);
            return null;
        }
    }
}
