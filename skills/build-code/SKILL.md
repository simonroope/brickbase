---
name: build-code
description: "build a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Before starting:

1. Read `docs/agents/process.md` — it defines the conditions under which implementation begins and what "done" means.
2. Scan `docs/adr/` and the relevant `<context>/docs/adr/` for existing ADRs. Treat `accepted` ADRs as hard constraints. If the spec conflicts with an accepted ADR, surface the conflict to the user before proceeding.
3. Read `docs/agents/coding-standards.md` for the standards the code must meet.

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
