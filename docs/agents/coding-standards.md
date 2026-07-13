# Brickbase Coding Standards

Reference file consumed by the `code-review` and `tdd` skills. Organised by pillar then layer.

---

## Foundations

What good code looks like before the framework gets a vote. Each line is a UI for the next reader — human or agent.

### Single Responsibility Principle

Every module, function, and component does one thing. If you need "and" to describe what it does, split it. A React component either fetches data or renders it — not both. A contract function either validates or mutates state — not both.

### Intention-revealing names

Names are the primary documentation. A name that requires a comment to explain it is a name that needs changing. Prefer `purchaseShares` over `doTx`, `allowlistedAddresses` over `list`, `formatUsdc` over `fmt`. In Solidity, use the domain vocabulary from `CONTEXT.md` — never abbreviate contract or role names.

### Don't Repeat Yourself

Every piece of knowledge has one authoritative location. Duplicated logic means two places to update and one place forgotten. Extract shared behaviour to a function, hook, or library. In contracts, shared validation lives in `AssetUserAllowList` — other contracts call it, never replicate it.

### Simplicity (KISS / YAGNI)

Write the simplest thing that satisfies the current requirement. Don't add abstraction layers, config switches, or extension points for imagined future needs. If a future need arises, add the abstraction then. Speculative generality is a code smell (see `code-review` skill).

### Comments

Comments explain *why*, never *what*. If the code needs a comment to explain what it does, rewrite the code. Acceptable comments: explaining a non-obvious constraint, referencing an ADR or EIP, noting a known limitation. Never acceptable: narrating the code (`// increment counter`, `// return result`).

### Encapsulation

Hide what callers don't need to know. In TypeScript, unexported functions and types are the default — export only the public API. In Solidity, use `internal` and `private` visibility; expose state via view functions, not public variables, unless the storage layout is part of the interface. In React, component-internal state stays inside the component; hooks expose only their return value.

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

## Style

How code reads on the page. The strokes and the rules that hold them in place.

### Cyclomatic caps

No function or method should have a cyclomatic complexity above 5. Count one for each `if`, `else`, `for`, `while`, `case`, `&&`, `||`, and ternary. When a function exceeds the cap, extract the branches into named functions — the names serve as documentation. In Solidity, prefer early reverts and modifiers to deeply nested conditionals.

### Parameter Object

When a function takes three or more parameters that travel together, bundle them into a named type. `purchaseShares(assetId: bigint, amount: bigint, buyer: Address)` → `purchaseShares(order: PurchaseOrder)`. The type name carries intent; the individual parameters do not. Apply the same rule to React component props — a component with more than four props is a signal to introduce a props type or split the component.

### Guard Clauses

Validate preconditions at the top of a function and return or revert early. Never wrap the happy path in a deep `if` block. In TypeScript, narrow types at the top; in Solidity, revert with a custom error at the top. The reader should reach the core logic without navigating indentation.

```typescript
// WRONG
function formatUsdc(raw: bigint | null) {
  if (raw !== null) {
    if (raw > 0n) {
      return (Number(raw) / 1_000_000).toFixed(2);
    }
  }
  return "0.00";
}

// RIGHT
function formatUsdc(raw: bigint | null) {
  if (raw === null || raw <= 0n) return "0.00";
  return (Number(raw) / 1_000_000).toFixed(2);
}
```

### Inline first

Start with the simplest inline implementation. Extract to a named function only when the logic is reused in a second place, or when giving it a name materially improves readability. Don't pre-extract on the assumption it will be reused — that is speculative generality (YAGNI). A one-line helper extracted for a single call site usually makes the code harder to follow, not easier.

---

## Architecture

Boundaries before patterns. Coupling is the only metric that matters at the system level.

### Streaming architecture

The events layer is a unidirectional pipeline: upstream source → `ingest` → Redis pub/sub → `gateway` → browser WebSocket. No step writes back up the chain. `ingest` never reads from Redis; `gateway` never writes to upstream. New data types flow through by adding a channel to the pipeline, not by adding a new service.

### Three-tier hosting

- **Contracts** — on-chain (Ethereum / Base). The source of truth for ownership, balances, and compliance state.
- **Services** — ECS Fargate (MCP, ingest, gateway). Stateless; all persistent state is in Redis or on-chain.
- **Web** — Next.js, statically built and CDN-served where possible. Reads chain state via viem; reads live feeds via WebSocket.

### Stable Dependencies Principle

Modules should depend on things that change less frequently than they do. `libs/abi` and `libs/shared-config` are the most stable — nothing in `apps/` should cause them to change. `apps/web` depends on `libs/abi`; `libs/abi` never depends on `apps/web`. Dependency arrows point inward toward stability.

### Common Closure Principle

Files that change together belong together. If a contract change always requires a change to the ABI and a change to the web config, those three things are in the same logical unit. Don't split them across packages unless there is a strong reason (publication, separate deployment).

### Thin Handlers

API route handlers and WebSocket message handlers are thin: they parse input, call a domain function, and return the result. No business logic, no direct contract calls, no Redis reads inside a handler. If a handler grows beyond ~20 lines of meaningful logic, extract the logic to a service function.

### Bounded Contexts

