export function createErrorFromUnknown(error: unknown, message?: string): Error {
    const _message: string = error instanceof Error ? error.message : String(error);
    return message ? new Error(`${message}: ${_message}`) : new Error(_message);
}

export function flattenMultilineText(text: string): string {
    return text
        .split("\n")
        .map((line: string): string => line.trim())
        .filter((line: string): boolean => line.length > 0)
        .join("\\n");
}
