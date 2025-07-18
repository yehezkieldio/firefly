import type { Result } from "neverthrow";

export type { Result } from "neverthrow";
export { err, ok } from "neverthrow";

export class ArtemisError extends Error {
    readonly code: string;
    readonly cause?: Error;

    constructor(message: string, code: string, cause?: Error) {
        super(message);
        this.name = "ArtemisError";
        this.code = code;
        this.cause = cause;
    }
}

export class ConfigurationError extends ArtemisError {
    constructor(message: string, cause?: Error) {
        super(message, "CONFIGURATION_ERROR", cause);
        this.name = "ConfigurationError";
    }
}

export class GitError extends ArtemisError {
    constructor(message: string, cause?: Error) {
        super(message, "GIT_ERROR", cause);
        this.name = "GitError";
    }
}

export class VersionError extends ArtemisError {
    constructor(message: string, cause?: Error) {
        super(message, "VERSION_ERROR", cause);
        this.name = "VersionError";
    }
}

export class HostingError extends ArtemisError {
    constructor(message: string, cause?: Error) {
        super(message, "HOSTING_ERROR", cause);
        this.name = "HostingError";
    }
}

export class ChangelogError extends ArtemisError {
    constructor(message: string, cause?: Error) {
        super(message, "CHANGELOG_ERROR", cause);
        this.name = "ChangelogError";
    }
}

export type ArtemisResult<T> = Result<T, ArtemisError>;
