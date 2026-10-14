---
name: ship
description: Runs lint, build and tests on the current project, and if every step passes, stages the changes and creates a git commit. Use when the user says "ship", "ship it", "/ship", "lint, build, test and commit", or asks to verify and commit their work in one go. Never pushes.
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(npm run lint), Bash(npm run build), Bash(npm run test)
---

# Ship

Verify the project, then commit. Run lint, build and tests in that order. Commit only if all three pass. Do not push.

## 1. Preflight

- Run `git status --short` and `git branch --show-current`.
- If this is not a git repository, or there is nothing to commit, say so and stop.
- If the branch is `main` or `master`, tell the user and ask before continuing.

## 2. Find the commands

Prefer commands the project documents itself (CLAUDE.md, README, `package.json` scripts, Makefile, justfile). Otherwise detect by project type:

| Project | Lint | Build | Test |
|---|---|---|---|
| Node/TypeScript | `npm run lint` | `npm run build` | `npm run test` |
| Rust | `cargo clippy --all-targets -- -D warnings` | `cargo build` | `cargo test` |
| Foundry (Solidity) | `forge fmt --check` | `forge build` | `forge test` |

Package manager is **npm**. Use `npm run …` only — never pnpm, yarn, or bun. Rust clippy in this repo is invoked via `npm run lint` / `npm run api:lint` / `npm run events:ingest:lint`, not raw `cargo clippy`.

A project can match more than one row (for example Rust plus Foundry). Run every row that applies.

If a step has no command, mark it **skipped** and carry on. Never invent a command.

## 3. Run the checks

Run in order: **lint → build → test**. Each step is its own Bash call, exactly:

```bash
npm run lint
npm run build
npm run test
```

Do not redirect to `/tmp`, chain `;`, `|`, `echo $?`, `tail`, or `grep`. Those wrappers are not on the project allow list and will prompt. Use the tool result to decide pass or fail.

- Stop at the first failure.
- On failure, show the key error output (not the full log), say which step failed, and do **not** commit.
- Do not fix failures, auto-fix lint, edit tests, or use flags that skip checks, unless the user asks. Offer to help fix instead.

## 4. Commit (only if all steps passed or were skipped)

1. Review `git status`. Stage the relevant files by name rather than blindly running `git add -A`.
2. Never stage secrets or generated output: `.env*`, keys, `node_modules/`, `target/`, `dist/`, `build/`, `out/`, or large binaries. If an untracked file is ambiguous, ask.
3. Read `git diff --staged` and `git log --oneline -10`. Match the repo's commit style, or use Conventional Commits if there is no clear convention.
4. If the user supplied a message with the command, use it as given. Otherwise write one: imperative subject under 72 characters, with a short body only if the change needs explaining.
5. Run `git commit`. Never use `--no-verify` or `--amend`. If a pre-commit hook fails, report it and stop.

## 5. Report

Finish with a short summary:

```
Lint   ✔ passed
Build  ✔ passed
Test   ✔ passed (or ✖ failed / – skipped)
Commit abc1234 feat: add portfolio dashboard
```

If anything failed, state which step and what to do next. Offer to push, but do not push unprompted.