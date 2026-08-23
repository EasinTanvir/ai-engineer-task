# Product Note

## Chosen Additional Problem: Proactive Issue Detection

I built an internal-only view, separate from the customer-facing chat and its account scoping, that surfaces issues without waiting for a question to be asked. It flags:

- Open tickets approaching or exceeding their applicable SLA target (target pulled per-account, honoring any contract override)
- Tickets whose symptoms match a known product issue already documented internally, rather than treating them as unexplained
- Unusual order-level patterns (carrier-fault clustering, blocked/undelivered orders)
- Cross-account signals, since this view is intentionally not scoped to a single customer the way the chat is

**Honest limitation:** the source data is a single point-in-time snapshot with no ticket-volume history, so true "sudden increase in complaints" trend detection isn't meaningfully possible from this dataset — there's nothing to compare a spike against. The detection logic itself isn't scoped to prevent finding cross-account patterns; the current dataset (7 tickets across 4 accounts) simply doesn't contain one. Given real historical volume data, the same architecture extends naturally to trend detection.

## What I'd Build Next, Prioritized

1. **Confidence-aware escalation.** Right now the agent escalates on explicit request or clear policy triggers (e.g. an unknown fault field). The next step is a general confidence signal — when retrieved sources are thin, conflicting, or the question falls outside anything in the source pack — that proactively suggests escalation rather than answering with unwarranted certainty. This directly compounds the trust problem the assessment raises.
2. **Real ticketing/CRM integration** in place of the mocked action tool, so escalations actually land somewhere a human works from.
3. **Trend-based detection** for the proactive view, once real historical volume data exists, to actually catch "sudden increase" patterns rather than only point-in-time breaches.
4. **A feedback loop** — letting a human operator mark an agent answer as correct/incorrect, feeding that back into which sources or reasoning patterns need attention. This is the direct antidote to the "confidently incorrect answer erodes trust" risk named in the brief.

## What I Intentionally Left Out

- Real authentication (session/JWT-based) — used mocked account selection and a mocked internal-role header instead, appropriate for the assessment's scope but explicitly not production-ready.
- UI polish beyond functional clarity — prioritized correct agent behavior and access control over visual design, given the assessment's own stated priority order.
- Automated test suite — verification was done via a structured manual test script against real records from the source pack rather than a CI-integrated test framework, to keep scope tight within the assessment window.
- Business-hours-aware SLA math — SLA elapsed time is calculated in calendar hours rather than accounting for business-hour/weekend definitions per plan; a reasonable simplification given the size of the source pack, but worth noting explicitly rather than silently.

## Success Metric

**First-contact resolution accuracy**: the percentage of customer questions the agent answers directly and correctly (citing the right authoritative source, applying the right account-specific override) without requiring a human correction or escalation. This is the one number that captures both halves of what ParcelPilot actually asked for — usefulness (answering without human involvement) and trust (being _correct_ when it does) — rather than optimizing for one at the expense of the other.
