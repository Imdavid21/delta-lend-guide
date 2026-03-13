# 📘 Nebula — Technical Documentation

> **DeFi Yield Intelligence Platform**
> A real-time aggregator and AI-powered assistant for DeFi lending, vaults, and fixed-yield markets.

---

## 🎯 Purpose

Nebula solves a core problem in DeFi: **yield fragmentation**. Lending rates, vault APYs, and fixed-yield opportunities are scattered across dozens of protocols (Aave, Compound, Morpho Blue, Euler, Pendle, etc.) on multiple chains. Users have no single place to:

1. **Compare yields** across protocols in real time
2. **Discover opportunities** like looping strategies or high-APY vaults
3. **Execute transactions** (deposit, borrow, leverage) without leaving the interface
4. **Ask natural-language questions** about DeFi markets and get actionable answers

Nebula unifies all of this into a single dashboard with an AI chat assistant that can both inform and execute.

---

## 🧱 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Frontend (React + MUI)              │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Dashboard │  │ Market   │  │   Chat Dialog      │  │
│  │ (Hero,    │  │ Explorer │  │ (AI Assistant +    │  │
│  │  Yields,  │  │ (Tables) │  │  Tx Execution)     │  │
│  │ Positions)│  │          │  │                    │  │
│  └──────────┘  └──────────┘  └────────────────────┘  │
│       │              │               │                │
│       └──────────────┼───────────────┘                │
│                      │                                │
│              ┌───────▼───────┐                        │
│              │  CommandBar   │  ← ⌘K search + chat   │
│              └───────────────┘                        │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
         ┌─────────────┼──────────────┐
         ▼                            ▼
┌─────────────────┐          ┌─────────────────┐
│  Edge Function  │          │  Edge Function  │
│  /markets       │          │  /chat           │
│                 │          │                 │
│  Aggregates:    │          │  GPT-4o agent   │
│  - 1delta API   │          │  with 25+ tools │
│  - Morpho GQL   │          │  calls 1delta   │
│  - Pendle API   │          │  API for actions │
└────────┬────────┘          └────────┬────────┘
         │                            │
         ▼                            ▼
  ┌──────────────┐          ┌──────────────────┐
  │ 1delta API   │          │ 1delta API       │
  │ (rates/pools)│          │ (calldata/tx)    │
  ├──────────────┤          ├──────────────────┤
  │ Morpho Blue  │          │ OpenAI API       │
  │ GraphQL API  │          │ (GPT-4o)         │
  ├──────────────┤          └──────────────────┘
  │ Pendle API   │
  └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, MUI (Material UI) v6 |
| State | SWR (market data), React state (chat), localStorage (chat history, theme) |
| Wallet | Wagmi v2 + injected connector (MetaMask, etc.) |
| Routing | React Router v6 (single-page, no routes beyond `/`) |
| Backend | Lovable Cloud Edge Functions (Deno runtime) |
| AI | OpenAI GPT-4o with function calling (25+ tools) |
| Data Sources | 1delta Portal API, Morpho Blue GraphQL, Pendle Finance API |
| Styling | MUI ThemeProvider with custom dark/light theme |

---

## 🖥️ What the UI Shows

### 1. Hero Stats Bar (`HeroStats.tsx`)
Five stat cards at the top of the dashboard:
- **Best Lending APY** — highest supply APY across all lending protocols
- **Best Vault APY** — highest vault yield (Morpho Blue, Euler)
- **Best Fixed Yield** — highest Pendle implied APY
- **Total TVL** — aggregated TVL across all tracked markets
- **Markets Tracked** — total count of lending + vault + fixed yield markets

### 2. Top Yields (`TopYields.tsx`)
Three side-by-side ranked lists (top 5 each):
- **Top Lending Yields** — sorted by supply APY
- **Top Vault Yields** — sorted by vault APY, shows curator name for Morpho vaults
- **Top Fixed Yields** — sorted by Pendle implied APY, shows days to maturity

### 3. Positions Panel (`PositionsPanel.tsx`)
- Shows wallet connection prompt when disconnected
- When connected, provides a button to ask the AI to fetch positions across all protocols via 1delta's user-positions endpoint

### 4. Market Explorer (`MarketExplorer.tsx`)
Tabbed interface with four views:

