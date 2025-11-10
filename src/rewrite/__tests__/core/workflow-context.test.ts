import { describe, expect, it } from "bun:test";
import { WorkflowContext } from "#/rewrite/context/workflow-context";

describe("WorkflowContext", () => {
    describe("constructor", () => {
        it("should create context with config and data", () => {
            const config = { verbose: true, dryRun: false };
            const data = { version: "1.0.0" };
            const ctx = new WorkflowContext(config, data);

            expect(ctx.config).toEqual(config);
            expect(ctx.data).toEqual(data);
        });

        it("should create context with empty data by default", () => {
            const config = { verbose: true };
            const ctx = new WorkflowContext(config);

            expect(ctx.config).toEqual(config);
            expect(ctx.data).toEqual({});
        });
    });

    describe("fork", () => {
        it("should create new context with additional data", () => {
            const ctx1 = new WorkflowContext({ verbose: false }, { a: 1 });
            const ctx2 = ctx1.fork("b", 2);

            expect(ctx2.data).toEqual({ a: 1, b: 2 });
            expect(ctx1.data).toEqual({ a: 1 }); // Original unchanged
        });

        it("should override existing data", () => {
            const ctx1 = new WorkflowContext({}, { a: 1 });
            const ctx2 = ctx1.fork("a", 2);

            expect(ctx2.data.a).toBe(2);
            expect(ctx1.data.a).toBe(1); // Original unchanged
        });
    });

    describe("forkMultiple", () => {
        it("should create new context with multiple data fields", () => {
            const ctx1 = new WorkflowContext({}, { a: 1 });
            const ctx2 = ctx1.forkMultiple({ b: 2, c: 3 });

            expect(ctx2.data).toEqual({ a: 1, b: 2, c: 3 });
            expect(ctx1.data).toEqual({ a: 1 }); // Original unchanged
        });

        it("should handle empty object", () => {
            const ctx1 = new WorkflowContext({}, { a: 1 });
            const ctx2 = ctx1.forkMultiple({});

            expect(ctx2.data).toEqual({ a: 1 });
        });
    });

    describe("immutability", () => {
        it("should not allow config modification", () => {
            const config = { verbose: false };
            const ctx = new WorkflowContext(config);

            // Config should be read-only
            expect(() => {
                // @ts-expect-error - testing immutability
                ctx.config.verbose = true;
            }).toThrow();
        });

        it("should maintain separate data for forked contexts", () => {
            const ctx1 = new WorkflowContext({}, { counter: 0 });
            const ctx2 = ctx1.fork("counter", 1);
            const ctx3 = ctx1.fork("counter", 2);

            expect(ctx1.data.counter).toBe(0);
            expect(ctx2.data.counter).toBe(1);
            expect(ctx3.data.counter).toBe(2);
        });
    });
});
