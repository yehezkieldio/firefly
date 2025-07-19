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

export class PreflightError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "PREFLIGHT_ERROR", cause);
        this.name = "PreflightError";
    }
}

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

export class ParsingError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "PARSING_ERROR", cause);
        this.name = "ParsingError";
    }
}

export class RollbackError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "ROLLBACK_ERROR", cause);
        this.name = "RollbackError";
    }
}
