import { describe, expect, it, beforeEach } from "bun:test";
import { ConventionalCommitService } from "#/rewrite/shared/conventional-commit";

describe("ConventionalCommitService", () => {
    let service: ConventionalCommitService;

    beforeEach(() => {
        service = new ConventionalCommitService();
    });

    describe("parse", () => {
        it("should parse feat commit", () => {
            const result = service.parse("feat: add new feature");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.type).toBe("feat");
                expect(result.value.subject).toBe("add new feature");
                expect(result.value.breaking).toBe(false);
            }
        });

        it("should parse fix commit with scope", () => {
            const result = service.parse("fix(api): correct endpoint");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.type).toBe("fix");
                expect(result.value.scope).toBe("api");
                expect(result.value.subject).toBe("correct endpoint");
            }
        });

        it("should parse breaking change with !", () => {
            const result = service.parse("feat!: breaking change");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.breaking).toBe(true);
            }
        });

        it("should parse breaking change with scope", () => {
            const result = service.parse("feat(api)!: breaking change");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.type).toBe("feat");
                expect(result.value.scope).toBe("api");
                expect(result.value.breaking).toBe(true);
            }
        });

        it("should parse commit with body", () => {
            const message = "feat: add feature\n\nDetailed description";
            const result = service.parse(message);

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.body).toBe("Detailed description");
            }
        });

        it("should return error for invalid format", () => {
            const result = service.parse("invalid commit message");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("validate", () => {
        it("should validate correct commit", () => {
            const result = service.validate("feat: new feature");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.valid).toBe(true);
                expect(result.value.errors).toHaveLength(0);
            }
        });

        it("should return errors for invalid commit", () => {
            const result = service.validate("not a valid commit");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.valid).toBe(false);
                expect(result.value.errors.length).toBeGreaterThan(0);
            }
        });
    });

    describe("format", () => {
        it("should format simple commit", () => {
            const formatted = service.format({
                type: "feat",
                subject: "add feature",
                breaking: false,
            });

            expect(formatted).toBe("feat: add feature");
        });

        it("should format commit with scope", () => {
            const formatted = service.format({
                type: "fix",
                scope: "api",
                subject: "fix bug",
                breaking: false,
            });

            expect(formatted).toBe("fix(api): fix bug");
        });

        it("should format breaking change", () => {
            const formatted = service.format({
                type: "feat",
                subject: "breaking change",
                breaking: true,
            });

            expect(formatted).toBe("feat!: breaking change");
        });

        it("should format commit with body", () => {
            const formatted = service.format({
                type: "feat",
                subject: "add feature",
                body: "Detailed description",
                breaking: false,
            });

            expect(formatted).toBe("feat: add feature\n\nDetailed description");
        });
    });

    describe("determineBumpType", () => {
        it("should return major for breaking change", () => {
            const commits = [
                { type: "feat", breaking: true, subject: "breaking" },
            ];
            const bumpType = service.determineBumpType(commits);

            expect(bumpType).toBe("major");
        });

        it("should return minor for feat commits", () => {
            const commits = [
                { type: "feat", breaking: false, subject: "feature" },
            ];
            const bumpType = service.determineBumpType(commits);

            expect(bumpType).toBe("minor");
        });

        it("should return patch for fix commits", () => {
            const commits = [
                { type: "fix", breaking: false, subject: "bugfix" },
            ];
            const bumpType = service.determineBumpType(commits);

            expect(bumpType).toBe("patch");
        });

        it("should return patch for other commits", () => {
            const commits = [
                { type: "docs", breaking: false, subject: "update docs" },
            ];
            const bumpType = service.determineBumpType(commits);

            expect(bumpType).toBe("patch");
        });

        it("should prioritize breaking changes", () => {
            const commits = [
                { type: "feat", breaking: false, subject: "feature" },
                { type: "fix", breaking: true, subject: "breaking fix" },
            ];
            const bumpType = service.determineBumpType(commits);

            expect(bumpType).toBe("major");
        });
    });
});
