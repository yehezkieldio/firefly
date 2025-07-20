import { okAsync } from "neverthrow";
import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class PreflightCheckCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName() {
        return "PreflightCheckCommand";
    }
    getDescription() {
        return "";
    }

    execute(): AsyncFireflyResult<void> {
        this.context.getBasePath();
        return okAsync(undefined);
    }

    undo(): AsyncFireflyResult<void> {
        return okAsync(undefined);
    }
}
