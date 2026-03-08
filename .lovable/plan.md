

## Problem

There are **two independent data pipelines** producing different results:

1. **Markets edge function** (`/markets`) — powers the UI tables. It calls the 1delta API, applies `extractAsset()` for asset names, `resolveLenderName()` for protocol names, filters out MORPHO_BLUE from lending, and returns structured `Market[]` objects.

2. **Chat edge function** (`/chat`) — powers the AI agent. It also calls the 1delta API directly via `slimPools()`, but uses raw field names (`lenderKey`, `assetGroup`), different filtering logic, and different rate field names (`depositAPR_pct` vs `supplyAPY`).

This means: a market visible in the UI tables (like "USDC on Flux Finance") may not be findable by the chat because the chat queries with different parameters or processes results differently.

## Solution: Chat consumes the Markets endpoint as a tool

Instead of having the chat call the 1delta API independently for browsing/searching, add an internal tool that fetches from the **same** `/markets` endpoint the UI uses. This guarantees identical data.

### Changes to `supabase/functions/chat/index.ts`

1. **Add a helper** `fetchMarketsEndpoint(type)` that calls the project's own `/markets` edge function (via `SUPABASE_URL`) for `lending`, `vaults`, and `pendle` data — the exact same processed data the UI displays.

2. **Replace `get_lending_markets` and `find_market` tool dispatch** to first try the internal markets endpoint. When the user asks about browsing/comparing rates, the chat will use the same pre-processed data (with correct `protocolName`, `asset`, `supplyAPY` fields).

3. **Update `slimPools`** to also accept the already-processed markets format, so when data comes from the internal endpoint it passes through without re-processing rates.

4. **Add a new tool `search_markets`** specifically for searching the unified dataset by asset/protocol name, replacing the pattern of calling 1delta raw pools for informational queries. This tool calls `/markets?type=lending` + `/markets?type=vaults` internally.

5. **Update the system prompt** to instruct the model to use `search_markets` for informational queries (rates, comparisons) and reserve `find_market` / `get_lending_markets` only for action preparation (where `marketUid` is needed for calldata).

### Summary of data flow after fix

```text
┌─────────────┐
│  1delta API  │
└──────┬───────┘
       │
┌──────▼───────┐
│  /markets    │  ← single processing pipeline
│  edge func   │
└──┬───────┬───┘
   │       │
   ▼       ▼
 UI      Chat (via search_markets tool)
Tables   Agent
```

This ensures zero discrepancies between what the user sees in tables and what the chat reports.

