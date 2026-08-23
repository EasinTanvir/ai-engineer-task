# ParcelPilot Customer Support Agent

An AI support agent for ParcelPilot, a B2B logistics platform. It answers customer questions about orders, cancellations, service credits, and SLAs by reasoning over the company's real policy documents, signed customer agreements, and operational data — while respecting document authority, account access boundaries, and requiring human confirmation before taking any action.

> **Note on the live demo:** it runs on the Groq free-tier API. If you see a "Service notice" modal or responses stop returning, the free tier's rate limit has likely been reached. Either wait a few minutes, or run the project locally with your own `GROQ_API_KEY` (see below).

---

## Documentation

- [Architecture Note](/docs/ARCHITECTURE_NOTE.md) — agent design, tool design, data handling, source reliability, technical trade-offs
- [Product Note](/docs/PRODUCT_NOTE.md) — chosen additional problem, future roadmap, scope cuts, success metric
- [AI Tool Usage](/docs/AI_TOOL_USAGE.md) — which AI tools were used and how

---

## What It Does

- Answers natural-language customer questions using only the supplied document/data pack (6 policy & contract PDFs + 1 operational spreadsheet).
- Correctly applies **source authority** when documents conflict — a customer's signed agreement overrides the general policy, which overrides deprecated documents; historical ticket notes are treated as unreliable context, never as policy truth.
- Performs **multi-step reasoning** — a single answer can require an order lookup, a policy search, and a calculation together.
- **Never takes an action without explicit confirmation** — escalations are drafted first and only created after the user's next message is a clear "yes."
- **Enforces access control at the query layer** — a customer can only ever see their own account's data, regardless of what they ask for.
- Includes a separate **internal-only view** for proactive issue detection (SLA breaches, known-issue matches, cross-account patterns) — the chosen additional client problem.

---

## Tech Stack

- **Next.js** (App Router, JavaScript)
- **LangChain.js** (`createAgent` + tool calling)
- **Groq** (`@langchain/groq`) as the LLM provider
- **Neon Postgres + pgvector** — one database for both structured data and document embeddings
- **Drizzle ORM**
- Local embeddings (`@huggingface/transformers`) — no per-token embedding cost

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Neon Postgres database (or any Postgres instance with the `vector` extension available)
- A [Groq API key](https://console.groq.com) (free tier is sufficient)

### 1. Clone and install

```bash
git clone https://github.com/EasinTanvir/ai-engineer-task
cd ai-engineer-task
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```dotenv
DATABASE_URL=postgresql://neondb_owner:<password>@ep-late-union-aygv23p9-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
GROQ_API_KEY=
```

| Variable       | Required | Notes                                                                                   |
| -------------- | -------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Yes      | Neon (or any Postgres) connection string. Must support the `vector` extension.          |
| `GROQ_API_KEY` | Yes      | From [console.groq.com](https://console.groq.com). Free tier works but is rate-limited. |

### 3. Add the source data

Place the source files in these exact locations (already present in this repo):

```
pdf/          # the 6 supplied PDFs
excelSheet/   # ParcelPilot_Assessment_Data.xlsx
```

### 4. Run the data migration scripts

These load the source data into Postgres. Run in order once before starting the app (all idempotent — safe to re-run):

```bash
npm run migrate:sheet    # accounts, orders, tickets → Postgres tables
npm run migrate:pdfs     # 6 PDFs → chunked, embedded, stored in pgvector
npm run migrate:verify   # confirms row/chunk counts and spot-checks metadata
```

Expect `migrate:sheet` to report 4 accounts, 6 orders, 7 tickets, and `migrate:pdfs` to report chunks across all 6 PDFs. `migrate:verify` re-checks this automatically.

### 5. (Optional) Run the agent test script

```bash
npm run test:agent
```

Runs a set of scripted questions against the live agent to sanity-check retrieval and reasoning outside the chat UI.

### 5. Run in development

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### 6. Run in production

```bash
npm run build
npm start
```

---

## Using the App

On load, choose one of the four mocked accounts (`ACCT-001` Northstar, `ACCT-002` LumenWorks, `ACCT-003` Beacon Retail, `ACCT-004` Axis Labs) to simulate a logged-in customer. Ask questions naturally, e.g.:

- _"Can I cancel ORD-1001 without a cancellation fee?"_
- _"A pickup was three hours late because of carrier fault — am I owed a service credit?"_

The internal proactive-detection view is available separately at `/api/internal/proactive-detection` (requires the mocked internal role — see the Architecture Note for details).

---

## Project Structure

```
pdf/                 # source PDFs
excelSheet/           # source spreadsheet
scripts/             # migration, verification, and manual test scripts (idempotent)
db/                  # Drizzle schema
lib/                 # LLM client, agent, pending-actions (confirmation tokens)
tools/               # LangChain tool definitions
src/                 # Next.js app (chat UI + API routes)
docs/                # architecture note, product note, AI tool usage
prompts/             # staged build specs used during development (for reference)
.agents/             # installed dev-agent skills (development tooling, not app code)
```

---

## Security Note

`.env` contains real credentials and must never be committed. Confirm it's listed in `.gitignore` before pushing. If you're forking or evaluating this repo, copy `.env.example` to `.env` and fill in your own `DATABASE_URL` and `GROQ_API_KEY`.
