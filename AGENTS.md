# AGENTS.md

## Agent skills

### Skill commands

Skills live in `.agents/skills/`. To run a skill, read the corresponding `SKILL.md` and follow its instructions:

```
.agents/skills/
  domain-modeling/SKILL.md
  grill-me/SKILL.md
  grill-with-docs/SKILL.md
  grilling/SKILL.md
  handoff/SKILL.md
  improve-codebase-architecture/SKILL.md
  tdd/SKILL.md
  to-issues/SKILL.md
  to-prd/SKILL.md
```

Invoke a skill using the `$` prefix:

```
$handoff
$tdd
$domain-modeling
```

### Issue tracker

Issues are tracked in GitHub Issues (repo `simonroope/brickbase`) via the `gh` CLI. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context (monorepo) — `CONTEXT-MAP.md` at the repo root points to per-context `CONTEXT.md` files under each `apps/*` and `libs/*`. See `docs/agents/domain.md`.
