import { NextResponse } from "next/server";

import { detectProactiveIssues } from "../../../../../lib/proactive-detection.js";

export const runtime = "nodejs";

export async function GET(request) {
  if (request.headers.get("x-parcelpilot-role") !== "internal") {
    return NextResponse.json(
      { error: "Internal role required." },
      { status: 403 },
    );
  }
  try {
    return NextResponse.json(await detectProactiveIssues());
  } catch (error) {
    console.error("Proactive detection failed", error);
    return NextResponse.json(
      { error: "Could not run proactive detection." },
      { status: 500 },
    );
  }
}
