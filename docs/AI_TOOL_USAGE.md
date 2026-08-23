# AI Tool Usage

I used AI tools as part of the development process, but kept the overall direction, architecture, and implementation decisions under my control.

**Claude (web, free version)** — used primarily as a planning and decision-making partner. I used it to explore architectural approaches, reason through trade-offs, review requirements, and validate decisions before implementation. This included thinking through how to combine RAG with structured-data tools, enforce account-level access control, handle action confirmation safely, and prioritize source authority when different documents contain conflicting information.

**Codex with agent skills** — used primarily for implementation. I provided the project requirements, architecture decisions, constraints, and staged instructions, and used Codex to implement those decisions with the relevant agent skills. I reviewed the generated implementation rather than accepting it blindly, and made the final decisions about whether an approach was correct, what needed to be changed, and what should ultimately ship.

AI was therefore used as an accelerator for planning, implementation, and review — not as an autonomous decision-maker. I did not blindly accept AI-generated code or architectural suggestions. The main direction of the system, architectural choices, trade-offs, testing approach, and decisions about what to implement were determined by me, with AI serving as a tool to help explore, execute, and validate those decisions.
