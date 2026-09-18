---
status: accepted
---

# AssetVault and AssetShares implement EIP-7943 (uRWA) compliance hooks

Both token contracts implement the EIP-7943 (uRWA) compliance interface: `isUserAllowed`, `canTransact`, `canTransfer`, freeze inspection, and `forcedTransfer`. These hooks are non-negotiable — they exist to satisfy regulated RWA issuance requirements (allowlist enforcement on every transfer, per-holding freeze, and compliance-officer forced transfer for legal remediation).

We chose an established standard over ad-hoc compliance checks so wallets, tooling, and auditors can recognise the behaviour, and so allowlist/freeze enforcement is applied uniformly at the transfer boundary rather than bolted onto individual functions.

## Consequences

- The freeze granularity differs by token: AssetVault freezes a whole NFT (`tokenId`); AssetShares freezes a per-user share *amount*.
- Removing or weakening these hooks is a regulatory regression, not a refactor — revisit this ADR first.
