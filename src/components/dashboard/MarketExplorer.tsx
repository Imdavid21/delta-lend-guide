import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import LendingTable from "../markets/LendingTable";
import VaultsTable from "../markets/VaultsTable";
import LoopingStrategies from "./LoopingStrategies";

type MarketTab = "all_yields" | "borrow" | "looping";

export default function MarketExplorer({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const [tab, setTab] = useState<MarketTab>("all_yields");

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
        <Tab label="Looping" value="looping" />
      </Tabs>
      <Box>
        {tab === "all_yields" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <LendingTable viewMode="lending" showTitle={false} />
            <VaultsTable showTitle={false} />
          </Box>
        )}
        {tab === "borrow" && <LendingTable viewMode="borrow" showTitle={false} />}
        {tab === "looping" && <LoopingStrategies />}
      </Box>
    </Box>
  );
}
