/**
 * CLI option types.
 */

/**
 * Base CLI options that apply to all commands.
 */
export interface CLIOptions extends Record<string, any> {
    /**
     * Path to configuration file.
     */
    config?: string;

    /**
     * Run without making actual changes.
     */
    dryRun?: boolean;

    /**
     * Enable verbose logging.
     */
    verbose?: boolean;

    /**
     * Enable automatic rollback on failure.
     */
    enableRollback?: boolean;

    /**
     * Parent command (for nested commands).
     */
    parent?: any;
}

/**
 * Configuration that can be loaded from file.
 * Supports both flat and nested (command-specific) structure.
 */
export interface CommandConfig extends Record<string, any> {
    /**
     * Global dry run setting.
     */
    dryRun?: boolean;

    /**
     * Global verbose setting.
     */
    verbose?: boolean;

    /**
     * Global rollback setting.
     */
    enableRollback?: boolean;

    /**
     * Command-specific configurations.
     * Each command can have its own config section.
     */
    release?: Record<string, any>;
    autocommit?: Record<string, any>;
    commit?: Record<string, any>;

    /**
     * Any other fields from command schemas.
     */
    [key: string]: any;
}
