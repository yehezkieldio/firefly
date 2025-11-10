import { describe, expect, it } from "bun:test";
import { ContextBuilder } from "#/rewrite/context/context-builder";

describe("ContextBuilder", () => {
    describe("create", () => {
        it("should build context with config", () => {
            const ctx = ContextBuilder.create()
                .withConfig({ verbose: true, dryRun: false })
                .build();

            expect(ctx.config.verbose).toBe(true);
            expect(ctx.config.dryRun).toBe(false);
        });

        it("should build context with single data field", () => {
            const ctx = ContextBuilder.create()
                .withConfig({})
                .withData("version", "1.0.0")
                .build();

            expect(ctx.data.version).toBe("1.0.0");
        });

        it("should build context with multiple data fields", () => {
            const ctx = ContextBuilder.create()
                .withConfig({})
                .withMultipleData({ a: 1, b: 2, c: 3 })
                .build();

            expect(ctx.data).toEqual({ a: 1, b: 2, c: 3 });
        });

        it("should chain methods fluently", () => {
            const ctx = ContextBuilder.create()
                .withConfig({ verbose: true })
                .withData("a", 1)
                .withData("b", 2)
                .withMultipleData({ c: 3, d: 4 })
                .build();

            expect(ctx.config.verbose).toBe(true);
            expect(ctx.data).toEqual({ a: 1, b: 2, c: 3, d: 4 });
        });
    });

    describe("forTesting", () => {
        it("should create test context with mock config", () => {
            const ctx = ContextBuilder.forTesting()
                .withMockConfig({ verbose: true })
                .build();

            expect(ctx.config.verbose).toBe(true);
        });

        it("should create test context with mock data", () => {
            const ctx = ContextBuilder.forTesting()
                .withMockData("testValue", 123)
                .build();

            expect(ctx.data.testValue).toBe(123);
        });

        it("should provide sensible defaults for testing", () => {
            const ctx = ContextBuilder.forTesting().build();

            expect(ctx.config.dryRun).toBe(true); // Safe for tests
            expect(ctx.config.verbose).toBe(false);
        });
    });
});
