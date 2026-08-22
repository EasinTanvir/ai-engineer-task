import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

const accounts = new Set(["ACCT-001", "ACCT-002", "ACCT-003", "ACCT-004"]);

export async function POST(request) {
  const { accountId } = await request.json();
  if (!accounts.has(accountId)) {
    return NextResponse.json({ error: "Choose a valid ParcelPilot account." }, { status: 400 });
  }
  const response = NextResponse.json({ accountId });
  response.cookies.set("parcelpilot_account_id", accountId, { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set("parcelpilot_session_id", randomUUID(), { httpOnly: true, sameSite: "lax", path: "/" });
  return response;
}
