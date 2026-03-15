import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import LendingTable from "../markets/LendingTable";
import VaultsTable from "../markets/VaultsTable";
import LoopingStrategies from "./LoopingStrategies";

type MarketTab = "lending" | "vaults" | "looping";

export default function MarketExplorer({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const [tab, setTab] = useState<MarketTab>("lending");
  const isLending = viewMode === "lending";

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
          "& .MuiTabs-indicator": {
            height: 2,
          },
        }}
      >
        <Tab label={isLending ? "Lending" : "Markets"} value="lending" />
        {isLending && <Tab label="Vaults" value="vaults" />}
        <Tab label="Looping" value="looping" />
      </Tabs>
      <Box>
        {tab === "lending" && <LendingTable viewMode={viewMode} />}
        {isLending && tab === "vaults" && <VaultsTable />}
        {tab === "looping" && <LoopingStrategies />}
      </Box>
    </Box>
  );
}
