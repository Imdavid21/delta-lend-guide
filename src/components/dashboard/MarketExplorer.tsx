import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import UnifiedMarketsTable from "../markets/UnifiedMarketsTable";
import LendingTable from "../markets/LendingTable";

type MarketTab = "all_yields" | "borrow";

export default function MarketExplorer({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const [tab, setTab] = useState<MarketTab>(viewMode === "borrow" ? "borrow" : "all_yields");

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          minHeight: 36,
          mb: 2,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            minHeight: 36,
            py: 0.5,
            px: 2,
          },
          "& .MuiTabs-indicator": { height: 2 },
        }}
      >
        <Tab label="Lending & Vaults" value="all_yields" />
        <Tab label="Borrow" value="borrow" />
      </Tabs>

      {tab === "all_yields" && <UnifiedMarketsTable />}
      {tab === "borrow" && <LendingTable viewMode="borrow" showTitle={false} />}
    </Box>
  );
}
