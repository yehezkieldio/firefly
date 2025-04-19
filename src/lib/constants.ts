import { join } from "node:path";

export const ARTEMIS_ROOT: string = new URL("../../", import.meta.url).pathname;

export const CWD: string = process.cwd();
export const CWD_PACKAGE_PATH: string = join(CWD, "package.json");
