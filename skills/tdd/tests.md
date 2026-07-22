# Testing

Probes and proofs. The instruments that keep the canon honest. Eight tenets carry the load — five about what tests prove, three about how they are isolated.

## Living documentation

Tests are the first document a new engineer reads. A test suite that requires source code to understand is a failed test suite. Test names read as specifications: `"AssetDetail shows the oracle price for a listed asset"`, not `"renders correctly"`. The describe/it hierarchy forms a table of contents for the feature. When a test fails, the name alone should tell the reader what capability is broken — without opening the implementation.

## Specification by example

Requirements are expressed as concrete examples, not abstract rules. Instead of "the system shall format USDC amounts correctly", write `expect(formatUsdc(1_500_000n)).toBe("1.50")`. Instead of "the allowlist gate shall reject unauthorised users", write the specific revert scenario with a real address and a real error. Concrete examples are unambiguous; abstract rules are not.

## Parametrised scenarios

When the same behaviour holds across multiple inputs, express it once with a table of cases — not as duplicated test blocks. Use `it.each` in Jest or a data table in Cucumber. Each row is a worked example; the test body is the behaviour.

```typescript
it.each([
  [1_500_000n, "1.50"],
  [0n,         "0.00"],
  [999n,       "0.00"],  // below 1 cent — rounds to zero
])("formatUsdc(%s) === %s", (raw, expected) => {
  expect(formatUsdc(raw)).toBe(expected);
});
```

## Real dependency E2E

End-to-end tests use real dependencies — a real browser (Playwright), a real running Next.js dev server, and real contract state on a local Hardhat node. No mocks at the E2E boundary. If a test cannot run without mocking infrastructure, it is an integration test, not an E2E test. Cucumber feature files under `apps/web/tests/features/e2e/` describe user journeys in plain language; the steps drive Playwright against a live stack.

## Structural assertions

Assert on the observable structure of outputs, not on implementation details. For a React component, assert that the DOM contains the expected text or element — not that a specific function was called. For a contract, assert on the resulting on-chain state via public view functions — not on raw storage slots. Structural assertions survive refactors; implementation assertions do not.

## Behaviour testing

Tests verify what the system does, not how it does it. "BuyShares shows updated share balance after purchase" tests behaviour. "BuyShares calls writeContract with args [1n, 100n]" tests implementation. The distinction: if you refactor the internals without changing the observable outcome, behaviour tests stay green and implementation tests break.

## Test isolation

Each test starts from a known, independent state. In Jest, use `beforeEach` to construct fresh instances — never share mutable state across tests. In Hardhat, deploy the full contract graph in `beforeEach` so each test gets a clean chain. In Playwright, each scenario gets its own browser context. A test that passes in isolation but fails in a suite has a shared-state bug.

## One concept per test

Each test asserts one logical thing. If a test has multiple `expect` calls that could independently fail for different reasons, split it. "AssetDetail shows the asset name and price" should be two tests — or the two assertions should be so tightly coupled that they describe a single concept. When a test fails, the name should pinpoint the problem without reading the assertions.

---

# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior — user sees the asset price displayed
test("AssetDetail shows the current oracle price for an asset", async () => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AssetDetail assetId="1" />
    </QueryClientProvider>
  );
  expect(await screen.findByText(/\$[\d,.]+/)).toBeInTheDocument();
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details — asserts on internal contract call
test("BuyShares calls contract.write with correct args", async () => {
  const mockWrite = jest.fn();
  jest.mock("wagmi", () => ({ useWriteContract: () => ({ writeContract: mockWrite }) }));
  render(<BuyShares assetId="1" />);
  fireEvent.click(screen.getByRole("button", { name: /buy/i }));
  expect(mockWrite).toHaveBeenCalledWith({
    functionName: "purchaseShares",
    args: [1n, 100n],
  });
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify share balance
test("purchaseShares updates the database", async () => {
  await purchaseShares({ assetId: 1, amount: 100 });
  const row = await db.query("SELECT * FROM share_balances WHERE asset_id = 1");
  expect(row.amount).toBe(100);
});

// GOOD: Verifies through the public interface — component reflects updated balance
test("BuyShares shows updated share balance after purchase", async () => {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <BuyShares assetId="1" />
    </QueryClientProvider>
  );
  fireEvent.click(await screen.findByRole("button", { name: /buy/i }));
  expect(await screen.findByText(/your shares: \d+/i)).toBeInTheDocument();
});
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```typescript
// BAD: Expected value is recomputed the same way the code computes it
test("formatUsdc formats a USDC amount", () => {
  const raw = 1_500_000n; // 1.50 USDC (6 decimals)
  const expected = (Number(raw) / 1_000_000).toFixed(2);
  expect(formatUsdc(raw)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("formatUsdc formats a USDC amount", () => {
  expect(formatUsdc(1_500_000n)).toBe("1.50");
});
```

## Smart Contract Tests (Hardhat + Chai)

Contract tests run against a real in-process Hardhat node — no mocks of the EVM. Test behaviour through the public contract interface; never read internal storage slots directly.

**Setup pattern**: deploy the full contract graph in `beforeEach` so each test starts from a clean state.

```typescript
import { ethers } from "hardhat";
import { expect } from "chai";

describe("AssetShares", () => {
  let usdc: any, vault: any, shares: any, allowList: any;
  let deployer: any, buyer: any;

  beforeEach(async () => {
    [deployer, buyer] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6, ethers.parseUnits("1000000", 6));

    const AssetUserAllowList = await ethers.getContractFactory("AssetUserAllowList");
    allowList = await AssetUserAllowList.deploy();

    const AssetVault = await ethers.getContractFactory("AssetVault");
    vault = await AssetVault.deploy(await allowList.getAddress());

    const AssetShares = await ethers.getContractFactory("AssetShares");
    shares = await AssetShares.deploy(
      await usdc.getAddress(),
      await vault.getAddress(),
      await allowList.getAddress(),
      ""
    );

    await allowList.setAuthorizedCaller(await vault.getAddress(), true);
    await allowList.setAuthorizedCaller(await shares.getAddress(), true);
  });
```

**Good — assert on observable on-chain state through the public interface:**

```typescript
  // GOOD: Verifies the buyer's ERC-1155 balance via the public interface
  it("mints shares to the buyer after purchase", async () => {
    const assetId = 1n;
    const shareAmount = ethers.parseUnits("100", 6);

    await usdc.transfer(buyer.address, shareAmount);
    await usdc.connect(buyer).approve(await shares.getAddress(), shareAmount);

    await shares.connect(buyer).purchaseShares(assetId, shareAmount);

    expect(await shares.balanceOf(buyer.address, assetId)).to.equal(shareAmount);
  });
```

**Bad — reads internal storage directly instead of using the interface:**

```typescript
  // BAD: Bypasses the contract interface to inspect raw storage
  it("saves share balance in mapping", async () => {
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [buyer.address, 1n])
    );
    const raw = await ethers.provider.getStorage(await shares.getAddress(), slot);
    expect(raw).not.to.equal(ethers.ZeroHash);
  });
```

**Good — assert on reverts and access control using named custom errors:**

```typescript
  // GOOD: Asserts on the observable revert reason, not the call sequence
  it("reverts when a non-allowlisted address tries to purchase shares", async () => {
    const [, , stranger] = await ethers.getSigners();

    await expect(
      shares.connect(stranger).purchaseShares(1n, ethers.parseUnits("10", 6))
    ).to.be.revertedWithCustomError(shares, "UserNotAllowlisted");
  });

  // GOOD: Access-control revert uses the standard OpenZeppelin error
  it("reverts when a non-admin tries to grant a role", async () => {
    const ASSET_MANAGER_ROLE = await shares.ASSET_MANAGER_ROLE();

    await expect(
      shares.connect(buyer).grantRole(ASSET_MANAGER_ROLE, buyer.address)
    ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
  });
});
```
