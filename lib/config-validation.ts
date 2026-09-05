/**
 * Startup Configuration Validation
 *
 * Validates configuration at the boundary where it is needed.
 *
 * Core secrets are checked during startup. Optional integrations are checked by
 * their own API routes so an unused provider cannot prevent the app from building.
 *
 * Exit criteria for Security Foundation:
 * - Required JWT_SECRET is present (no fallback allowed)
 * - Database connection is configured
 * - OAuth credentials are present
 * - CRON_SECRET is present (prevents unauthorized scheduled job triggers)
 * - PayFast credentials are configured (if payment enabled)
 * - Production requires secure environment settings
 */

const REQUIRED_CORE_SECRETS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
];

const REQUIRED_GOOGLE_OAUTH = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];
const REQUIRED_META_OAUTH = ["META_CLIENT_ID", "META_CLIENT_SECRET", "META_REDIRECT_URI"];
const REQUIRED_TIKTOK_OAUTH = ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI"];

const REQUIRED_UPLOAD = ["UPLOADTHING_TOKEN"];

const REQUIRED_PAYMENT = [
  "PAYFAST_MERCHANT_ID",
  "PAYFAST_MERCHANT_KEY",
  "PAYFAST_PASSPHRASE",
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(): ValidationResult {
  const core = validateCoreConfig();
  const google = validateGoogleOAuthConfig();
  const meta = validateMetaOAuthConfig();
  const tiktok = validateTikTokOAuthConfig();
  const warnings = [...core.warnings];

  for (const upload of REQUIRED_UPLOAD) {
    if (!isConfigured(upload)) warnings.push(`Missing optional upload variable: ${upload}`);
  }

  for (const payment of REQUIRED_PAYMENT) {
    if (!isConfigured(payment)) warnings.push(`Missing optional payment variable: ${payment}`);
  }

  return {
    valid: core.valid && google.valid && meta.valid && tiktok.valid,
    errors: [...core.errors, ...google.errors, ...meta.errors, ...tiktok.errors],
    warnings,
  };
}

/** Validate secrets required for the application to start safely. */
export function validateCoreConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const secret of REQUIRED_CORE_SECRETS) {
    if (!isConfigured(secret)) {
      errors.push(`Missing required environment variable: ${secret}`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push("JWT_SECRET in production must be at least 32 characters");
    }

    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
      warnings.push(
        "NEXT_PUBLIC_APP_URL not set in production (consider setting for proper redirects)"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateGoogleOAuthConfig(): ValidationResult {
  return validateIntegrationConfig(REQUIRED_GOOGLE_OAUTH);
}

export function validateMetaOAuthConfig(): ValidationResult {
  return validateIntegrationConfig(REQUIRED_META_OAUTH);
}

export function validateTikTokOAuthConfig(): ValidationResult {
  return validateIntegrationConfig(REQUIRED_TIKTOK_OAUTH);
}

function validateIntegrationConfig(variables: string[]): ValidationResult {
  const errors = variables
    .filter((variable) => !isConfigured(variable))
    .map((variable) => `Missing required OAuth variable: ${variable}`);

  return { valid: errors.length === 0, errors, warnings: [] };
}

function isConfigured(variable: string): boolean {
  return Boolean(process.env[variable]?.trim());
}

export function assertConfigValid(): void {
  const validation = validateConfig();
  assertValidation(validation);
}

/** Assert the startup-only configuration without requiring optional providers. */
export function assertCoreConfigValid(): void {
  assertValidation(validateCoreConfig());
}

export function assertGoogleOAuthConfigValid(): void {
  assertValidation(validateGoogleOAuthConfig());
}

export function assertMetaOAuthConfigValid(): void {
  assertValidation(validateMetaOAuthConfig());
}

export function assertTikTokOAuthConfigValid(): void {
  assertValidation(validateTikTokOAuthConfig());
}

function assertValidation(validation: ValidationResult): void {

  if (validation.warnings.length > 0) {
    console.warn("⚠️  Configuration warnings:");
    validation.warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (!validation.valid) {
    console.error("❌ Configuration validation failed:");
    validation.errors.forEach((e) => console.error(`   - ${e}`));
    throw new Error(
      "Required configuration missing. See errors above and update the deployment environment."
    );
  }
}
