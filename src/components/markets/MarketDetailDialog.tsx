import {
  Dialog, DialogTitle, DialogContent, Table, TableBody, TableRow, TableCell, Chip, Typography,
} from "@mui/material";
import type { Market } from "@/lib/marketTypes";
import { formatPercent, formatUSD } from "@/lib/marketTypes";

interface Props {
  market: Market | null;
  open: boolean;
  onClose: () => void;
}

export default function MarketDetailDialog({ market, open, onClose }: Props) {
  if (!market) return null;

  const rows: [string, React.ReactNode][] = [
    ["Protocol", market.protocolName],
    ["Chain", <Chip key="c" label={market.chainName} size="small" sx={{ bgcolor: "#FF660020", color: "#FF6600", fontWeight: 600 }} />],
    ["Asset", <Typography key="a" fontFamily="monospace" fontWeight={700}>{market.asset}</Typography>],
    ["Market UID", <Typography key="u" fontFamily="monospace" variant="caption">{market.marketUid}</Typography>],
    ["Supply APY", <Typography key="s" sx={{ color: market.supplyAPY > 5 ? "success.main" : "text.primary", fontWeight: 600 }}>{formatPercent(market.supplyAPY)}</Typography>],
    ["Borrow APR", formatPercent(market.borrowAPR)],
    ["Total Supply", formatUSD(market.totalSupplyUSD)],
    ["Available Liquidity", formatUSD(market.availableLiquidityUSD)],
    ["Utilization", <Typography key="ut" sx={{ color: (market.utilizationRate ?? 0) > 80 ? "warning.main" : "text.primary" }}>{formatPercent(market.utilizationRate)}</Typography>],
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {market.asset} on {market.protocolName}
      </DialogTitle>
      <DialogContent>
        <Table size="small">
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary", border: 0, pl: 0 }}>
                  {label}
                </TableCell>
                <TableCell sx={{ border: 0 }}>{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
