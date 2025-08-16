import { z } from "zod";
import { SchemaRegistry } from "#/modules/configuration/application/schema-registry.service";
import type { OrchestrationContext } from "#/modules/orchestration/core/contracts/orchestration.interface";
import { type FireflyResult, fireflyErr, fireflyOk } from "#/shared/utils/result.util";
import { validateWithResult } from "#/shared/utils/result-factory.util";

export const ApplicationContextSchema = z.object({
    currentVersion: z.string().optional(),
    nextVersion: z.string().optional(),
    changelogContent: z.string().optional(),
    config: SchemaRegistry.getConfigSchema().partial().optional(),
});

export type ApplicationContextData = z.infer<typeof ApplicationContextSchema>;

export class ApplicationContext implements OrchestrationContext<ApplicationContextData> {
    readonly executionId: string;
    readonly startTime: Date;
    private state: ApplicationContextData;

    private constructor(initial: ApplicationContextData, executionId?: string) {
        this.state = initial;
        this.executionId = executionId ?? crypto.randomUUID();
        this.startTime = new Date();
    }

    static create(initial: unknown, executionId?: string): FireflyResult<ApplicationContext> {
        const parsed = validateWithResult(ApplicationContextSchema, initial, "application-context");
        if (parsed.isErr()) {
            return fireflyErr(parsed.error);
        }
        return fireflyOk(new ApplicationContext(parsed.value, executionId));
    }

    get<K extends keyof ApplicationContextData>(key: K): FireflyResult<ApplicationContextData[K]> {
        return fireflyOk(this.state[key]);
    }

    set<K extends keyof ApplicationContextData>(key: K, value: ApplicationContextData[K]): FireflyResult<void> {
        const parsed = validateWithResult(
            ApplicationContextSchema,
            { ...this.state, [key]: value },
            "application-context",
        );
        if (parsed.isErr()) {
            return fireflyErr(parsed.error);
        }
        this.state = parsed.value;
        return fireflyOk();
    }

    update<K extends keyof ApplicationContextData>(
        key: K,
        updater: (current: ApplicationContextData[K] | undefined) => ApplicationContextData[K],
    ): FireflyResult<void> {
        const updatedValue = updater(this.state[key]);
        return this.set(key, updatedValue);
    }

    has<K extends keyof ApplicationContextData>(key: K): boolean {
        return key in this.state && this.state[key] !== undefined;
    }

    snapshot(): Readonly<ApplicationContextData> {
        return Object.freeze({ ...this.state });
    }

    clear(): FireflyResult<void> {
        this.state = {} as ApplicationContextData;
        return fireflyOk();
    }
}
