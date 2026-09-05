import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    buildSignature,
    toQueryString,
    getPayfastProcessUrl,
    getPayfastValidateUrl,
    validatePayfastItn,
    getPayfastConfig,
} from "@/lib/payfast";

// ──────────────────────────────────────────────────────────────────────────────
describe("getPayfastConfig", () => {
    it("reads environment variables", () => {
        process.env.PAYFAST_MERCHANT_ID = "10000100";
        process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";
        process.env.PAYFAST_PASSPHRASE = "jt7NOE43FZPn";
        process.env.PAYFAST_ENV = "sandbox";

        const config = getPayfastConfig();
        expect(config.merchantId).toBe("10000100");
        expect(config.merchantKey).toBe("46f0cd694581a");
        expect(config.passphrase).toBe("jt7NOE43FZPn");
        expect(config.sandbox).toBe(true);
    });

    it("sets sandbox=false when PAYFAST_ENV=live", () => {
        process.env.PAYFAST_ENV = "live";
        const config = getPayfastConfig();
        expect(config.sandbox).toBe(false);
        process.env.PAYFAST_ENV = "sandbox";
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("getPayfastProcessUrl / getPayfastValidateUrl", () => {
    it("returns sandbox URLs when sandbox=true", () => {
        expect(getPayfastProcessUrl(true)).toContain("sandbox.payfast");
        expect(getPayfastValidateUrl(true)).toContain("sandbox.payfast");
    });

    it("returns live URLs when sandbox=false", () => {
        expect(getPayfastProcessUrl(false)).toContain("www.payfast.co.za");
        expect(getPayfastValidateUrl(false)).toContain("www.payfast.co.za");
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("toQueryString", () => {
    it("sorts keys and encodes values", () => {
        const result = toQueryString({ b: "2", a: "1" });
        expect(result).toBe("a=1&b=2");
    });

    it("percent-encodes special characters, replacing spaces with +", () => {
        const result = toQueryString({ name: "John Doe" });
        expect(result).toBe("name=John+Doe");
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("buildSignature", () => {
    it("generates a consistent MD5 hex string", () => {
        const params = { merchant_id: "10000100", amount: "100.00" };
        const sig = buildSignature(params);
        expect(sig).toMatch(/^[0-9a-f]{32}$/);
    });

    it("includes passphrase when provided", () => {
        const params = { merchant_id: "10000100", amount: "100.00" };
        const withoutPhrase = buildSignature(params);
        const withPhrase = buildSignature(params, "jt7NOE43FZPn");
        expect(withoutPhrase).not.toBe(withPhrase);
    });

    it("produces the same signature for the same input", () => {
        const params = { merchant_id: "10000100", amount: "100.00" };
        expect(buildSignature(params, "test")).toBe(buildSignature(params, "test"));
    });

    it("sorts params before hashing (order independence)", () => {
        const a = buildSignature({ b: "2", a: "1" });
        const b = buildSignature({ a: "1", b: "2" });
        expect(a).toBe(b);
    });
});

// ──────────────────────────────────────────────────────────────────────────────
describe("validatePayfastItn", () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const config = {
        merchantId: "10000100",
        merchantKey: "46f0cd694581a",
        passphrase: "jt7NOE43FZPn",
        sandbox: true,
    };

    function buildBody(params: Record<string, string>, sig?: string) {
        const body = new URLSearchParams(params);
        body.set("signature", sig ?? buildSignature(params, config.passphrase));
        return body.toString();
    }

    it("returns ok=true when signature matches and PayFast validates", async () => {
        const params = { merchant_id: "10000100", amount: "99.00", payment_status: "COMPLETE" };
        const body = buildBody(params);

        mockFetch.mockResolvedValueOnce({ text: vi.fn().mockResolvedValue("VALID") });

        const result = await validatePayfastItn(body, buildSignature(params, config.passphrase), config);
        expect(result.ok).toBe(true);
    });

    it("returns ok=false for an invalid signature", async () => {
        const params = { merchant_id: "10000100", amount: "99.00" };
        const body = buildBody(params, "wrong-sig");

        const result = await validatePayfastItn(body, "wrong-sig", config);
        expect(result.ok).toBe(false);
        expect((result as { reason: string }).reason).toContain("Invalid signature");
    });

    it("returns ok=false when PayFast responds with INVALID", async () => {
        const params = { merchant_id: "10000100", amount: "99.00" };
        const sig = buildSignature(params, config.passphrase);
        const body = buildBody(params, sig);

        mockFetch.mockResolvedValueOnce({ text: vi.fn().mockResolvedValue("INVALID") });

        const result = await validatePayfastItn(body, sig, config);
        expect(result.ok).toBe(false);
    });
});
