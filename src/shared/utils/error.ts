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

export class CommandExecutionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "COMMAND_EXECUTION_ERROR", cause);
        this.name = "CommandExecutionError";
    }
}

export class RollbackError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "ROLLBACK_ERROR", cause);
        this.name = "RollbackError";
    }
}

export class ConfigurationError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "CONFIGURATION_ERROR", cause);
        this.name = "ConfigurationError";
    }
}

export class ParsingError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "PARSING_ERROR", cause);
        this.name = "ParsingError";
    }
}

export class VersionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "VERSION_ERROR", cause);
        this.name = "VersionError";
    }
}

export class ProcessExecutionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "PROCESS_EXECUTION_ERROR", cause);
        this.name = "ProcessExecutionError";
    }
}
