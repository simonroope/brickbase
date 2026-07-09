# Brickbase Coding Standards

Reference file consumed by the `code-review` skill. Organised by layer.

---

## General

- TypeScript everywhere — no `.js` source files in `apps/` or `libs/`.
- No `any` unless wrapping a third-party contract type that cannot be typed (Hardhat signer/factory); use a comment explaining why.
- No `console.log` in production paths — use structured logging or remove before merging.
- No commented-out code — delete it; git history is the record.
- Comments explain *why*, never *what* the code does. Obvious narration (`// increment counter`) is a violation.

---

## Imports and paths

- Use tsconfig path aliases, never relative `../../` traversals across package boundaries.
  - `@brickbase/abi` — contract ABIs in `apps/web` and `apps/mcp`
  - `@brickbase/events-types` — shared event types
  - `@brickbase/shared-config` — chain config and RPC helpers
  - `@/*` — within `apps/web/src`
- No per-lib `package.json` unless the lib is published to a registry.

---

## Environment variables

- Contract addresses use canonical names (`ASSET_VAULT_ADDRESS`, `ASSET_SHARES_ADDRESS`, etc.) — no `NEXT_PUBLIC_` prefix anywhere.
- `ETHEREUM_RPC_URL` is always the base URL ending with `/`; `INFURA_PROJECT_ID` is appended at runtime — never hardcode the joined URL.
- All env vars baked into the browser bundle go through the `env` block in `next.config.ts`, not `NEXT_PUBLIC_` prefixes.
- Never commit secrets or real addresses to source; use `.env.example` for documentation.

---

## Next.js (`apps/web`)

- App Router only — no `pages/` directory.
- Dynamic API routes must export `export const dynamic = "force-dynamic"`.
- Server Components by default; add `"use client"` only when the component uses browser APIs or React state/effects.
- Component files are PascalCase (`AssetDetail.tsx`); hooks are `use`-prefixed camelCase (`useWallet.ts`).
- No inline styles — use Tailwind utility classes.
- wagmi hooks (`useReadContract`, `useWriteContract`) are the only approved way to interact with contracts from the UI — never call `ethers` directly from a component.

---

## MCP server (`apps/mcp`)

- MCP returns unsigned transaction payloads — it never holds or signs with a private key.
- Runtime is `tsx` — no compile step, no `dist/` output committed.

---

## Events layer (`apps/events`)

- `ingest` reads from upstream (Infura WS, Coinbase WS) and writes to Redis only — it does not read from contracts.
- `gateway` reads from Redis and writes to the browser WebSocket only — no upstream reads.
- Runtime is `tsx` for both services.

---

## Smart contracts (`libs/contracts`)

- Solidity `^0.8.x` — specify the exact minimum version in each file's pragma.
- All public state-changing functions that affect user balances or roles must emit an event.
- Access control via OpenZeppelin `AccessControl` — use named roles (`ASSET_MANAGER_ROLE` etc.), not `Ownable`.
- Custom errors preferred over `require` string literals — smaller bytecode, better DX.
- `AssetUserAllowList` is the single allowlist gate — do not duplicate allowlist logic in other contracts.
- Never store user funds in a contract unless it is the designated settlement contract; use `transferFrom` pull patterns.
- Test files: Hardhat + Chai, one `describe` per contract, one `it` per behaviour. Deploy the full contract graph in `beforeEach`; never reuse state across tests.

---

## Testing

- Unit tests (`Jest` + `@testing-library/react`) live in `__tests__/` next to the code under test.
- Test files: `*.test.ts` / `*.test.tsx`.
- Contract tests: `*.t.ts` under `libs/contracts/tests/unit/`.
- Integration / E2E: Cucumber + Playwright under `apps/web/tests/`.
- See `.claude/skills/tdd/tests.md` for good/bad test patterns.
- See `.claude/skills/tdd/mocking.md` for mocking rules.
- No test should assert on implementation details (internal call counts, storage slots, private method state).
- Expected values in assertions must be independent literals — never recompute them the same way the code does.

---

## Nx targets

| Target            | Command                    |
|-------------------|----------------------------|
| Build web         | `nx run web:build`         |
| Compile contracts | `nx run contracts:compile` |
| Serve MCP         | `nx run mcp:serve`         |
| Run ingest        | `nx run events:ingest`     |
| Run gateway       | `nx run events:gateway`    |
| Test web          | `nx run web:test`          |