Each app and lib is a bounded context with its own `CONTEXT.md`. Terms may differ across contexts — do not assume a word means the same thing in `apps/web` and `libs/contracts`. Translations between contexts happen at integration points (API routes, WebSocket messages, ABI call sites). See `CONTEXT-MAP.md` for the full map and integration patterns.

### Coupling first

Before choosing a pattern, identify the coupling it creates. A shared type between `apps/web` and `apps/mcp` couples their release cycles. A direct import from `libs/contracts` in `apps/web` couples the UI to the contract build. Name the coupling explicitly before accepting it; prefer loose coupling (events, shared-config) over tight coupling (direct imports across app boundaries).

### Push to the source of truth

Read state from its authoritative source. Contract balances come from the chain via viem — not from a cached database copy. Live prices come from the Redis pub/sub channel — not from a REST poll. Don't introduce a secondary store for data that already has an authoritative source unless there is a measured performance reason.

### Liskov Substitution Principle

Any implementation of an interface must be fully substitutable for the interface. In TypeScript, a class that implements an interface must honour all its contracts — not just the methods it finds convenient. In Solidity, contracts that implement an ERC standard (ERC-721, ERC-1155, ERC-20) must not silently break any part of the standard's expected behaviour.

### Interface Segregation Principle

Callers should not depend on methods they don't use. Keep interfaces narrow. An MCP tool that only reads contract state should not depend on a client type that also exposes write methods. Split interfaces at the natural usage boundary.

### Dependency Inversion Principle

High-level modules should not depend on low-level modules directly — both should depend on abstractions. In practice: `apps/web` depends on the ABI type from `@brickbase/abi`, not on the Hardhat artifact path. Service functions accept a client interface, not a concrete viem `PublicClient`. This makes modules testable and swappable.

---

## Types & Schemas

Containers that hold what they say they hold. Domain in the types, exceptions called out, casts replaced with proof, and one owner per schema.

### Domain-driven types

Types should carry domain meaning, not just structural shape. Prefer named types over primitives when the primitive represents a domain concept.

```typescript
// WRONG — a bare string could be any string
function getAsset(id: string) { ... }

// RIGHT — an AssetId can only be a valid asset identifier
type AssetId = string & { readonly _brand: "AssetId" };
function getAsset(id: AssetId) { ... }
```

Use the vocabulary from `CONTEXT.md` in type names. `AssetId`, `ShareAmount`, `AllowlistedAddress` — not `id`, `amount`, `addr`. In Solidity, use custom value types (`type AssetId is uint256`) where the domain distinction matters enough to prevent accidental substitution.

### No escape hatches

`any` in TypeScript and unchecked casts in Solidity both defeat the type system. Neither is acceptable without an explicit comment stating why the type cannot be known and what guarantees are upheld manually.

- No `as any`, no `as unknown as T` chains without justification
- No `as` casts in Solidity without bounds checking or a comment referencing the invariant that makes it safe
- No `@ts-ignore` or `@ts-expect-error` in production code paths — fix the type, don't suppress it

When wrapping a third-party type that genuinely cannot be typed (e.g. a raw Hardhat contract factory return), annotate with `// untyped: Hardhat factory — replace when typed bindings are available`.

### Type Guards

Use type guards to narrow types at runtime boundaries — API responses, WebSocket messages, contract event data. Never assume the shape of external data; always validate before using.

```typescript
// WRONG — trusts the shape without checking
const event = rawLog as AssetVaultedEvent;

// RIGHT — proves the shape before using it
function isAssetVaultedEvent(raw: unknown): raw is AssetVaultedEvent {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "assetId" in raw &&
    "owner" in raw
  );
}
```

Prefer `zod` schemas at the outermost boundary (API routes, WebSocket message handlers) so the type guard and the runtime validation are the same artefact.

### Schema Sovereignty

Every shared data shape has one owning location. The ABI is the schema for contract interactions — import it from `@brickbase/abi`, never redefine contract types inline in `apps/web` or `apps/mcp`. The events schema lives in `@brickbase/events-types` — import from there, never redeclare. If two places define the same shape independently, one of them will drift.

---

## Tooling

These tenets enforce what gates can enforce — line counts, complexity caps, duplicate detection, type strictness. Tooling catches the mechanical violations so code review can focus on intent.

### Linter as law

The ESLint and Solhint configurations are non-negotiable. A linter warning is a failing build. Never disable a rule inline (`// eslint-disable-next-line`, `/* solhint-disable */`) without a comment explaining why the rule does not apply in this specific case and what alternative guarantee is provided. Blanket `eslint-disable` blocks are never acceptable.

The TypeScript compiler runs in strict mode (`"strict": true`). `noImplicitAny`, `strictNullChecks`, and `noUncheckedIndexedAccess` are all enabled. These are not negotiable per-file.

Solhint enforces Solidity style: explicit visibility on all state variables and functions, no `tx.origin` for authentication, no floating pragmas, named return values on view functions returning multiple values.

### Duplication detection

Duplicated logic is a bug waiting to diverge. Before adding a new utility function, search `libs/` for an existing one. Before adding a new hook, check `apps/web/src/hooks/`. Before adding a new contract helper, check `libs/contracts/contracts/`.

If duplication is detected during review, it must be extracted before the PR merges — not deferred to a follow-up. The rule: two copies is one too many.

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
