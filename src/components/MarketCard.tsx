import { Box, ButtonBase, Typography } from "@mui/material";
import { AssetIcon, ProtocolIcon } from "./icons/MarketIcons";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

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
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function MarketCard({ label, marketId, protocol, asset, apy, tvl, onClick }: MarketCardProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width: "100%",
        px: 1.5,
        py: 1,
        my: 0.5,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.default",
        textAlign: "left",
        transition: "all 150ms ease",
        "&:hover": {
          borderColor: "text.secondary",
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Protocol + Asset icons stacked */}
      <Box sx={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
        <Box sx={{ position: "absolute", top: 0, left: 0 }}>
          <AssetIcon symbol={asset} size={24} />
        </Box>
        <Box sx={{ position: "absolute", bottom: -2, right: -4 }}>
          <ProtocolIcon name={protocol} size={16} />
        </Box>
      </Box>

      {/* Name + Protocol row */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: 12,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
          {protocol}
        </Typography>
      </Box>

      {/* APY */}
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: "#22c55e",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {apy}%
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 9 }}>
          APY
        </Typography>
      </Box>

      {/* TVL */}
      <Box sx={{ textAlign: "right", flexShrink: 0, minWidth: 52 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: 11, fontVariantNumeric: "tabular-nums" }}
        >
          {formatTVL(tvl)}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 9 }}>
          TVL
        </Typography>
      </Box>

      {/* Action arrow */}
      <OpenInNewIcon sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }} />
    </ButtonBase>
  );
}