| Tab | Component | Data Source | Features |
|-----|-----------|-------------|----------|
| **Lending** | `LendingTable.tsx` | `/markets?type=lending` | Asset filter, sortable columns (Asset, Protocol, Supply APY, Borrow APR, TVL, Utilization), Deposit action button |
| **Vaults** | `VaultsTable.tsx` | `/markets?type=vaults` | Shows Morpho Blue & Euler vaults with curator names, APY, TVL. Deposit action button |
| **Fixed Yield** | `FixedYieldTable.tsx` | `/markets?type=pendle` | Pendle markets with implied APY, days to maturity, TVL. Execution marked as "coming soon" |
| **Looping** | `LoopingStrategies.tsx` | Computed from lending data | Calculates net APY for leverage loop strategies (supply APY × leverage − borrow APR × (leverage−1)), risk levels, filterable by ETH/stablecoins |

### 5. Command Bar (`CommandBar.tsx`)
A unified search + chat input bar pinned to the bottom:
- **⌘K shortcut** to focus
- **Live search** across markets, vaults, Pendle, and navigation
- **Chat history autocomplete** from recent queries
- **Quick actions** dropdown with preset prompts
- Sends queries to the AI chat system

### 6. Chat Dialog (`AppShell.tsx` + `ChatPanel.tsx`)
A slide-up modal overlay containing:
- **Chat sidebar** (`ChatSidebar.tsx`) — chat history list, create/delete chats
- **Message bubbles** (`MessageBubble.tsx`) — renders markdown with:
  - **Entity chips** — clickable pills for tokens, chains, and markets
  - **Market cards** — rich inline cards with protocol icon, APY badge, and TVL
  - **Transaction executor** — step-by-step tx signing UI
  - **Simulation panel** — before/after health factor, collateral, debt
- **Suggestion buttons** — quick action CTA cards in empty chat state
- **Typing indicator** — animated dots while AI responds

### 7. Wallet Connection (`WalletButton.tsx`)
- Uses Wagmi's injected connector (MetaMask, Rabby, etc.)
- Shows truncated address with green status dot when connected
- Supports 16 chains (Ethereum, Arbitrum, Base, Optimism, Polygon, etc.)

---

## ⚙️ How It Works — Behind the Scenes

### Data Flow: Markets

```
User opens app
  → SWR hooks (useMarkets, useVaults, usePendle) fire
  → GET /functions/v1/markets?type=lending|vaults|pendle
  → Edge function checks 60s in-memory cache
  → Cache MISS: fetches from upstream APIs:
      • 1delta API → lending pools (Aave, Compound, Spark, etc.)
      • 1delta API → Morpho Blue + Euler pools
      • Morpho GraphQL API → vault names + curator metadata
      • Pendle API → fixed yield markets
  → Transforms, deduplicates, returns JSON
  → SWR caches client-side, refreshes every 60s
```

**Key transformation — Morpho vaults:**
The 1delta API uses `lenderKey` format like `MORPHO_BLUE_<hex>` where `<hex>` is a market's 32-byte `uniqueKey`. The edge function:
1. Fetches all Morpho vault metadata via GraphQL (vault address → curator name mapping)
2. Fetches all Morpho market metadata (uniqueKey → loan/collateral pair)
3. Matches the hex in `lenderKey` against market `uniqueKey` to resolve the pair name
4. Resolves curator names (Gauntlet, Steakhouse, RE7 Labs, etc.) for display

### Data Flow: Chat

```
User types message
  → POST /functions/v1/chat { query, history, userAddress? }
  → Edge function builds conversation with system prompt
  → Calls OpenAI GPT-4o with 25+ tool definitions
  → Agent loop:
      ├── search_markets → calls /markets edge function internally
      ├── find_market → 1delta API (get marketUid)
      ├── get_deposit_calldata → 1delta API (build tx)
      ├── get_leverage_calldata → 1delta API (flash loan loop)
      ├── get_user_positions → 1delta API (wallet positions)
      └── ... (25+ tools total)
  → Collects transaction steps + simulation quotes
  → Returns { response, transactions?, quote? }
  → Frontend renders markdown + MarketCards + TxExecutor
```

### Data Flow: Transaction Execution

```
AI returns transactions array
  → TxExecutor renders step list
  → User clicks "Execute Transactions"
  → For each step:
      1. Check chain — switchChainAsync if needed
      2. sendTransactionAsync({ to, data, value })
      3. Update status (idle → pending → success/error)
  → SimulationPanel shows before/after health factor
```

### Chat Conversation Memory
- Stored in **localStorage** (key: `lending-chats`)
- Each chat has: id, title (auto-set from first user message), messages array, createdAt
- Last 10 messages sent as context to the AI
- No server-side persistence — chats live on the user's device

