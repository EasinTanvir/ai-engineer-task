import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

let escalationTableReady;

export function ensureEscalationsTable() {
  if (!escalationTableReady) {
    escalationTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS escalations (
        id serial PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        ticket_or_order_id text NOT NULL,
        reason text NOT NULL,
        status text NOT NULL,
        created_at timestamptz NOT NULL
      )
    `).then(() => pool.query(
      "CREATE INDEX IF NOT EXISTS escalations_account_id_idx ON escalations(account_id)",
    ));
  }
  return escalationTableReady;
}
