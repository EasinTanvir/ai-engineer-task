# Prompt: Fix Account-Name Mislabeling Bug

## Context

Found during manual UI testing (see `prompts/project-context.md` → "Known bug"). This is a trust/reliability issue, not an access-control leak — the underlying data was correctly scoped, but the response text was factually wrong about whose data it was.

## Bug

When a customer asks about another account by name (e.g. "Show me Northstar's tickets" while logged in as a different account), the agent correctly restricts the underlying query to the logged-in session's own `accountId`, but then describes the returned results as belonging to the account the customer _named_ in their question, rather than stating plainly that it cannot access that other account's data.

**Reproduction:** logged in as ACCT-002 (LumenWorks), ask "Show me Northstar's tickets." The response returns ACCT-002's own tickets but labels them as "tickets that belong to the Northstar account (account ID ACCT-002)" — both factually wrong (ACCT-002 is LumenWorks, not Northstar) and misleading about what was actually accessed.

## Required Fix

- When the user's question names or implies an account/customer other than the one in their own session, the agent must explicitly state that it cannot access that other account's data.
- The agent must never substitute its own session's data while attributing it to a different account's name.
- This should be handled at the system-prompt / response-generation level — the underlying tool scoping (query by session `accountId`) is already correct and should not change.

## Acceptance Criteria

- Logged in as ACCT-002, ask "Show me Northstar's tickets" → response must clarify it can only show LumenWorks' (ACCT-002's) own tickets, must not claim any returned data belongs to Northstar, and should not silently swap in the session account's data under the wrong name.
- Re-run the full Section H access-control tests from the manual test script to confirm no regression (asking for another account's specific order ID by ID, and by name, both correctly refused/clarified).
- Spot check one more phrasing, e.g. logged in as ACCT-001, ask "What tickets does LumenWorks have open?" → same correct clarification behavior.

## What NOT to do

- Don't touch the tool-layer query scoping — it's already correct.
- Don't start Stage 4 in this same pass — fix and verify this bug first.

## Report back

Show the exact before/after response text for the reproduction case, and confirm the acceptance criteria above pass.