### Theme System
- Custom MUI theme (`theme.ts`) with light/dark modes
- Dark: `#0a0a0a` background, `#fafafa` text
- Light: `#ffffff` background, `#0a0a0a` text
- Accent color: `#22c55e` (green) for positive yields
- Warning: `#f59e0b` (amber) for near-expiry markets
- Error: `#ef4444` (red) for high-risk indicators
- Stored in localStorage, syncs with `<html class="dark">`

---

## 🛠️ Edge Functions

### `/functions/v1/markets`
**Purpose:** Aggregates and normalizes market data from multiple protocols.

| Parameter | Values | Description |
|-----------|--------|-------------|
| `type` | `lending`, `vaults`, `pendle` | Which market category to fetch |

**Upstream APIs:**

| Source | Endpoint | Data |
|--------|----------|------|
| 1delta Portal | `/v1/data/lending/pools?chainId=1&count=200` | All lending pool rates, TVL, utilization |
| Morpho Blue GraphQL | `https://blue-api.morpho.org/graphql` | Vault names, curator info, market pairs |
| Pendle Finance | `https://api-v2.pendle.finance/core/v1/markets/all?chainId=1` | Fixed yield markets, implied APY, expiry |

**Caching:** 60-second in-memory cache per type. Returns `X-Cache: HIT/MISS` header.

**Filters:**
- Minimum TVL: $10,000 (hides dust markets)
- Lending: excludes Morpho Blue pools (those go to vaults)
- Pendle: excludes expired markets
- Deduplication by market ID

### `/functions/v1/chat`
**Purpose:** AI agent that answers DeFi questions and builds executable transactions.

**Model:** OpenAI GPT-4o with function calling

**Tools (25+):**

| Category | Tools | Purpose |
|----------|-------|---------|
| **Search** | `search_markets` | Unified search across lending/vaults/pendle (same data as UI) |
| **Discovery** | `find_market`, `get_lending_markets`, `get_lending_latest`, `get_lending_metadata` | Find specific markets, browse rates, get protocol configs |
| **User Data** | `get_user_positions`, `get_token_balances` | Wallet positions and balances |
| **Token Info** | `get_token_info`, `get_token_price` | Token metadata and USD prices |
| **Basic Actions** | `get_deposit_calldata`, `get_withdraw_calldata`, `get_borrow_calldata`, `get_repay_calldata` | Standard lending operations |
| **Leverage** | `get_leverage_calldata`, `get_close_leverage_calldata` | Open/close leveraged positions via flash loans |
| **Swaps** | `get_collateral_swap_calldata`, `get_debt_swap_calldata` | Change collateral or debt type atomically |
| **Batch** | `get_batch_calldata` | Multiple operations in one atomic tx |
| **Management** | `enable_collateral`, `disable_collateral`, `switch_emode`, `repay_with_atoken`, `list_emode_categories` | Collateral and E-Mode management |
| **Reference** | `get_supported_chains`, `get_lender_ids` | Protocol/chain lookups |

**System prompt behavior:**
- Informational queries → uses `search_markets` (never calls action tools)
- Action requests → requires wallet address, calls action tools, returns tx calldata
- Market results formatted as `{{market:ID;;PROTOCOL;;ASSET;;APY;;TVL|Label}}` for rich rendering
- Entity links: `[USDC](token:USDC)`, `[Ethereum](chain:1)` rendered as interactive chips

**Agent loop:** Iterates until `finish_reason !== "tool_calls"`, collecting transaction steps and simulation data. Max 10 messages of history sent for context.

---

## 📁 File Structure

