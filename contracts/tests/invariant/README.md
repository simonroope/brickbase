# Foundry Invariant Tests

Stateful fuzz testing for Brickbase smart contracts using [Foundry](https://book.getfoundry.sh/forge/invariant-testing).

## Prerequisites

Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Test Contracts

| Contract | Description |
|----------|-------------|
| `AssetSharesInvariant.t.sol` | Handler-based invariants for ERC-1155 shares |
| `AssetVaultInvariant.t.sol` | Handler-based invariants for ERC-721 vault |
| `ComplianceInvariant.t.sol` | Cross-contract ERC-7943 compliance tests |

## Running Tests

From the repository root:

```bash
# Run all invariant tests
npm run contracts:test:invariant

# Or directly with forge
cd contracts
forge test --match-path 'tests/invariant/*.t.sol'

# Run with verbosity
forge test --match-path 'tests/invariant/*.t.sol' -vvvv

# Run specific test contract
forge test --match-contract AssetSharesInvariantTest -vvv
```

## Key Invariants Tested

### AssetShares (ERC-1155)

| Invariant | Description |
|-----------|-------------|
| `invariant_availableSupplyLteTotalSupply` | Available supply ≤ total supply |
| `invariant_totalSupplyImmutable` | Total supply never increases |
| `invariant_frozenBalanceLteBalance` | Frozen tokens ≤ user balance |
| `invariant_sharePricePositive` | Share price always > 0 |
| `invariant_contractHoldsAvailableShares` | Contract balance = available supply |

### AssetVault (ERC-721)

| Invariant | Description |
|-----------|-------------|
| `invariant_assetIdsSequential` | Asset IDs strictly increasing |
| `invariant_assetIdStartsFromOne` | First asset ID ≥ 1 |
| `invariant_frozenAssetsHaveOwner` | Frozen assets have valid owners |
| `invariant_validAssetStatus` | Status is valid enum (0-3) |
| `invariant_timestampsValid` | createdAt ≤ updatedAt |
| `invariant_balanceConsistency` | ERC-721 balance = owned count |
| `invariant_frozenBlocksTransact` | Frozen assets block `canTransact` |

### ERC-7943 Compliance Integration

| Invariant | Description |
|-----------|-------------|
| `invariant_disallowedCannotTransactVault` | Disallowed users blocked |
| `invariant_disallowedCannotTransferVault` | Compliance blocks transfers |
| `invariant_frozenVaultBlocksTransact` | Frozen assets block transact |
| `invariant_frozenVaultBlocksTransfer` | Frozen assets block transfer |
| `invariant_allowlistConsistency` | Vault & Shares agree on allowlist |
| `invariant_frozenSharesWithinBalance` | Frozen ≤ balance for shares |
| `invariant_contractsProperlyLinked` | Contracts reference each other |
| `invariant_allowedUsersCanTransactUnfrozen` | Allowed users can transact unfrozen |

## Handler Pattern

The tests use Foundry's handler pattern for guided fuzzing:

```solidity
contract MyHandler is Test {
    // State-modifying functions the fuzzer calls
    function doSomething(uint256 seed) external {
        // Bound inputs for realistic values
        seed = bound(seed, 1, 1000);
        // Perform action
        target.action(seed);
    }
}

contract MyInvariantTest is StdInvariant, Test {
    MyHandler handler;

    function setUp() public {
        // Deploy contracts
        handler = new MyHandler(...);
        // Target ONLY the handler
        targetContract(address(handler));
    }

    function invariant_myProperty() public view {
        // Assert property holds
        assertTrue(target.property());
    }
}
```

## Configuration

Foundry settings in `contracts/foundry.toml`:

```toml
[invariant]
runs = 256          # Number of fuzz runs
depth = 128         # Calls per run
fail_on_revert = false
dictionary_weight = 80
shrink_run_limit = 5000
```

Increase `runs` and `depth` for more thorough testing:

```bash
forge test --match-path 'tests/invariant/*.t.sol' \
  --fuzz-runs 1000 \
  --invariant-depth 256
```

## Adding New Invariants

1. Create a handler contract with state-modifying functions
2. Create a test contract extending `StdInvariant` and `Test`
3. In `setUp()`, deploy contracts and call `targetContract(address(handler))`
4. Add `invariant_` prefixed functions that assert properties

Example:

```solidity
function invariant_totalSupplyNeverExceedsMax() public view {
    assertLe(token.totalSupply(), MAX_SUPPLY, "Supply exceeded max");
}
```
