import z from "zod";

/**
 * Schema for global CLI options that apply to all commands.
 *
 * These options are registered at the program level and inherited by all subcommands.
 * They control cross-cutting concerns like dry-run mode, verbosity, and rollback behavior.
 */
export const GlobalOptionsSchema = z.object({
    /**
     * The working directory for the CLI to operate in.
     * Defaults to the current working directory.
     */
    cwd: z.string().optional().describe("The working directory for all operations."),

    /**
     * Run without making actual changes (preview mode).
     */
    dryRun: z.boolean().optional().describe("Run without making actual changes."),

    /**
     * Enable verbose logging output for debugging.
     */
    verbose: z.boolean().optional().describe("Enable verbose logging output."),

    /**
     * Automatically rollback changes on failure. Enabled by default.
     */
    enableRollback: z.boolean().optional().describe("Automatically rollback on failure."),
});

export type GlobalOptions = z.infer<typeof GlobalOptionsSchema>;

/**
 * Raw CLI options as parsed by Commander.js.
 *
 * This interface represents the shape of options immediately after Commander parses them,
 * before any normalization or merging with config file values.
 */
export interface ParsedCLIOptions extends Record<string, unknown> {
    /**
     * Optional path to a custom config file. */
    config?: string;

    /**
     * The working directory for all operations.
     */
    cwd?: string;

    /**
     * Run without making actual changes.
     */
    dryRun?: boolean;

    /**
     * Enable verbose logging output.
     */
    verbose?: boolean;

    /**
     * Automatically rollback on failure.
     */
    enableRollback?: boolean;
}

/**
 * Merged runtime configuration combining CLI options and config file values.
 *
 * This interface represents the final configuration state after merging:
 * 1. Default values from schemas
 * 2. Config file values (firefly.config.ts)
 * 3. CLI option overrides
 *
 * Command-specific configuration is stored under the command's name key
 * (e.g., `release` for release command config).
 */
export interface RuntimeConfig extends Record<string, unknown> {
    /**
     * The working directory for all operations.
     */
    cwd?: string;

    /**
     * Run without making actual changes.
     */
    dryRun?: boolean;

    /**
     * Enable verbose logging output.
     */
    verbose?: boolean;

    /**
     * Automatically rollback on failure.
     */
    enableRollback?: boolean;

    /**
     * Release command configuration (when running release).
     */
    release?: Record<string, unknown>;
}
