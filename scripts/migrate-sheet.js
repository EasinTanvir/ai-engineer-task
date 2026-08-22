import { resolve } from "node:path";

import { count } from "drizzle-orm";
import XLSX from "xlsx";

import { accounts, orders, tickets } from "../db/schema.js";
import { closeDatabase, db, ensureSchema } from "./db.js";

const workbookPath = resolve(process.cwd(), "excelSheet", "ParcelPilot_Assessment_Data.xlsx");
const indiaOffset = "+05:30";

function rowsFor(sheetName) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: false });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing ${sheetName} worksheet in ${workbookPath}.`);
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
}

function required(row, key) {
  const value = row[key];
  if (value === null || value === "") throw new Error(`Missing required ${key} value in workbook.`);
  return value;
}

function optional(row, key) {
  return row[key] || null;
}

function asBoolean(value) {
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  throw new Error(`Expected TRUE or FALSE, received ${value}.`);
}

function asTimestamp(value) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const timestamp = new Date(`${normalized}${indiaOffset}`);
  if (Number.isNaN(timestamp.getTime())) throw new Error(`Invalid workbook timestamp: ${value}`);
  return timestamp;
}

async function migrateSheet() {
  await ensureSchema();
  const accountRows = rowsFor("accounts");
  const orderRows = rowsFor("orders");
  const ticketRows = rowsFor("tickets");

  await db.transaction(async (tx) => {
    await tx.delete(tickets);
    await tx.delete(orders);
    await tx.delete(accounts);
    await tx.insert(accounts).values(accountRows.map((row) => ({
      accountId: required(row, "account_id"), accountName: required(row, "account_name"),
      plan: required(row, "plan"), status: required(row, "status"), csm: required(row, "csm"),
      contractFile: optional(row, "contract_file"), premiumSupport: asBoolean(required(row, "premium_support")),
      notes: required(row, "notes"),
    })));
    await tx.insert(orders).values(orderRows.map((row) => ({
      orderId: required(row, "order_id"), accountId: required(row, "account_id"),
      carrier: required(row, "carrier"), status: required(row, "status"),
      bookedAt: asTimestamp(required(row, "booked_at")),
      pickupWindowStart: asTimestamp(required(row, "pickup_window_start")),
      pickupWindowEnd: asTimestamp(required(row, "pickup_window_end")),
      pickupActualAt: optional(row, "pickup_actual_at") ? asTimestamp(required(row, "pickup_actual_at")) : null,
      shipmentFeeInr: Number(required(row, "shipment_fee_inr")),
      carrierFault: asBoolean(required(row, "carrier_fault")),
      customerFault: asBoolean(required(row, "customer_fault")),
      cancellationRequestedAt: optional(row, "cancellation_requested_at") ? asTimestamp(required(row, "cancellation_requested_at")) : null,
      notes: required(row, "notes"),
    })));
    await tx.insert(tickets).values(ticketRows.map((row) => ({
      ticketId: required(row, "ticket_id"), accountId: required(row, "account_id"),
      createdAt: asTimestamp(required(row, "created_at")), status: required(row, "status"),
      subject: required(row, "subject"), description: required(row, "description"),
      channel: required(row, "channel"), assignedTo: required(row, "assigned_to"),
      lastCustomerMessageAt: asTimestamp(required(row, "last_customer_message_at")),
      historicalResolution: optional(row, "historical_resolution"),
    })));
  });

  const [accountCount, orderCount, ticketCount] = await Promise.all([
    db.select({ value: count() }).from(accounts), db.select({ value: count() }).from(orders),
    db.select({ value: count() }).from(tickets),
  ]);
  console.log(`Migrated accounts=${accountCount[0].value}, orders=${orderCount[0].value}, tickets=${ticketCount[0].value}`);
}

migrateSheet().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(closeDatabase);
