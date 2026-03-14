

## Plan: Rate Accuracy, Protocol Labeling, and Base Chain Support

### 1. How Rates Are Fetched (Answering Your Question)

**Data sources:**
- **Lending rates**: Fetched from the **1Delta API** (`portal.1delta.io/v1/data/lending/pools`), which aggregates on-chain data from Aave, Compound, Spark, Euler, etc. The `depositRate` and `variableBorrowRate` fields are used directly.
- **Vault APYs**: Fetched from **Morpho's official GraphQL API** (`blue-api.morpho.org/graphql`) for Morpho vaults, plus 1Delta for Euler vaults.
- **Fixed yields**: Fetched from **Pendle's official API** (`api-v2.pendle.finance`), using the `impliedApy` field.

**Rate normalization concern**: The backend has a `normalizeRatePercent` function that uses a heuristic — if a value is ≤ 1, it assumes it's a decimal and multiplies by 100. This works correctly in most cases but could misclassify a genuine 0.5% rate (already in percent) as 50%. Looking at the actual response data, the values appear correct (e.g., ETH supply APY 1.74%, USDC 1.81%), so the 1Delta API likely returns decimal rates that get normalized properly. However, we should add a data source label to the UI so users can cross-reference.

**Why rates may differ from protocol UIs**: Protocol dashboards (e.g., Aave) often include reward token APY (AAVE incentives, COMP rewards) on top of base rates. The 1Delta API reports **base rates only** (on-chain supply/borrow interest), not incentive rewards.

### 2. Changes

#### A. Fix Protocol Labeling (Backend Edge Function)
The backend `resolveLenderName` function already produces precise labels like "Aave V3 Core", "Aave V3 Horizon", "Aave V3 Prime", "Compound Blue", "Compound Prime" with chain suffixes. However, the frontend `formatProtocolLabel` may override or conflict. 

**Fix**: Ensure the backend labels are trusted end-to-end. The frontend `formatProtocolLabel` should only add chain info if missing, not re-derive instance names. Redeploy the edge function to ensure the latest labeling code is live.

#### B. Enable Base Chain for Morpho Vaults and Pendle
Currently:
- **Lending**: Already fetches both Ethereum (chainId 1) and Base (chainId 8453) ✓
- **Morpho vaults**: Only queries `chainId_in: [1]` — **needs Base (8453)**
- **Pendle**: Only queries `chainId=1` — **needs Base (8453)**

**Edge function changes:**
- Morpho GraphQL query: change `chainId_in: [1]` to `chainId_in: [1, 8453]`
- Pendle: fetch both `chainId=1` and `chainId=8453`, merge results
- Add chain label to vault and Pendle market names for disambiguation

#### C. Add Data Source Labels to UI
Add a small "Source" indicator to the table headers or as a subtitle, so users know where rates come from:
- Lending table: "Rates via 1Delta · Base rates only (excl. reward incentives)"
- Vaults table: "APY via Morpho Blue API / 1Delta"
- Fixed yield: "Implied APY via Pendle API"

### 3. Files Modified

| File | Change |
|---|---|
| `supabase/functions/markets/index.ts` | Add Base chain to Morpho vaults query and Pendle fetch; add chain labels to vault/Pendle names |
| `src/components/markets/LendingTable.tsx` | Add data source subtitle |
| `src/components/markets/VaultsTable.tsx` | Add data source subtitle |
| `src/components/markets/FixedYieldTable.tsx` | Update subtitle to include Base; add data source label |
| `src/lib/marketTypes.ts` | Simplify `formatProtocolLabel` to trust backend labels |

### 4. Technical Detail: Edge Function Morpho Query Change

```graphql
# Before
vaults(first: 500, where: { chainId_in: [1] })

# After  
vaults(first: 500, where: { chainId_in: [1, 8453] })
```

Pendle will fetch two endpoints and merge:
```
https://api-v2.pendle.finance/core/v1/markets/all?chainId=1
https://api-v2.pendle.finance/core/v1/markets/all?chainId=8453
```

Each vault/Pendle market will include the chain name in its display for disambiguation (e.g., "Steakhouse USDC (Base)").

