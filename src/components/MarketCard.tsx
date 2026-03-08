import { Box, ButtonBase, Typography } from "@mui/material";
import { AssetIcon, ProtocolIcon } from "./icons/MarketIcons";

interface MarketCardProps {
  label: string;
  marketId: string;
  protocol: string;
  asset: string;
  apy: string;
  tvl: string;
  onClick: () => void;
}

function formatTVL(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function MarketCard({ label, marketId, protocol, asset, apy, tvl, onClick }: MarketCardProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.75,
        my: 0.4,
        mr: 0.5,
        borderRadius: "999px",
        bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        textAlign: "left",
        transition: "all 150ms ease",
        "&:hover": {
          bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Green status dot */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "#22c55e",
          flexShrink: 0,
          boxShadow: "0 0 6px rgba(34,197,94,0.5)",
        }}
      />

      {/* Protocol icon */}
      <ProtocolIcon name={protocol} size={16} />

      {/* Label */}
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: 12,
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>

      {/* APY badge */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: 11,
          color: "#22c55e",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {apy}%
      </Typography>

      {/* TVL */}
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500,
          fontSize: 10,
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {formatTVL(tvl)}
      </Typography>
    </ButtonBase>
  );
}
