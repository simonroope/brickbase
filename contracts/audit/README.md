# Slither audit

Static analysis of production Solidity (`contracts/core`, `contracts/periphery`, `contracts/interfaces`) using [Slither](https://github.com/crytic/slither). Mocks, Foundry tests, and `node_modules` are filtered out.

The analyzer lives in `contracts/audit/.venv` (gitignored). The first `contracts:audit` run creates that venv from `requirements.txt` using Python 3.10+. Nothing is read from `PATH` or Homebrew.

## Run

From the repository root:

```bash
npx nx run contracts:audit
# or
npm run contracts:audit
```

Writes:

| File | Contents |
|------|----------|
| `slither.md` | Human-readable checklist |
| `slither-report.json` | Machine-readable findings |

The command fails if Slither reports a **high** finding (`--fail-high`).
