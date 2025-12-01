/**
 * Options for initializing runtime environment variables.
 */
export interface RuntimeEnvOptions {
    /**
     * The Firefly CLI version from package.json.
     */
    readonly version: string;

    /**
     * The Firefly CLI description from package.json.
     */
    readonly description: string;

    /**
     * The git-cliff version used by Firefly.
     */
    readonly gitCliffVersion: string;
}

/**
 * These are set during CLI initialization in main.ts and provide
 * version and metadata information throughout the application.
 *
 */
export class RuntimeEnv {
    private constructor() {} // Prevent instantiation

    /**
     * The Firefly CLI version.
     *
     * Retrieved from `FIREFLY_VERSION` environment variable,
     * which is set during CLI initialization.
     */
    static get version(): string {
        return String(process.env.FIREFLY_VERSION);
    }

    /**
     * The Firefly CLI description.
     *
     * Retrieved from `FIREFLY_DESCRIPTION` environment variable,
     * which is set during CLI initialization.
     */
    static get description(): string {
        return String(process.env.FIREFLY_DESCRIPTION);
    }

    /**
     * The git-cliff version used by Firefly for changelog generation.
     *
     * Retrieved from `FIREFLY_GIT_CLIFF_VERSION` environment variable,
     * which is set during CLI initialization.
     */
    static get gitCliffVersion(): string {
        return String(process.env.FIREFLY_GIT_CLIFF_VERSION);
    }

    /**
     * Initializes the runtime environment variables.
     *
     * This method should be called once during CLI bootstrap in main.ts
     * before any other code accesses these values.
     *
     * @param options - The runtime environment options to set
     *
     */
    static initialize(options: RuntimeEnvOptions): void {
        process.env.FIREFLY_VERSION = options.version;
        process.env.FIREFLY_DESCRIPTION = options.description;
        process.env.FIREFLY_GIT_CLIFF_VERSION = options.gitCliffVersion;
    }
}
