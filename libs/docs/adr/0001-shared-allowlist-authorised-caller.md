---
status: accepted
---

# Single shared allowlist gated by authorised callers

Allowlist membership lives in one shared `AssetUserAllowList` contract rather than a copy per token contract. Access is gated by an **authorised-caller** allowance (address-based), and the compliance role (`COMPLIANCE_OFFICER_ROLE`) is enforced at the *calling* contract (AssetVault / AssetShares), not inside the allowlist itself.

A single source of truth means an address allowlisted once is recognised by every contract, avoiding drift between per-contract lists. Delegating role enforcement to callers keeps the allowlist small and lets each contract own its own compliance semantics, at the cost of an extra `setAuthorizedCaller` wiring step after deployment.

## Consequences

- After deploying AssetVault and AssetShares, each must be registered via `setAuthorizedCaller` or its allowlist reads/writes revert.
- The allowlist trusts its authorised callers to enforce the compliance role — a misconfigured caller is a compliance hole.
