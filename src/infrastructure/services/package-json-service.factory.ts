import { join } from "node:path";
import type { PackageJsonPort } from "#/core/ports/package-json.port";
import { BunPackageJsonAdapter } from "#/infrastructure/adapters/bun-package-json.adapter";
import { FsPackageJsonAdapter } from "#/infrastructure/adapters/fs-package-json.adapter";
import { FileSystemService } from "#/infrastructure/services/file-system.service";
import { logger } from "#/shared/utils/logger.util";

export function createPackageJsonService(cwd = process.cwd()): PackageJsonPort {
    const bunServiceResult = BunPackageJsonAdapter.create();

    if (bunServiceResult.isOk()) {
        return bunServiceResult.value;
    }

    logger.verbose(`Falling back to file-based package.json service: ${bunServiceResult.error.message}`);

    const fileSystem = new FileSystemService(join(cwd, "package.json"));
    return new FsPackageJsonAdapter(fileSystem);
}
