

# Klyro.fi — Complete UI/UX Overhaul Plan

## Summary

Rebrand to **Klyro** and merge chat + markets into a single unified app shell. Ethereum-only. Add real vault data (Morpho Blue from 1delta API + Yearn from yDaemon) and Pendle fixed yield data. Enable "Deposit" / "Borrow" actions directly from market tables via the chat.

---

## 1. Unified Layout Architecture

Replace the current split (chat at `/`, markets at `/markets/*`) with a single-page app shell:

```text
┌──────────────────────────────────────────────────────┐
│  AppBar: Klyro logo | Lending | Vaults | Fixed |     │
│          search... | wallet | theme toggle            │
├────────┬─────────────────────────────────────────────┤
│ Chat   │  Main Content Area                          │
│ Sidebar│  (tab-based: markets table, vault table,    │
│ (240px)│   fixed yield table, or overview)            │
│        │                                              │
│ Chat   │                                              │
│ history│                                              │
│        ├─────────────────────────────────────────────┤
│        │  Chat Input Bar (always visible at bottom)  │
│        │  "Ask about lending markets..."             │
└────────┴─────────────────────────────────────────────┘
```

- **Single route** `/` with tab-based navigation (Overview, Lending, Vaults, Fixed, Chat)
- Chat sidebar always visible on left, chat input always at bottom
- When "Chat" tab is active, the main area shows the conversation
- When a market tab is active, main area shows the data table
- Each market row gets an action button (Deposit/Supply/Borrow) that pre-fills a chat command

## 2. Theme — Hyperliquid-inspired Dark-first Design

New unified theme (dark default, light option):

- **Dark mode**: bg `#0d0d0e`, paper `#16161a`, surface `#1c1c21`, accent `#5865F2` (indigo-blue), success `#2dd4bf` (teal), text `#e4e4e7`
- **Light mode**: bg `#f4f4f5`, paper `#ffffff`, accent `#4f46e5`, text `#18181b`
- Font: `"Inter", system-ui, sans-serif`, monospace for numbers
- Border radius: 8px globally
- Smooth transitions on all interactive elements (200ms ease)
- Table rows: subtle hover highlight, no harsh borders

## 3. Edge Function Changes

### `markets` edge function
- **Ethereum only**: Remove multi-chain fetching, only fetch `chainId=1` with higher count (200)
- Add `?type=lending|vaults|pendle` query param to serve all 3 data types from one function
- **Vaults**: Fetch Morpho Blue vaults from 1delta (`lender=MORPHO_BLUE`) + Yearn vaults from `https://ydaemon.yearn.fi/1/vaults/all`
- **Pendle**: Fetch from `https://api-v2.pendle.finance/core/v1/markets/all?chainId=1` — extract `name`, `expiry`, `impliedApy` (decimal * 100), `liquidity.usd` as TVL, underlying asset symbol
- Return consistent shapes per type

### Response shapes

**Lending** (existing, filtered to chain 1):
```
{ id, marketUid, protocol, protocolName, asset, supplyAPY, borrowAPR, totalSupplyUSD, availableLiquidityUSD, utilizationRate }
```

**Vaults** (new):
```
{ id, name, protocol, asset, apy, tvl, source: "morpho"|"yearn" }
```

**Pendle** (new):
```
{ id, name, asset, impliedAPY, expiry, daysToMaturity, tvl }
```

## 4. Frontend Components

### New/Modified files:
- `src/theme.ts` — Complete rewrite with Hyperliquid-style palette
- `src/App.tsx` — Single layout with sidebar + tabs + bottom chat input
- `src/components/AppShell.tsx` — New unified shell component
- `src/components/AppHeader.tsx` — Rebranded "Klyro" with tab navigation
- `src/components/ChatPanel.tsx` — Refactored ChatArea as a panel (not full page)
- `src/components/ChatSidebar.tsx` — Updated styling
- `src/components/markets/LendingTable.tsx` — Replaces VariableMarkets, with asset filter dropdown and action buttons
- `src/components/markets/VaultsTable.tsx` — New, with real data
- `src/components/markets/FixedYieldTable.tsx` — New, with Pendle data
- `src/components/markets/OverviewDashboard.tsx` — Replaces MarketsHome, summary stats cards
- `src/components/markets/AssetFilter.tsx` — MUI Select/Autocomplete for filtering by asset
- `src/components/markets/MarketActionButton.tsx` — "Deposit" / "Borrow" button per row that sends a pre-built prompt to chat
- `src/hooks/useMarkets.ts` — Add `type` param, add `useVaults()`, `usePendle()` hooks
- `src/lib/marketTypes.ts` — Add Vault and PendleMarket types

