export function createErrorFromUnknown(error: unknown, message?: string): Error {
    const _message: string = error instanceof Error ? error.message : String(error);
    return message ? new Error(`${message}: ${_message}`) : new Error(_message);
}
