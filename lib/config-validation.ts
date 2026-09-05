/**
 * Startup Configuration Validation
 *
 * Validates all required secrets and configuration are present before the app runs.
 * Fails closed: missing required secrets prevent server startup.
 *
 * Exit criteria for Security Foundation:
 * - Required JWT_SECRET is present (no fallback allowed)
 * - Database connection is configured
 * - OAuth credentials are present
 * - CRON_SECRET is present (prevents unauthorized scheduled job triggers)
 * - PayFast credentials are configured (if payment enabled)
 * - Production requires secure environment settings
 */

const REQUIRED_SECRETS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "CRON_SECRET",
];

const REQUIRED_OAUTH = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "META_CLIENT_ID",
  "META_CLIENT_SECRET",
  "META_REDIRECT_URI",
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
  "TIKTOK_REDIRECT_URI",
];

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
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check secrets
  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret];
    if (!value || value.trim() === "") {
      errors.push(`Missing required environment variable: ${secret}`);
    }
  }

  // Check OAuth
  for (const oauth of REQUIRED_OAUTH) {
    const value = process.env[oauth];
    if (!value || value.trim() === "") {
      errors.push(`Missing required OAuth variable: ${oauth}`);
    }
  }

  // Check upload
  for (const upload of REQUIRED_UPLOAD) {
    const value = process.env[upload];
    if (!value || value.trim() === "") {
      warnings.push(`Missing optional upload variable: ${upload}`);
    }
  }

  // Check payment
  for (const payment of REQUIRED_PAYMENT) {
    const value = process.env[payment];
    if (!value || value.trim() === "") {
      warnings.push(`Missing optional payment variable: ${payment}`);
    }
  }

  // Production-specific checks
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

export function assertConfigValid(): void {
  const validation = validateConfig();

  if (validation.warnings.length > 0) {
    console.warn("⚠️  Configuration warnings:");
    validation.warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (!validation.valid) {
    console.error("❌ Configuration validation failed:");
    validation.errors.forEach((e) => console.error(`   - ${e}`));
    throw new Error(
      "Critical configuration missing. See errors above. " +
        "Update .env and ensure all required variables are set."
    );
  }

  console.log("✅ Configuration validation passed");
}
