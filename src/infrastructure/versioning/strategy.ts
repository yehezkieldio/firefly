import { okAsync, ResultAsync } from "neverthrow";
import semver, { type ReleaseType } from "semver";
import { type ArtemisContext, updateVersionInContext } from "#/application/context";
import { logger } from "#/infrastructure/logging";
import { createErrorFromUnknown } from "#/infrastructure/utils";
import { generateAutomaticVersion } from "#/infrastructure/versioning/conventional";
import { generateManualVersion, type PromptSelectChoice } from "#/infrastructure/versioning/increment";
import type { BumpStrategy, PreReleaseBase } from "#/types";

const strategies: PromptSelectChoice[] = [
    {
        label: "Automatic Bump",
        value: "auto",
        hint: "Automatically determine the version bump using conventional commits"
    },
    {
        label: "Manual Bump",
        value: "manual",
        hint: "Manually select the version bump"
    }
];

type StrategyHandler = (context: ArtemisContext) => ResultAsync<ArtemisContext, Error>;
type StrategyHandlers = Record<BumpStrategy, StrategyHandler>;

export function generateVersion(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    if (context.options.skipBump) {
        return okAsync(context);
    }

    return selectBumpStrategy(context);
}

function selectBumpStrategy(context: ArtemisContext): ResultAsync<ArtemisContext, Error> {
    function executeStrategy(context: ArtemisContext, strategy: BumpStrategy): ResultAsync<ArtemisContext, Error> {
        const handlers: StrategyHandlers = getStrategyHandlers();
        return handlers[strategy](context);
    }

    if (context.options.bumpStrategy) {
        return executeStrategy(context, context.options.bumpStrategy as BumpStrategy);
    }

    function promptStrategy(): ResultAsync<BumpStrategy, Error> {
        return ResultAsync.fromPromise(
            logger.prompt("Pick a version strategy", {
                type: "select",
                options: strategies,
                initial: strategies[1]!.value,
                cancel: "reject"
            }) as Promise<BumpStrategy>,
            (error: unknown): Error => createErrorFromUnknown(error)
        );
    }

    return promptStrategy().andThen(
        (strategy: BumpStrategy): ResultAsync<ArtemisContext, Error> => executeStrategy(context, strategy)
    );
}

function getStrategyHandlers(): StrategyHandlers {
    function createManualVersionHandler(): StrategyHandler {
        return (context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
            return generateManualVersion(context).andThen((version: string): ResultAsync<ArtemisContext, Error> => {
                return updateVersionInContext(context, version);
            });
        };
    }

    function createAutomaticVersionHandler(): StrategyHandler {
        return (context: ArtemisContext): ResultAsync<ArtemisContext, Error> => {
            return generateAutomaticVersion(context).andThen((version: string): ResultAsync<ArtemisContext, Error> => {
                return updateVersionInContext(context, version);
            });
        };
    }

    return {
        auto: createAutomaticVersionHandler(),
        manual: createManualVersionHandler()
    };
}

export function incrementVersion(context: ArtemisContext, increment: ReleaseType): string {
    const preReleaseId: string = context.options.preReleaseId || "alpha";
    const releaseIdentifier: PreReleaseBase = ensureIdentifierBase(context.options.preReleaseBase);

    return semver.inc(context.currentVersion, increment, preReleaseId, releaseIdentifier) ?? context.currentVersion;
}

function ensureIdentifierBase(value: string): PreReleaseBase {
    return value === "0" || value === "1" ? value : "0";
}
