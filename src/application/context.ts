import { okAsync, ResultAsync } from "neverthrow";
import { type ArtemisOptions, defaultArtemisOptions } from "#/infrastructure/config";

export interface ArtemisContext {
    /**
     * The options provided by the user.
     */
    options: ArtemisOptions;

    /**
     * Extracted current version from the package.json file.
     */
    currentVersion: string;

    /**
     * Determined next version based on the bump strategy and release type.
     */
    nextVersion: string;

    /**
     * The generated changelog content based on conventional commits by git-cliff.
     */
    changelogContent: string;
}

let globalContext: Readonly<ArtemisContext> = Object.freeze<ArtemisContext>(createDefaultContext());

export function createContext(
    options: Readonly<Partial<ArtemisOptions>>
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const context: ArtemisContext = Object.freeze<ArtemisContext>({
        ...createDefaultContext(),
        options: Object.freeze({ ...createDefaultOptions(), ...options })
    });

    return updateGlobalContext(context);
}

export function useGlobalContext(): Readonly<ArtemisContext> {
    return globalContext;
}

export function updateVersionInContext(
    context: Readonly<ArtemisContext>,
    newVersion: string
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const updatedContext: ArtemisContext = Object.freeze<ArtemisContext>({
        ...context,
        nextVersion: newVersion
    });

    return updateGlobalContext(updatedContext);
}

export function updateChangelogInContext(
    context: Readonly<ArtemisContext>,
    content: string
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const updatedContext: ArtemisContext = Object.freeze<ArtemisContext>({
        ...context,
        changelogContent: content
    });

    return updateGlobalContext(updatedContext);
}

export function updateGlobalContext(context: Readonly<ArtemisContext>): ResultAsync<Readonly<ArtemisContext>, Error> {
    globalContext = Object.freeze<ArtemisContext>({ ...context });
    return okAsync(globalContext);
}

export function createDefaultContext(): Readonly<ArtemisContext> {
    return Object.freeze({
        options: createDefaultOptions(),
        currentVersion: "0.0.0",
        nextVersion: "",
        changelogContent: ""
    });
}

export function createDefaultOptions(): Readonly<ArtemisOptions> {
    return Object.freeze<ArtemisOptions>(defaultArtemisOptions);
}
