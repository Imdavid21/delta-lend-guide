import { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import LendingTable from "../markets/LendingTable";
import VaultsTable from "../markets/VaultsTable";
import FixedYieldTable from "../markets/FixedYieldTable";
// import Compare from "./Compare";
import LoopingStrategies from "./LoopingStrategies";

type MarketTab = "lending" | "vaults" | "fixed" | "looping";

export default function MarketExplorer() {
  const [tab, setTab] = useState<MarketTab>("lending");

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
        <Tab label="Lending" value="lending" />
        <Tab label="Vaults" value="vaults" />
        <Tab label="Fixed Yield" value="fixed" />
        <Tab label="Looping" value="looping" />
      </Tabs>
      <Box>
        {tab === "lending" && <LendingTable />}
        {tab === "vaults" && <VaultsTable />}
        {tab === "fixed" && <FixedYieldTable />}
        {tab === "looping" && <LoopingStrategies />}
        {tab === "compare" && <Compare />}
      </Box>
    </Box>
  );
}