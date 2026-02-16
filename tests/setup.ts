import { vi } from "vitest";

// Mock environment variables
process.env.META_CLIENT_ID = "test-meta-client-id";
process.env.META_CLIENT_SECRET = "test-meta-client-secret";
process.env.META_REDIRECT_URI = "http://localhost:3000/api/auth/facebook/callback";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
