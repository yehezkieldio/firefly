import type { Result } from "neverthrow";

export class FireflyError extends Error {
    readonly code: string;
    readonly cause?: Error;

    constructor(message: string, code: string, cause?: Error) {
        super(message);
        this.name = "FireflyError";
        this.code = code;
        this.cause = cause;
    }
}

export type FireflyResult<T> = Result<T, FireflyError>;

export class ConfigurationError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "CONFIGURATION_ERROR", cause);
        this.name = "ConfigurationError";
    }
}

export class GitError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "GIT_ERROR", cause);
        this.name = "GitError";
    }
}

export class VersionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "VERSION_ERROR", cause);
        this.name = "VersionError";
    }
}

export class HostingError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "HOSTING_ERROR", cause);
        this.name = "HostingError";
    }
}

export class ChangelogError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "CHANGELOG_ERROR", cause);
        this.name = "ChangelogError";
    }
}
