/**
 * Application Initialization
 *
 * This module runs on application startup and performs critical validation.
 * Called from the root layout to ensure startup checks run before any requests.
 */

import { assertCoreConfigValid } from "./config-validation";

/**
 * Validates application configuration on startup.
 * Fails closed if critical secrets are missing.
 *
 * This function should be called exactly once during app initialization.
 */
export function validateAppStartup(): void {
  if (typeof window === "undefined") {
    // Server-side only: validate configuration
    assertCoreConfigValid();
  }
}
