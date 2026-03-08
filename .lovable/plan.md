

## UI Overhaul Plan: DeFi Yield Intelligence Dashboard

This is a significant redesign. Given the scope, I'll break this into a phased plan that can be implemented incrementally. Each phase builds on the previous one.

---

### Phase 1: New Layout Architecture + Landing Dashboard

**Goal**: Replace the current tab-based layout with a single-page dashboard that shows the full lending landscape at a glance.

**New AppShell structure**:
```text
┌──────────────────────────────────────────────────────┐
│  Header: Logo | Wallet(s) Selector | Theme | Settings│
├────────┬─────────────────────────────────────────────┤
│        │  ┌─────────────────────────────────────┐    │
│        │  │ Hero Stats Bar (3 key metrics)       │    │
│  Chat  │  ├──────────────┬──────────────────────┤    │
│  Panel │  │ Best Yields  │ Positions Overview   │    │
│  (slide│  │ (top 5 each) │ (wallet connected)   │    │
│  -out) │  ├──────────────┴──────────────────────┤    │
│        │  │ Market Tables (tabbed: Lending|Vaults│    │
│        │  │ |Fixed|Compare)                      │    │
│        │  └─────────────────────────────────────┘    │
├────────┴─────────────────────────────────────────────┤
│  Command Bar (⌘K) — always visible at bottom          │
└──────────────────────────────────────────────────────┘
```

**Files to create/modify**:
- `src/components/AppShell.tsx` — Replace tab routing with single-page layout; chat becomes a slide-out panel (right drawer) instead of a full tab
- `src/components/AppHeader.tsx` — Simplify: remove tab navigation, add multi-wallet dropdown, keep theme toggle
- `src/components/dashboard/HeroStats.tsx` — New: 4-6 key metrics (best lending APY, best vault APY, best fixed yield, total TVL, user net worth if connected)
- `src/components/dashboard/TopYields.tsx` — New: 3-column grid showing top 5 yields per category (lending, vaults, fixed) with clickable rows that send to chat
- `src/components/dashboard/MarketExplorer.tsx` — New: wrapper with internal tabs for Lending/Vaults/Fixed/Compare views, containing the existing tables refactored
- `src/components/dashboard/PositionsPanel.tsx` — New: shows user positions when wallet connected (calls `get_user_positions` via 1delta API)
- `src/components/dashboard/ProtocolCompare.tsx` — New: side-by-side comparison of same asset across protocols

### Phase 2: Multi-Wallet Support

**Files to create/modify**:
- `src/hooks/useMultiWallet.ts` — New: manages array of connected wallets, active wallet selection, persists to localStorage
- `src/components/WalletButton.tsx` — Refactor into `WalletSelector.tsx`: dropdown showing all connected wallets, "Add wallet" button, active wallet indicator, aggregated balance view
- Update `CommandBar` and `ChatPanel` to pass active wallet address to chat function

### Phase 3: Chat Integration as Slide-Out Panel

Instead of a full-page tab, chat becomes a persistent slide-out drawer on the right side, accessible from anywhere.

**Files to modify**:
- `src/components/AppShell.tsx` — Add MUI Drawer for chat, toggle via FAB or header button
- `src/components/ChatPanel.tsx` — Adapt to drawer width, keep all existing functionality
- `src/components/ChatSidebar.tsx` — Move inside the chat drawer as a collapsible history panel
- Keep `CommandBar` at bottom of main content — typing sends to chat and opens the drawer

### Phase 4: Positions Overview Panel

**Files to create**:
- `src/hooks/usePositions.ts` — New: calls `/functions/v1/chat` with `get_user_positions` tool or directly calls 1delta API via a new edge function
- `src/components/dashboard/PositionsPanel.tsx` — Shows: collateral balances, debt balances, health factor gauge, liquidation price, current yield performance, net APY
- When no wallet connected: show a "Connect wallet to see positions" CTA
- When connected but no positions: show "No active positions — explore yields above"

### Phase 5: Protocol Comparison View

**Files to create**:
- `src/components/dashboard/ProtocolCompare.tsx` — New: select an asset (e.g., USDC), see all protocols side-by-side with supply APY, borrow APR, TVL, utilization, plus a "Deposit" action button per row
- Uses existing `useMarkets` and `useVaults` hooks, groups by asset

### Phase 6: UI Polish + Performance

**Theme updates** (`src/theme.ts`):
- Tighten spacing, add subtle gradients for stat cards
- Add glass-morphism effect for the chat drawer
- Consistent 8px grid spacing

**Performance** (`src/hooks/useMarkets.ts`):
- Add SWR `keepPreviousData` to avoid flash during refresh
- Skeleton loaders already exist, ensure they're used everywhere

**Responsive** — desktop-first but stack columns on mobile

---

### Implementation Order (Recommended)

Given the interconnected nature, I recommend implementing in this order:

1. **HeroStats + TopYields + new layout** — Immediate visual impact, no new API calls
2. **Chat as slide-out drawer** — Frees the main area for the dashboard
3. **Market Explorer with Compare tab** — Enhances the existing tables
4. **Multi-wallet support** — Wagmi already supports this
5. **Positions panel** — Requires wallet connection + new edge function
6. **UI polish pass** — Final refinements

### Key Technical Decisions

- **No new backend changes needed** for phases 1-3. All data already comes from existing `/markets` and `/chat` edge functions.
- **Positions** will need a thin edge function or direct 1delta API call from the chat function (already has `get_user_positions` tool).
- **Multi-wallet**: wagmi's `useAccount` + `useConnect` already support multiple connectors. We store additional addresses in localStorage.
- **All market data stays via SWR hooks** — no state duplication.

### Files Summary

| Action | File |
|--------|------|
| Rewrite | `src/components/AppShell.tsx` |
| Rewrite | `src/components/AppHeader.tsx` |
| Refactor | `src/components/ChatPanel.tsx` |
| Refactor | `src/components/ChatSidebar.tsx` |
| Refactor | `src/components/WalletButton.tsx` → `WalletSelector.tsx` |
| Keep | `src/components/CommandBar.tsx` (minor updates) |
| Keep | `src/components/markets/LendingTable.tsx` (minor updates) |
| Keep | `src/components/markets/VaultsTable.tsx` (minor updates) |
| Keep | `src/components/markets/FixedYieldTable.tsx` (minor updates) |
| Create | `src/components/dashboard/HeroStats.tsx` |
| Create | `src/components/dashboard/TopYields.tsx` |
| Create | `src/components/dashboard/MarketExplorer.tsx` |
| Create | `src/components/dashboard/PositionsPanel.tsx` |
| Create | `src/components/dashboard/ProtocolCompare.tsx` |
| Create | `src/hooks/useMultiWallet.ts` |
| Create | `src/hooks/usePositions.ts` |
| Update | `src/theme.ts` |
| Update | `src/components/markets/OverviewDashboard.tsx` → Remove (replaced by new dashboard) |

This is a large refactor. I recommend implementing phases 1-3 first (layout + dashboard + chat drawer), then phases 4-6 in follow-up iterations. Shall I proceed with phases 1-3?

