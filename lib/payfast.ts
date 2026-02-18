import crypto from "crypto";

export type PayfastConfig = {
    merchantId: string | undefined;
    merchantKey: string | undefined;
    passphrase: string | undefined;
    sandbox: boolean;
};

function pfEncode(value: string) {
    return encodeURIComponent(value).replace(/%20/g, "+");
}

export function getPayfastConfig(): PayfastConfig {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const sandbox = (process.env.PAYFAST_ENV || "sandbox").toLowerCase() !== "live";

    if (!merchantId || !merchantKey) {
        console.warn("PAYFAST_MERCHANT_ID or PAYFAST_MERCHANT_KEY is not set — PayFast calls will fail at runtime.");
    }

    return { merchantId, merchantKey, passphrase, sandbox };
}

export function getPayfastProcessUrl(sandbox: boolean) {
    return sandbox
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process";
}

export function getPayfastValidateUrl(sandbox: boolean) {
    return sandbox
        ? "https://sandbox.payfast.co.za/eng/query/validate"
        : "https://www.payfast.co.za/eng/query/validate";
}

export function buildSignature(params: Record<string, string>, passphrase?: string) {
    const keys = Object.keys(params).sort();
    const paramString = keys
        .map((key) => `${key}=${pfEncode(params[key] ?? "")}`)
        .join("&");
    const toSign = passphrase
        ? `${paramString}&passphrase=${pfEncode(passphrase)}`
        : paramString;

    return crypto.createHash("md5").update(toSign).digest("hex");
}

export function toQueryString(params: Record<string, string>) {
    const keys = Object.keys(params).sort();
    return keys.map((key) => `${key}=${pfEncode(params[key] ?? "")}`).join("&");
}

export async function validatePayfastItn(
    body: string,
    signature: string,
    config: PayfastConfig
) {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(body);
    for (const [key, value] of searchParams.entries()) {
        if (key === "signature") continue;
        params[key] = value;
    }

    const expected = buildSignature(params, config.passphrase);
    if (expected !== signature) {
        return { ok: false as const, reason: "Invalid signature", params };
    }

    const validateUrl = getPayfastValidateUrl(config.sandbox);
    const response = await fetch(validateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    const result = await response.text();
    if (result.trim() !== "VALID") {
        return { ok: false as const, reason: `PayFast validation failed: ${result}`, params };
    }

    return { ok: true as const, params };
}
