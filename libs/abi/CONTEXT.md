# ABI

Typed contract ABIs, imported as `@brickbase/abi`. The single public surface (`src/index.ts`) pulls the `.abi` off each Hardhat artifact and re-exports it as a viem-typed `Abi` constant.

## Language

**Abi export**:
A named viem `Abi` constant — the supported way to reference a contract's interface: `assetVaultAbi`, `assetSharesAbi`, `oracleRouterAbi`, `assetUserAllowListAbi`.
_Avoid_: importing the JSON directly, "vault ABI" / "shares JSON"

**Generated artifact**:
A raw compiler JSON (`{ abi, ... }`) under `src/generated/`, copied from the Contracts project. Consumers use the `Abi` export, never the artifact — the ABI is the `.abi` field of the artifact, not the artifact itself.
_Avoid_: treating the artifact as the ABI
