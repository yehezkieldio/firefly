export function createErrorFromUnknown(error: unknown, errorMessage: string): Error {
    if (error instanceof Error) {
        return new Error(`${errorMessage}: ${error.message}`);
    }
    return new Error(`${errorMessage}: ${error}`);
}