```
src/
├── App.tsx                          # Root: theme, wagmi, router providers
├── theme.ts                         # MUI theme (light/dark)
├── config/wagmi.ts                  # Wagmi config: 16 chains, injected connector
├── hooks/
│   ├── useChats.ts                  # Chat state + localStorage persistence
│   └── useMarkets.ts                # SWR hooks for lending, vaults, pendle
├── lib/
│   └── marketTypes.ts               # Types (Market, Vault, PendleMarket) + formatters
├── components/
│   ├── AppShell.tsx                  # Main layout: dashboard + chat dialog + FAB
│   ├── AppHeader.tsx                 # Top bar: logo, wallet, theme toggle, chat toggle
│   ├── CommandBar.tsx                # Bottom search/chat input with ⌘K
│   ├── ChatPanel.tsx                 # Chat message list + empty state suggestions
│   ├── ChatSidebar.tsx              # Chat history dropdown menu
│   ├── MessageBubble.tsx            # Message rendering: markdown + entities + market cards
│   ├── EntityChip.tsx               # Interactive chip for tokens/chains/markets
│   ├── MarketCard.tsx               # Inline market pill (protocol icon, APY, TVL)
│   ├── TxExecutor.tsx               # Transaction signing stepper
│   ├── SimulationPanel.tsx          # Before/after simulation table
│   ├── WalletButton.tsx             # Connect/disconnect wallet
│   ├── icons/MarketIcons.tsx        # Asset + protocol icon components
│   ├── dashboard/
│   │   ├── HeroStats.tsx            # Top stat cards
│   │   ├── TopYields.tsx            # Top 5 yields per category
│   │   ├── PositionsPanel.tsx       # Wallet positions panel
│   │   ├── MarketExplorer.tsx       # Tabbed market tables
│   │   ├── LoopingStrategies.tsx    # Leverage loop calculator
│   │   ├── ProtocolCompare.tsx      # Protocol comparison view
│   │   └── AssetCompare.tsx         # Asset comparison view
│   └── markets/
│       ├── LendingTable.tsx         # Lending markets table
│       ├── VaultsTable.tsx          # Vaults table (Morpho + Euler)
│       ├── FixedYieldTable.tsx      # Pendle markets table
│       ├── AssetFilter.tsx          # Asset dropdown filter
│       └── MarketActionButton.tsx   # "Deposit" button → opens chat with prompt
supabase/
└── functions/
    ├── markets/index.ts             # Market aggregation edge function
    └── chat/index.ts                # AI agent edge function (GPT-4o + 25 tools)
```

---

## 🔑 Environment Variables & Secrets

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | `.env` (auto) | Backend URL for edge functions |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (auto) | Anon key for edge function auth |
| `VITE_PROJECT_ID` | `.env` (recommended) | Primary WalletConnect/Reown project ID (must allow your app origin for QR generation) |
| `WALLETCONNECT_PROJECT_ID` | `.env` (optional legacy) | Backward-compatible alias if older branches still reference this variable (used if `VITE_PROJECT_ID` is unset) |
| `OPENAI_API_KEY` | Edge function secret | GPT-4o API access |
| `ONEDELTA_API_KEY` | Edge function secret | 1delta Portal API access |

---

## 🔄 Data Refresh Cycle

| Data | Refresh Interval | Cache |
|------|-----------------|-------|
| Lending markets | 60s (SWR) | 60s server-side + 30s client dedup |
| Vaults | 60s (SWR) | 60s server-side + 30s client dedup |
| Pendle markets | 60s (SWR) | 60s server-side + 30s client dedup |
| Chat history | Instant (localStorage) | Persistent until cleared |
| Theme preference | Instant (localStorage) | Persistent |

---

## 🚀 Supported Protocols

### Lending (via 1delta)
Aave V2, Aave V3, Compound V2, Compound V3, Spark, Radiant V2, Moonwell, Mendi Finance, Silo Finance, ZeroLend, LayerBank, Seamless, Lendle, Aurelius, Yldr, Ironclad, Granary, Init Capital, Meridian

### Vaults
Morpho Blue (with curator metadata: Gauntlet, Steakhouse, RE7 Labs, Block Analitica, etc.), Euler

### Fixed Yield
Pendle Finance (Ethereum mainnet — PT/YT implied APY, maturity tracking)

### Supported Chains (Wallet)
Ethereum, Optimism, Arbitrum, Base, Polygon, BNB Chain, Avalanche, Mantle, Linea, Scroll, Blast, Mode, Gnosis, Metis, Manta, Fantom

---

## 💡 Key Design Decisions

1. **MUI over Tailwind for components** — The app uses Material UI for all components (not shadcn/Tailwind). This gives consistent theming, dark mode, and component behavior. Tailwind is installed but only used for utility classes in `index.css`.

2. **No backend database** — All user data (chat history, theme) is in localStorage. The edge functions are stateless data proxies. This means zero auth requirements for browsing.

3. **AI agent with tool calling** — Instead of hardcoded logic, the chat uses GPT-4o's function calling to dynamically decide which APIs to query. This makes it extensible without changing frontend code.

4. **Transaction execution in chat** — The AI returns raw calldata, and the frontend's `TxExecutor` component handles wallet interaction. This separates "what to do" (AI) from "how to sign" (frontend).

5. **Single-page dashboard** — No routing. Everything lives on one page with the chat as an overlay dialog. The command bar serves as both search and chat input.

6. **Market cards as structured output** — The AI uses a custom `{{market:...}}` syntax that the frontend parses into rich interactive cards, rather than plain text links.

---

*Last updated: March 2026*
