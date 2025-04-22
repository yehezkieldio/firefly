import { okAsync, ResultAsync } from "neverthrow";
import { CWD_PACKAGE_PATH } from "#/lib/constants";
import { fs } from "#/lib/fs";
import { type PackageJson, pkgJson } from "#/lib/package-json";
import type { ArtemisConfiguration, ArtemisContext, ArtemisOptions } from "#/types";

let globalContext: Readonly<ArtemisContext> = Object.freeze<ArtemisContext>(createDefaultContext());

export function useGlobalContext(): Readonly<ArtemisContext> {
    return globalContext;
}

export function createContext(
    options: Readonly<Partial<ArtemisOptions>>,
    configuration: Readonly<Partial<ArtemisConfiguration>>
): ResultAsync<Readonly<ArtemisContext>, Error> {
    const context: ArtemisContext = Object.freeze<ArtemisContext>({
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
        config: createDefaultConfiguration(),
        currentVersion: "0.0.0",
        nextVersion: "",
        changelogContent: ""
    });
}

export function createDefaultConfiguration(): Readonly<ArtemisConfiguration> {
    return Object.freeze<ArtemisConfiguration>({
        name: "",
        base: "",
        scope: "",
        repository: "",
        changelogPath: "CHANGELOG.md",
        commitMessage: "chore(release): release {{name}}@{{version}}",
        tagName: "{{name}}@{{version}}",
        gitHubReleaseTitle: "{{name}}@{{version}}",
        branch: "master"
    });
}

export function createDefaultOptions(): Readonly<ArtemisOptions> {
    return Object.freeze<ArtemisOptions>({
        verbose: false,
        dryRun: false,
        bumpStrategy: "",
        releaseType: "",
        preReleaseBase: "0",
        preReleaseId: "",
        releaseNotes: "",
        skipBump: false,
        skipChangelog: false,
        skipCommit: false,
        skipGitHubRelease: false,
        skipPush: false,
        skipTag: false,
        githubReleaseDraft: false,
        githubReleaseLatest: false,
        githubReleasePrerelease: false
    });
}

export function enrichWithVersion(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    function getVersion(): ResultAsync<string, Error> {
        return fs.getJsonFromFile<PackageJson>(CWD_PACKAGE_PATH).andThen(pkgJson.getPackageVersion);
    }

    return getVersion().map(
        (version: string): ArtemisContext => ({
            ...context,
            currentVersion: version
        })
    );
}
