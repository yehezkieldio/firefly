import { join } from "node:path";
import type { PackageJsonPort } from "#/core/ports/package-json.port";
import { logger } from "#/shared/logger";
import { BunPackageJsonService } from "./bun-package-json.service";
import { FilePackageJsonService } from "./file-package-json.service";
import { FileSystemService } from "./file-system.service";

export function createPackageJsonService(cwd: string): PackageJsonPort {
    try {
        return new BunPackageJsonService();
    } catch {
        logger.verbose("Falling back to file-based package.json service due to Bun version incompatibility.");
        return new FilePackageJsonService(new FileSystemService(join(cwd, "package.json")));
    }
}
