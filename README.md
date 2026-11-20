# Nebula

DeFi yield intelligence. Nebula compares lending rates, vault APYs and fixed yield across Ethereum protocols in one dashboard, and adds an AI assistant that can answer questions about markets and prepare transactions for the user to sign.

Live: https://delta-lend-guide.vercel.app
Source: https://github.com/Imdavid21/delta-lend-guide
Agent backend (MCP server and multi provider client): https://github.com/Imdavid21/mcp-lending

## What it does

- Aggregates lending, vault and fixed yield markets with real time rates, filterable by chain, protocol and asset.
- Chat assistant for questions such as where the best stablecoin rate is, or what a looping strategy returns, with a simulation panel before anything is executed.
- Wallet connection and transaction preparation (deposit, borrow, leverage) that the user reviews and signs.
- Portfolio view of open positions across protocols.

Market data and transaction building come from the 1Delta API. The same tool layer is exposed to agents through the Model Context Protocol in the mcp-lending repository.

## Stack

React 18, Vite, TypeScript, Tailwind and shadcn/ui, wagmi and viem for wallets, TanStack Query, Recharts, Supabase edge functions (`chat`, `markets`, `prepare-tx`, `user-positions`).

## Run locally

```bash
npm install
cp .env.example .env   # add your Supabase project values
npm run dev
```

The three `VITE_SUPABASE_*` values are public client keys. Server side secrets for the edge functions are set in Supabase, never in this repo.

## Docs

Architecture and product notes are in [docs/NEBULA.md](docs/NEBULA.md).
