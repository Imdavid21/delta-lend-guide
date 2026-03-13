

## Plan: Add "See All" buttons to TopYields cards with dedicated routes

### Current State
- `TopYields` shows 3 cards (Top Lending, Top Vaults, Top Fixed) with 5 items each
- `MarketExplorer` below shows the full tables (LendingTable, VaultsTable, FixedYieldTable) in a tabbed view
- Both sections live inside `DashboardContainer` on the same page

### Changes

**1. Add "See All" to YieldCard (`TopYields.tsx`)**
- Add an `onSeeAll` callback prop to `YieldCard`
- Render a "See All" link/button in the card header, aligned right
- Each card gets a corresponding callback

**2. Add dedicated routes (`AppShell.tsx`)**
- Add routes: `/lending/markets`, `/lending/vaults`, `/lending/fixed`
- Each route renders the corresponding full table component (LendingTable, VaultsTable, FixedYieldTable) with a back button
- Create a simple wrapper component (`MarketPage`) that wraps the table with a header + back navigation

**3. Wire navigation**
- Pass `useNavigate` into `TopYields` via a new `onSeeAll` prop (or use navigate directly)
- "See All" on Top Lending Yields navigates to `/lending/markets`
- "See All" on Top Vault Yields navigates to `/lending/vaults`  
- "See All" on Top Fixed Yields navigates to `/lending/fixed`

**4. Remove MarketExplorer from DashboardContainer**
- Since the full tables now have dedicated pages, remove the `MarketExplorer` tabbed section from the bottom of the dashboard to declutter the landing page

### Files Modified
- `src/components/dashboard/TopYields.tsx` — add "See All" button to each card header
- `src/components/AppShell.tsx` — add new routes, remove MarketExplorer from DashboardContainer
- `src/components/dashboard/MarketPage.tsx` (new) — reusable wrapper with back nav + full table

