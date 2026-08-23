import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { runSupportAgent } from "../../../../lib/agent.js";
import { startConversationTurn } from "../../../../lib/pending-actions.js";

export const runtime = "nodejs";

export async function POST(request) {
  const { message, history = [] } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "message must be a non-empty string." },
      { status: 400 },
    );
  }
  const cookieStore = await cookies();
  const accountId = cookieStore.get("parcelpilot_account_id")?.value;
  const sessionId = cookieStore.get("parcelpilot_session_id")?.value;
  if (!accountId || !sessionId) {
    return NextResponse.json(
      { error: "Choose an account before starting a chat." },
      { status: 401 },
    );
  }
  const { turn, confirmedToken } = startConversationTurn(sessionId, message);
  try {
    const result = await runSupportAgent({
      accountId,
      sessionId,
      turn,
      confirmedToken,
      message,
      history,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat request failed", error);
    return NextResponse.json(
      {
        error:
          "GROQ API key limit reached the support agent could not complete this request or .",
      },
      { status: 500 },
    );
  }
}
