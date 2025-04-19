import { okAsync, ResultAsync } from "neverthrow";
import type { ArtemisConfiguration, ArtemisContext, ArtemisOptions } from "#/types";

let globalContext: Readonly<ArtemisContext> = Object.freeze(createDefaultContext());

export function useGlobalContext(): Readonly<ArtemisContext> {
    return globalContext;
}

export function createContext(
    options: Readonly<Partial<ArtemisOptions>>,
    configuration: Readonly<Partial<ArtemisConfiguration>>
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const context: ArtemisContext = Object.freeze({
        ...createDefaultContext(),
        options: Object.freeze({ ...createDefaultOptions(), ...options }),
        config: Object.freeze({ ...createDefaultConfiguration(), ...configuration })
    });

    return updateGlobalContext(context);
}

export function updateVersionInContext(
    context: Readonly<ArtemisContext>,
    newVersion: string
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const updatedContext: ArtemisContext = Object.freeze({
        ...context,
        nextVersion: newVersion
    });

    return updateGlobalContext(updatedContext);
}

export function updateChangelogInContext(
    context: Readonly<ArtemisContext>,
    content: string
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const updatedContext: ArtemisContext = Object.freeze({
        ...context,
        changelogContent: content
    });

    return updateGlobalContext(updatedContext);
}

export function updateGlobalContext(context: Readonly<ArtemisContext>): ResultAsync<Readonly<ArtemisContext>, Error> {
    globalContext = Object.freeze({ ...context });
    return okAsync(globalContext);
}

export function createDefaultContext(): Readonly<ArtemisContext> {
    return Object.freeze({
        options: createDefaultOptions(),
        config: createDefaultConfiguration(),
        currentVersion: "0.0.0",
        nextVersion: "",
        changelogContent: ""
    });
}

export function createDefaultConfiguration(): Readonly<ArtemisConfiguration> {
    return Object.freeze({
        name: "",
        base: "",
        scope: ""
    });
}

export function createDefaultOptions(): Readonly<ArtemisOptions> {
    return Object.freeze({
        verbose: false,
        dryRun: false,
        bumpStrategy: "",
        releaseType: "",
        preReleaseBase: "0",
        preReleaseId: "",
        skipBump: false
    });
}
