import { describe, expect, it } from "bun:test";
import { VersionService } from "#/rewrite/shared/version";

describe("VersionService", () => {
    let versionService: VersionService;

    beforeEach(() => {
        versionService = new VersionService();
    });

    describe("parse", () => {
        it("should parse valid semantic version", () => {
            const result = versionService.parse("1.2.3");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.major).toBe(1);
                expect(result.value.minor).toBe(2);
                expect(result.value.patch).toBe(3);
            }
        });

        it("should parse version with v prefix", () => {
            const result = versionService.parse("v1.2.3");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.major).toBe(1);
            }
        });

        it("should parse version with prerelease", () => {
            const result = versionService.parse("1.2.3-alpha.1");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.prerelease).toBe("alpha.1");
            }
        });

        it("should return error for invalid version", () => {
            const result = versionService.parse("invalid");

            expect(result.isErr()).toBe(true);
        });
    });

    describe("bump", () => {
        it("should bump major version", () => {
            const version = { major: 1, minor: 2, patch: 3 };
            const result = versionService.bump(version, "major");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.major).toBe(2);
                expect(result.value.minor).toBe(0);
                expect(result.value.patch).toBe(0);
            }
        });

        it("should bump minor version", () => {
            const version = { major: 1, minor: 2, patch: 3 };
            const result = versionService.bump(version, "minor");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.major).toBe(1);
                expect(result.value.minor).toBe(3);
                expect(result.value.patch).toBe(0);
            }
        });

        it("should bump patch version", () => {
            const version = { major: 1, minor: 2, patch: 3 };
            const result = versionService.bump(version, "patch");

            expect(result.isOk()).toBe(true);
            if (result.isOk()) {
                expect(result.value.major).toBe(1);
                expect(result.value.minor).toBe(2);
                expect(result.value.patch).toBe(4);
            }
        });
    });

    describe("format", () => {
        it("should format version without prefix", () => {
            const version = { major: 1, minor: 2, patch: 3 };
            const formatted = versionService.format(version, { includePrefix: false });

            expect(formatted).toBe("1.2.3");
        });

        it("should format version with v prefix", () => {
            const version = { major: 1, minor: 2, patch: 3 };
            const formatted = versionService.format(version, { includePrefix: true });

            expect(formatted).toBe("v1.2.3");
        });

        it("should format version with prerelease", () => {
            const version = { major: 1, minor: 2, patch: 3, prerelease: "beta.1" };
            const formatted = versionService.format(version);

            expect(formatted).toBe("1.2.3-beta.1");
        });
    });

    describe("compare", () => {
        it("should return 1 when first version is greater", () => {
            const v1 = { major: 2, minor: 0, patch: 0 };
            const v2 = { major: 1, minor: 9, patch: 9 };

            expect(versionService.compare(v1, v2)).toBe(1);
        });

        it("should return -1 when first version is less", () => {
            const v1 = { major: 1, minor: 0, patch: 0 };
            const v2 = { major: 1, minor: 0, patch: 1 };

            expect(versionService.compare(v1, v2)).toBe(-1);
        });

        it("should return 0 when versions are equal", () => {
            const v1 = { major: 1, minor: 2, patch: 3 };
            const v2 = { major: 1, minor: 2, patch: 3 };

            expect(versionService.compare(v1, v2)).toBe(0);
        });
    });
});
