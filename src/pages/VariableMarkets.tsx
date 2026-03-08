import { useState } from "react";
import { Box, Typography, CircularProgress, Alert, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { Market } from "@/lib/marketTypes";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { useMarkets } from "@/hooks/useMarkets";
import MarketDetailDialog from "@/components/markets/MarketDetailDialog";

const columns: GridColDef<Market>[] = [
  { field: "protocolName", headerName: "Protocol", flex: 1, minWidth: 120 },
  {
    field: "chainName",
    headerName: "Chain",
    width: 130,
    renderCell: (p) => (
      <Chip
        label={p.value}
        size="small"
        sx={{ bgcolor: "#FF660020", color: "#FF6600", fontWeight: 600, fontSize: "0.75rem" }}
      />
    ),
  },
  {
    field: "asset",
    headerName: "Asset",
    width: 100,
    renderCell: (p) => (
      <Typography fontFamily="monospace" fontWeight={700} fontSize="0.875rem">
        {p.value}
      </Typography>
    ),
  },
  {
    field: "supplyAPY",
    headerName: "Supply APY",
    width: 120,
    type: "number",
    renderCell: (p) => (
      <Typography sx={{ color: (p.value as number) > 5 ? "success.main" : "text.primary", fontWeight: 600 }}>
        {formatPercent(p.value as number)}
      </Typography>
    ),
  },
  {
    field: "supplyAPYWithIncentives",
    headerName: "w/ Incentives",
    width: 130,
    type: "number",
    renderCell: (p) => (
      <Typography sx={{ color: "info.main", fontWeight: 600 }}>
        {formatPercent(p.value as number)}
      </Typography>
    ),
  },
  {
    field: "totalSupplyUSD",
    headerName: "Total Supply",
    width: 130,
    type: "number",
    renderCell: (p) => formatUSD(p.value as number),
  },
  {
    field: "availableLiquidityUSD",
    headerName: "Available",
    width: 130,
    type: "number",
    renderCell: (p) => formatUSD(p.value as number),
  },
  {
    field: "utilizationRate",
    headerName: "Utilization",
    width: 110,
    type: "number",
    renderCell: (p) => (
      <Typography sx={{ color: (p.value as number) > 80 ? "warning.main" : "text.primary" }}>
        {formatPercent(p.value as number)}
      </Typography>
    ),
  },
];

export default function VariableMarkets() {
  const { data: markets, error, isLoading } = useMarkets();
  const [selected, setSelected] = useState<Market | null>(null);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: "#FF6600" }} />
      </Box>
    );
  }
  if (error) return <Alert severity="error">Failed to load markets</Alert>;

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Variable Lending Markets
      </Typography>
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-columnHeaders": {
            bgcolor: "#fafaf9",
            fontSize: "0.8125rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.025em",
            color: "#525252",
          },
          "& .MuiDataGrid-row:hover": { bgcolor: "#fafaf9", cursor: "pointer" },
        }}
      >
        <DataGrid
          rows={markets ?? []}
          columns={columns}
          initialState={{
            sorting: { sortModel: [{ field: "supplyAPY", sort: "desc" }] },
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          pageSizeOptions={[25, 50, 100]}
          onRowClick={(p) => setSelected(p.row)}
          disableRowSelectionOnClick
          autoHeight
        />
      </Box>
      <MarketDetailDialog market={selected} open={!!selected} onClose={() => setSelected(null)} />
    </Box>
  );
}
