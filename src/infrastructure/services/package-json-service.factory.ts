import { join } from "node:path";
import type { PackageJsonPort } from "#/core/ports/package-json.port";
import { BunPackageJsonService } from "#/infrastructure/services/bun-package-json.service";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { FsPackageJsonService } from "#/infrastructure/services/fs-package-json.service";
import { logger } from "#/shared/utils/logger";

export function createPackageJsonService(cwd = process.cwd()): PackageJsonPort {
    const bunServiceResult = BunPackageJsonService.create();

    if (bunServiceResult.isOk()) {
        return bunServiceResult.value;
    }

    logger.verbose(`Falling back to file-based package.json service: ${bunServiceResult.error.message}`);

    const fileSystem = new FileSystemService(join(cwd, "package.json"));
    return new FsPackageJsonService(fileSystem);
}
