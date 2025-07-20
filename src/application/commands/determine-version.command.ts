import { okAsync } from "neverthrow";
import type { Command } from "#/application/command.interface";
import type { ApplicationContext } from "#/application/context";
import { logger } from "#/shared/utils/logger";
import type { AsyncFireflyResult } from "#/shared/utils/result";

export class DetermineVersionCommand implements Command {
    constructor(private readonly context: ApplicationContext) {}

    getName() {
        return "DetermineVersionCommand";
    }
    getDescription() {
        return "";
    }

    execute(): AsyncFireflyResult<void> {
        this.context.getBasePath();
        return okAsync(undefined);
    }

    undo(): AsyncFireflyResult<void> {
        logger.info("Undoing DetermineVersionCommand");
        return okAsync(undefined);
    }
}
