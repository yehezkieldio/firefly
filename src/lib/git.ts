import { ResultAsync } from "neverthrow";
import { createErrorFromUnknown } from "#/lib/utils";
import type { ArtemisContext } from "#/types";

export type Repository = `${string}/${string}`;

export interface RepositoryObject {
    owner: string;
    repo: string;
}

export function executeGit(args: string[], _context: ArtemisContext): ResultAsync<string, Error> {
    return ResultAsync.fromPromise(
        new Response(
            Bun.spawn(["git", ...args], {
                stdout: "pipe",
                stderr: "pipe"
            }).stdout
        ).text(),
        (error: unknown): Error => createErrorFromUnknown(error, "Unable to execute git command")
    );
}