### Asset filter
- MUI Autocomplete above each table, populated from unique asset values in data
- Filters the DataGrid rows client-side

### Market → Chat action flow
Each table row shows a small "Deposit" or "Supply" button. Clicking it:
1. Switches to the Chat tab
2. Creates a new chat (or uses active)
3. Auto-submits a prompt like: `"Deposit into AAVE_V3 USDC market (marketUid: AAVE_V3:1:0x...)"` 
4. The existing chat agent handles it via tool calls

## 5. Branding
- Title: "Klyro" 
- Subtitle: "DeFi Yield Intelligence"
- Favicon + logo update
- All references to "1delta", "Lending Agent" replaced with "Klyro"
- `index.html` title → "Klyro — DeFi Yield Intelligence"

## 6. Remove/Cleanup
- Delete separate `/markets/*` routes and `MarketsLayout.tsx`
- Remove `MarketsHome.tsx`, `VariableMarkets.tsx`, `VaultsPage.tsx`, `FixedMarketsPage.tsx`
- Remove orange `#FF6600` theming, replace with indigo accent
- All pages consolidated into single-page tabbed layout

## 7. Files to Create/Edit

| Action | File |
|--------|------|
| Rewrite | `src/theme.ts` |
| Rewrite | `src/App.tsx` |
| Create | `src/components/AppShell.tsx` |
| Rewrite | `src/components/AppHeader.tsx` |
| Rewrite | `src/pages/Index.tsx` |
| Create | `src/components/ChatPanel.tsx` (from ChatArea) |
| Edit | `src/components/ChatSidebar.tsx` |
| Create | `src/components/markets/LendingTable.tsx` |
| Create | `src/components/markets/VaultsTable.tsx` |
| Create | `src/components/markets/FixedYieldTable.tsx` |
| Create | `src/components/markets/OverviewDashboard.tsx` |
| Create | `src/components/markets/AssetFilter.tsx` |
| Create | `src/components/markets/MarketActionButton.tsx` |
| Rewrite | `src/hooks/useMarkets.ts` |
| Edit | `src/lib/marketTypes.ts` |
| Rewrite | `supabase/functions/markets/index.ts` |
| Edit | `index.html` |
| Edit | `src/components/MessageBubble.tsx` |
| Edit | `src/components/EntityChip.tsx` |
| Delete | `src/components/markets/MarketsLayout.tsx` |
| Delete | `src/components/markets/MarketOverview.tsx` |
| Delete | `src/pages/MarketsHome.tsx`, `VariableMarkets.tsx`, `VaultsPage.tsx`, `FixedMarketsPage.tsx` |

## 8. Technical Notes

- Pendle API (`api-v2.pendle.finance/core/v1/markets/all?chainId=1`) is public, no key needed. Returns `impliedApy` as decimal (0.05 = 5%). Fields: `name`, `expiry`, `pt.symbol`, `underlyingAsset.symbol`, `liquidity.usd`, `impliedApy`.
- Yearn yDaemon (`ydaemon.yearn.fi/1/vaults/all`) is public. Returns `name`, `token.symbol`, `tvl.totalAssets`, `apr.netAPR` (decimal).
- Morpho Blue vaults on Ethereum: 1delta API with `lender=MORPHO_BLUE` currently returns 0 items for chainId=1. Will use the broader pool fetch and filter `lenderKey.startsWith("MORPHO_BLUE")` — these already come through in the existing data.
- All rate conversions: 1delta rates are already percentages; Pendle/Yearn are decimals (multiply by 100).

