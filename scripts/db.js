import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run a migration.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Without this, an idle client dying unexpectedly (network blip, managed
// Postgres connection timeout, etc.) emits an unhandled 'error' event that
// crashes the whole Node process instead of just logging the failure.
pool.on("error", (error) => {
  console.error("Unexpected error on idle Postgres client:", error.message);
});

export const db = drizzle({ client: pool, schema });

export async function ensureSchema() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(`CREATE TABLE IF NOT EXISTS accounts (
    account_id text PRIMARY KEY, account_name text NOT NULL, plan text NOT NULL,
    status text NOT NULL, csm text NOT NULL, contract_file text,
    premium_support boolean NOT NULL, notes text NOT NULL
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS orders (
    order_id text PRIMARY KEY,
    account_id text NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    carrier text NOT NULL, status text NOT NULL, booked_at timestamptz NOT NULL,
    pickup_window_start timestamptz NOT NULL, pickup_window_end timestamptz NOT NULL,
    pickup_actual_at timestamptz, shipment_fee_inr integer NOT NULL,
    carrier_fault boolean, customer_fault boolean,
    cancellation_requested_at timestamptz, notes text NOT NULL
  )`);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS orders_account_id_idx ON orders(account_id)",
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS tickets (
    ticket_id text PRIMARY KEY,
    account_id text NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL, status text NOT NULL, subject text NOT NULL,
    description text NOT NULL, channel text NOT NULL, assigned_to text NOT NULL,
    last_customer_message_at timestamptz NOT NULL, historical_resolution text
  )`);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS tickets_account_id_idx ON tickets(account_id)",
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS document_chunks (
    id serial PRIMARY KEY, source_file text NOT NULL, chunk_index integer NOT NULL,
    content text NOT NULL, embedding vector(384) NOT NULL, source_type text NOT NULL,
    version_status text NOT NULL, authority_rank integer NOT NULL, account_scope text,
    UNIQUE(source_file, chunk_index)
  )`);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS document_chunks_authority_rank_idx ON document_chunks(authority_rank)",
  );
}

export function closeDatabase() {
  return pool.end();
}
