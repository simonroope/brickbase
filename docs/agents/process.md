# Process

How good code gets written. The Foundations pillar describes what good code looks like; Process covers the disciplines that frame when and why the agent codes at all — before a cycle starts, during the work, and after it ends.

Read this file at the start of any implementation session. It sets the conditions under which coding begins and what "done" means.

---

## Spec First Execution

Implementation does not start until a spec exists. A spec is one of:

- An accepted ADR (architectural directive)
- A GitHub issue with BDD acceptance criteria (produced by `/create-tickets`)
- A PRD section that has been agreed with the user (produced by `/create-prd`)

If none of these exist, run `/elicit-requirements` then `/create-tickets` before touching code. Writing code against a vague description is the fastest way to build the wrong thing. If a spec conflicts with an accepted ADR, surface the conflict and resolve it before starting — see `docs/adr/` and `<context>/docs/adr/`.

---

## Test First Development

Write a failing test before writing implementation code. The test is a proof that the spec has been understood — it forces the spec to be concrete before the implementation is written. A failing test that does not yet have a corresponding implementation is the only valid starting point for a cycle.

See the `tdd` skill (`.claude/skills/tdd/SKILL.md`) for the mechanics of the red → green loop and seam selection.

---

## Definition of Done

A piece of work is done when all of the following are true:

- [ ] All acceptance criteria from the originating issue pass as tests
- [ ] All existing tests continue to pass (`nx run web:test`, `nx run contracts:compile`)
- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] No new linter violations introduced
- [ ] `code-review` has been run and all findings addressed or explicitly accepted
- [ ] The branch has a human review approval before merging

Work that meets some but not all of these is in progress, not done. Do not close an issue or mark a ticket complete until every item is checked.

---

## Continuous Quality Feedback

Run quality checks on every cycle — not only at the end:

- **After each new test file**: run that file in isolation (`jest --testPathPattern=<file>`)
- **After each implementation change**: run the relevant test file and `tsc --noEmit`
- **After completing a feature**: run the full test suite

Errors caught immediately cost minutes to fix. Errors caught at the end cost hours. Never batch up type errors or test failures to fix "at the end" — fix them before moving to the next cycle.

---

## Shift Left Quality

Quality is the agent's responsibility, not CI's. By the time code reaches CI, it must already be clean. The agent is the first gate:

- Linter violations are fixed before committing, not suppressed
- Type errors are fixed before committing, not annotated with `@ts-ignore`
- Failing tests are fixed before committing, not skipped

CI is a safety net for the rare case something was missed — not the primary quality mechanism. A PR that arrives at CI with failures has already failed the process.

---

## Leave It Better Than You Found It

Every file touched in a session should leave the surrounding code in a better state than it was found. This does not mean refactoring everything in sight — it means fixing one small thing that was already wrong:

- A variable with a poor name, renamed
- A magic number, extracted to a named constant
- A missing type annotation, added
- A comment that narrates the code, removed

This is the Boy Scout Rule applied to code. Accumulated small improvements compound over time. Never leave a known violation in place with a `// TODO` comment unless you open a GitHub issue to track it immediately.

---

## Short-lived Branches with AI-human Review

Branches are short-lived: one issue, one branch, one PR. A branch that lives longer than two days is a risk — it accumulates merge conflicts and makes review harder.

Every merge requires two sign-offs:

1. **Agent review** — run `/code-review` against the branch before raising a PR. Address all findings or document why each was accepted.
2. **Human review** — a PR is not merged without a human approval. The human review catches things the agent review cannot: business intent, team conventions not yet in `coding-standards.md`, and judgment calls.

The PR description must reference the originating GitHub issue and confirm that the Definition of Done has been met.
