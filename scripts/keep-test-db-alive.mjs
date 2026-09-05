import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("E2E_DATABASE_URL is required for the test database keep-alive check.");
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  await pool.query("SELECT 1");
  console.log("Test database keep-alive check succeeded.");
} finally {
  await pool.end();
}
