import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  accountId: text("account_id").primaryKey(),
  accountName: text("account_name").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  csm: text("csm").notNull(),
  contractFile: text("contract_file"),
  premiumSupport: boolean("premium_support").notNull(),
  notes: text("notes").notNull(),
});

export const orders = pgTable(
  "orders",
  {
    orderId: text("order_id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.accountId, { onDelete: "cascade" }),
    carrier: text("carrier").notNull(),
    status: text("status").notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    pickupWindowStart: timestamp("pickup_window_start", { withTimezone: true }).notNull(),
    pickupWindowEnd: timestamp("pickup_window_end", { withTimezone: true }).notNull(),
    pickupActualAt: timestamp("pickup_actual_at", { withTimezone: true }),
    shipmentFeeInr: integer("shipment_fee_inr").notNull(),
    carrierFault: boolean("carrier_fault").notNull(),
    customerFault: boolean("customer_fault").notNull(),
    cancellationRequestedAt: timestamp("cancellation_requested_at", { withTimezone: true }),
    notes: text("notes").notNull(),
  },
  (table) => [index("orders_account_id_idx").on(table.accountId)],
);

export const tickets = pgTable(
  "tickets",
  {
    ticketId: text("ticket_id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.accountId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    channel: text("channel").notNull(),
    assignedTo: text("assigned_to").notNull(),
    lastCustomerMessageAt: timestamp("last_customer_message_at", { withTimezone: true }).notNull(),
    historicalResolution: text("historical_resolution"),
  },
  (table) => [index("tickets_account_id_idx").on(table.accountId)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    sourceFile: text("source_file").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    sourceType: text("source_type").notNull(),
    versionStatus: text("version_status").notNull(),
    authorityRank: integer("authority_rank").notNull(),
    accountScope: text("account_scope"),
  },
  (table) => [
    uniqueIndex("document_chunks_source_file_chunk_index_key").on(table.sourceFile, table.chunkIndex),
    index("document_chunks_authority_rank_idx").on(table.authorityRank),
  ],
);
