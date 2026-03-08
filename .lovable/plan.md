

## Plan: Morpho Curator Integration + ID-Based Market Mapping

### 1. Fetch Morpho Curator Data from GraphQL

**In `supabase/functions/markets/index.ts`**, expand the `fetchMorphoVaultNames` GraphQL query to also fetch curator information from `vaultV2s`:

```graphql
vaultV2s(first: 200, where: { chainId_in: [1] }) {
  items {
    address
    name
    symbol
    asset { symbol }
    curators {
      items {
        addresses {
          address
        }
      }
    }
    metadata {
      description
      image
    }
  }
}
```

The function will return a map with both `name` and `curator` per vault address. For markets (non-vault Morpho Blue pools), we'll also fetch the curator from the market's linked vaults.

Update `morphoVaultDisplayName` to produce names like **"Gauntlet USDC/wstETH"** or **"Steakhouse USDC"** when curator info is available (curator name + asset pair).

### 2. Add `curator` Field to Vault Response

Add an optional `curator` field to the vault objects returned by `/markets?type=vaults`. This flows through to the Vault type and UI.

**`src/lib/marketTypes.ts`** — add `curator?: string` to the `Vault` interface.

### 3. Show Curator in Vaults Table

**`src/components/markets/VaultsTable.tsx`** — display the curator name as a subtle label under the vault name or as a separate column/chip.

### 4. ID-Based Market Mapping for Chat ↔ UI

Currently the chat uses text-based matching (search by name/protocol). To ensure proper mapping:

- **Include `id` and `marketUid` in vault responses** from `/markets?type=vaults` (already present as `id`).
- **In `search_markets` results**, always pass through the `id` field so the chat can reference specific markets by ID.
- **Update the system prompt** to instruct the model to include `id` in markdown links: `[Vault Name](market:VAULT_ID)` where VAULT_ID is the actual market ID from the response.
- **Update `MessageBubble.tsx`** link handling to parse market IDs and pass them to the action prompt, e.g. `"Deposit into vault with id: XXX"`.
- **Update `MarketActionButton`** prompts in LendingTable and VaultsTable to include the market ID, ensuring the chat can find_market by exact ID rather than fuzzy name matching.

### 5. Chat Prompt Updates

Update the system prompt in `supabase/functions/chat/index.ts`:
- Instruct the model to use market `id` fields in links for precise identification.
- When showing Morpho vaults, include curator name in the description.
- Format vault links as `[Curator Asset Vault](market:MARKET_ID)`.

### Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/markets/index.ts` | Expand Morpho GraphQL query for curator data; add `curator` to vault response |
| `src/lib/marketTypes.ts` | Add `curator?: string` to Vault interface |
| `src/components/markets/VaultsTable.tsx` | Display curator info |
| `src/components/MessageBubble.tsx` | Parse market IDs from links; pass to action prompts |
| `src/components/markets/LendingTable.tsx` | Include `marketUid` in action button prompt (already does) |
| `supabase/functions/chat/index.ts` | Update prompt for ID-based linking and curator awareness |

