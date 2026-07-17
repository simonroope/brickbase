---
status: accepted
---

# Shares settle in USDC via ERC-20 approve/transferFrom

Share purchases (primary market) and trades (secondary market) settle in USDC, an external 6-decimal ERC-20, using the approve/transferFrom pattern — not native ETH.

A fiat-pegged stablecoin gives prices and valuations (`sharePrice`, `capitalValue`, `incomeValue`) a stable real-world unit, which matters for a real-estate product; native ETH would expose every purchase to ETH/USD volatility. The trade-off is the two-step UX (approve, then purchase/trade) inherent to ERC-20 spending.

## Consequences

- Shares are 18-decimal while USDC is 6-decimal, so cost is computed as `amount * sharePrice / 1e18`. Changing either decimals assumption breaks this math.
- Buyers must hold and approve USDC before purchasing; a purchase with insufficient allowance reverts.
