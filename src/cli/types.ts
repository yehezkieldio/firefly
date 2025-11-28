export interface CLIOptions extends Record<string, unknown> {
    config?: string;
    dryRun?: boolean;
    verbose?: boolean;
    enableRollback?: boolean;
    parent?: unknown;
}

export interface CommandConfig extends Record<string, unknown> {
    dryRun?: boolean;
    verbose?: boolean;
    enableRollback?: boolean;

    release?: Record<string, unknown>;
}
