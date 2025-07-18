import type { TomlValue } from "smol-toml";
import type { CliffToml } from "#/shared/types/git-cliff";

type Constructor<T> = new (...args: unknown[]) => T;

function isObject<T extends Constructor<unknown> = ObjectConstructor>(
    input: unknown,
    constructorType?: T
): input is object {
    return typeof input === "object" && input ? input.constructor === (constructorType ?? Object) : false;
}

export function isCliffToml(value: TomlValue | unknown): value is CliffToml {
    return isObject(value);
}
