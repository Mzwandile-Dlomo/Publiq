import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────────────────────────────────────
// lib/auth.ts tests
// ──────────────────────────────────────────────────────────────────────────────

// Must mock next/headers before importing auth
const { mockCookieStore } = vi.hoisted(() => ({
    mockCookieStore: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { hashPassword, verifyPassword, createSession, verifySession, deleteSession } from "@/lib/auth";

describe("auth – password hashing", () => {
    it("hashes a password and verifies it", async () => {
        const hash = await hashPassword("secret123");
        expect(hash).not.toBe("secret123");
        expect(await verifyPassword("secret123", hash)).toBe(true);
    });

    it("rejects a wrong password", async () => {
        const hash = await hashPassword("correct");
        expect(await verifyPassword("wrong", hash)).toBe(false);
    });
});

describe("auth – sessions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createSession sets a cookie and returns a JWT string", async () => {
        mockCookieStore.set.mockImplementation(() => {});
        const token = await createSession("user-abc");
        expect(typeof token).toBe("string");
        expect(token.split(".")).toHaveLength(3); // valid JWT format
        expect(mockCookieStore.set).toHaveBeenCalledWith(
            "session",
            token,
            expect.objectContaining({ httpOnly: true })
        );
    });

    it("verifySession returns payload for a valid session cookie", async () => {
        const token = await createSession("user-abc");
        mockCookieStore.get.mockReturnValue({ value: token });

        const payload = await verifySession();
        expect(payload).not.toBeNull();
        expect(payload?.userId).toBe("user-abc");
    });

    it("verifySession returns null when no cookie is present", async () => {
        mockCookieStore.get.mockReturnValue(undefined);
        const payload = await verifySession();
        expect(payload).toBeNull();
    });

    it("verifySession returns null for a tampered/invalid token", async () => {
        mockCookieStore.get.mockReturnValue({ value: "invalid.jwt.token" });
        const payload = await verifySession();
        expect(payload).toBeNull();
    });

    it("deleteSession calls cookie delete", async () => {
        mockCookieStore.delete.mockImplementation(() => {});
        await deleteSession();
        expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
    });
});
