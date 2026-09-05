/**
 * OAuth State Management
 *
 * Manages CSRF protection for OAuth flows using state parameters.
 * 
 * Flow:
 * 1. Client initiates OAuth connection -> Generate random state + store in session
 * 2. OAuth provider redirects back -> Verify state matches stored value
 * 3. Invalid state = potential CSRF attack -> Reject
 *
 * Exit criteria: state-bound callbacks prevent CSRF, unauthorized state values are rejected.
 */

import crypto from "crypto";
import { cookies } from "next/headers";

const STATE_COOKIE_NAME = "oauth_state";
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface StoredState {
  value: string;
  provider: string;
  userId?: string;
  createdAt: number;
}

/**
 * Generates a new CSRF state token and stores it in a secure cookie.
 * State is bound to the initiating user (if authenticated) and the specific provider.
 */
export async function generateOAuthState(
  provider: string,
  userId?: string
): Promise<string> {
  const state = crypto.randomBytes(32).toString("hex");

  const stateData: StoredState = {
    value: state,
    provider,
    userId,
    createdAt: Date.now(),
  };

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, JSON.stringify(stateData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_EXPIRY_MS / 1000, // Convert to seconds
    path: "/",
  });

  return state;
}

/**
 * Validates that the returned OAuth state matches what we stored.
 * Returns the stored state data if valid, null if:
 * - State doesn't match
 * - State has expired
 * - State cookie not found
 * - State is bound to a different user than currently authenticated
 */
export async function validateOAuthState(
  returnedState: string,
  provider: string,
  currentUserId?: string
): Promise<StoredState | null> {
  const cookieStore = await cookies();
  const storedStateJson = cookieStore.get(STATE_COOKIE_NAME)?.value;

  if (!storedStateJson) {
    console.warn(`[SECURITY] OAuth state validation failed: no stored state for ${provider}`);
    return null;
  }

  try {
    const storedState: StoredState = JSON.parse(storedStateJson);

    // Verify state value matches
    if (storedState.value !== returnedState) {
      console.warn(
        `[SECURITY] OAuth state mismatch for ${provider}: expected ${storedState.value}, got ${returnedState}`
      );
      return null;
    }

    // Verify provider matches
    if (storedState.provider !== provider) {
      console.warn(
        `[SECURITY] OAuth provider mismatch: state bound to ${storedState.provider}, callback from ${provider}`
      );
      return null;
    }

    // Verify state hasn't expired
    if (Date.now() - storedState.createdAt > STATE_EXPIRY_MS) {
      console.warn(`[SECURITY] OAuth state expired for ${provider}`);
      return null;
    }

    // If state was bound to a specific user, verify it matches current user
    if (storedState.userId && storedState.userId !== currentUserId) {
      console.warn(
        `[SECURITY] OAuth state user mismatch for ${provider}: bound to ${storedState.userId}, current ${currentUserId}`
      );
      return null;
    }

    // Clear state cookie after validation (prevent replay)
    cookieStore.delete(STATE_COOKIE_NAME);

    return storedState;
  } catch (error) {
    console.error(`[SECURITY] Failed to parse stored OAuth state: ${error}`);
    return null;
  }
}

/**
 * Clears the stored OAuth state (called on error or after validation).
 */
export async function clearOAuthState(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STATE_COOKIE_NAME);
}
