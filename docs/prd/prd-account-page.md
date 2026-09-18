# Account page

## Problem Statement

A connected investor has no place in the portal to see their own account details. The wallet address only appears in a small, truncated form in the header (`0x1234…abcd`), which cannot be read in full or copied. When a user needs to confirm or share the exact address they are connected with — for allowlisting, support, or verifying a transaction counterparty — there is nowhere to do so.

## Solution

Add an **Account** tab to the main navigation and a dedicated `/account` page. When a wallet is connected, the page displays the full wallet address in a readable, copyable form. When no wallet is connected, the page invites the user to connect. The page shows *only* the wallet address — it is deliberately not an aggregated holdings or portfolio view (consistent with the existing "no aggregated portfolio view" position in the web glossary).

## User Stories

1. As a connected investor, I want an "Account" tab in the main navigation, so that I can find my account details from anywhere in the portal.
2. As a connected investor, I want to visit an `/account` page, so that I have a stable, bookmarkable place for my account information.
3. As a connected investor, I want to see my full wallet address, so that I can read it in full rather than the truncated form shown in the header.
4. As a connected investor, I want the address shown in monospace, so that every character is legible and unambiguous.
5. As a connected investor, I want a copy-to-clipboard button next to my address, so that I can copy it without manually selecting text.
6. As an investor who has not connected a wallet, I want the Account page to prompt me to connect, so that I understand why no address is shown and know how to proceed.
7. As an investor who has not connected a wallet, I want a connect button directly on the Account page, so that I can connect without leaving the page.
8. As a user, I want the Account page to use the same header, layout, and styling as the other pages, so that it feels like a native part of the portal.
9. As a user who connects a wallet while on the Account page, I want the page to update to show my address, so that I do not have to reload.
10. As a user who disconnects while on the Account page, I want the page to revert to the connect prompt, so that stale account details are never shown.
11. As a user needing my address for allowlisting or support, I want to copy the exact checksummed address, so that I avoid transcription errors.

## Implementation Decisions

- **New route** `/account` under the web app, following the existing page pattern (`Header` + `main` + `h1` + a feature component), mirroring how `/asset-admin` is composed.
- **New component `AccountPanel`** (client component) owns the account UI. It reads wallet state from the existing `useWallet()` hook (`address`, `isConnected`) — the established seam for wallet-dependent components.
- **Navigation** — a third link, labelled **Account**, is added to the header nav alongside Properties and Admin.
- **Connected state** — render the full wallet address in monospace with a copy-to-clipboard button.
- **Disconnected state** — render a "Connect your wallet to view your account" prompt with a connect action, reusing the existing connect button component rather than introducing a new one.
- **Scope of data** — only the wallet address is displayed. No balance, holdings, allowlist status, or chain info. This keeps the page aligned with the glossary's "no aggregated portfolio view" stance.
- **Glossary** — add an "Account" term to the web `CONTEXT.md`: the connected wallet's identity page (`/account`), currently displaying only the wallet address, not holdings.
- **No ADR** — this is easily reversible with no meaningful architectural trade-off.

## Testing Decisions

- **What makes a good test here** — assert external behavior a user can observe, not implementation details. For `AccountPanel` that means: what renders when connected vs. disconnected, driven purely through the `useWallet` seam.
- **Single seam** — `AccountPanel` is tested via React Testing Library with `useWallet` mocked. This is the highest available seam and requires no new test boundaries.
- **Cases to cover**:
  - Connected → the full address is present in the document and a copy control is available.
  - Disconnected → the connect prompt is shown and no address is rendered.
- **Prior art** — `apps/web/src/components/__tests__/AssetDetail.test.tsx` already renders a component with React Testing Library and mocks `useWallet`; follow that setup (Jest + `@testing-library/react`).
- **Thin wiring not separately tested** — `page.tsx` and the header nav link are trivial composition and are not worth dedicated tests.

## Out of Scope

- Any aggregated holdings, balances, or portfolio view.
- Displaying chain name, native balance, or share balances on the Account page.
- ENS name resolution or avatars.
- Editing or persisting any user profile data (the portal has no user records; identity is the wallet).
- Copy-button interaction beyond writing the address to the clipboard (e.g. toast systems), unless trivially available.

## Further Notes

- The address returned by `useWallet()` originates from wagmi and is already checksummed; no additional formatting beyond monospace display is required.
- Reusing `ConnectBtn` for the disconnected state keeps the connect experience consistent with the header.
