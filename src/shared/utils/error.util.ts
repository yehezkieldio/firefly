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

export class VersionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "VERSION_ERROR", cause);
        this.name = "VersionError";
    }
}

export class VersionInferenceError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "VERSION_INFERENCE_ERROR", cause);
        this.name = "VersionInferenceError";
    }
}

export class ConfigurationError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "CONFIGURATION_ERROR", cause);
        this.name = "ConfigurationError";
    }
}

export class TaskExecutionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "TASK_EXECUTION_ERROR", cause);
        this.name = "TaskExecutionError";
    }
}

export class ProcessExecutionError extends FireflyError {
    constructor(message: string, cause?: Error) {
        super(message, "PROCESS_EXECUTION_ERROR", cause);
        this.name = "ProcessExecutionError";
    }
}
