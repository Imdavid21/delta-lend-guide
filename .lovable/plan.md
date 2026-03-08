

# Expand Chat Agent with Full 1delta API Coverage

## What's Missing

Comparing the uploaded API docs against our current `chat/index.ts`, we're missing:

### Missing Data Tools
- `/v1/data/lending/latest` — rate snapshots with enriched price/yield data
- `/v1/data/meta/lending/complete` — protocol metadata (supported assets, configs)

### Missing Action Tools (Leveraged / Advanced)
- **Leverage open**: `/v1/actions/loop/leverage` — atomic borrow→swap→deposit
- **Leverage close**: `/v1/actions/loop/close` — unwind leveraged position
- **Collateral swap**: `/v1/actions/loop/collateral-swap` — change collateral type
- **Debt swap**: `/v1/actions/loop/debt-swap` — change debt type
- **Batch operations**: `/v1/actions/allocate/multi-op` (POST) — multiple lending ops in one tx

### Missing but Less Critical
- Enable/disable collateral
- E-mode listing and switching
- Repay with aToken

## Plan

### 1. Update `supabase/functions/chat/index.ts`

Add 5 new tools to `TOOLS` array and corresponding `dispatchTool` cases:

| Tool Name | API Endpoint | Key Params |
|-----------|-------------|------------|
| `get_leverage_calldata` | `/actions/loop/leverage` | `marketUidIn`, `marketUidOut`, `debtAmount`, `slippage`, `leverage`, `operator` |
| `get_close_leverage_calldata` | `/actions/loop/close` | `marketUidIn`, `marketUidOut`, `amount`, `slippage`, `operator` |
| `get_collateral_swap_calldata` | `/actions/loop/collateral-swap` | `marketUidIn`, `marketUidOut`, `amount`, `slippage`, `operator` |
| `get_debt_swap_calldata` | `/actions/loop/debt-swap` | `marketUidIn`, `marketUidOut`, `amount`, `slippage`, `operator` |
| `get_lending_metadata` | `/data/meta/lending/complete` | `chainIds`, `lenders` |

- Add all 5 to `ACTION_TOOLS` set (except `get_lending_metadata` which is data-only)
- Add `simulate: true` to all action tool requests

### 2. Update System Prompt

Add to `SYSTEM_PROMPT`:
- Leveraged operations section explaining when to use loop tools
- Note that `marketUidIn` = debt market, `marketUidOut` = collateral market for leverage
- Slippage is in bps (e.g. 50 = 0.5%)
- Reference to `deltaCompose` — explain that all transactions go through this single entry point
- Note that flash loans are used internally by the API for leverage/close operations

### 3. Update `extractAction` 

The leverage/close endpoints return the same `actions.permissions` + `actions.transactions` envelope, so the existing `extractAction` already handles them. Just need to add the new tool names to `ACTION_TOOLS`.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/chat/index.ts` | Add 5 tools, 5 dispatch cases, expand system prompt |

No frontend changes needed — the existing `TxExecutor` already handles multi-step transactions with approvals.

