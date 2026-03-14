import { Box, Typography, Button } from "@mui/material";
import { useAccount } from "wagmi";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

interface Props {
  onAskChat: (prompt: string) => void;
}

export default function PositionsPanel({ onAskChat }: Props) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: 3,
          textAlign: "center",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid",
            borderColor: "divider",
            mb: 0.5,
          }}
        >
          <AccountBalanceOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Connect wallet to view positions
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.5 }}>
          See collateral, debt, health factors, and yield performance across protocols
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: (t) => t.palette.mode === "dark" ? "#1a2027" : "#f1f5f9",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "0.625rem",
            color: "text.secondary",
          }}
        >
          Your Positions
        </Typography>
        <Button
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: "12px !important" }} />}
          onClick={() => onAskChat("Show my positions across all protocols")}
          sx={{
            fontSize: "0.625rem",
            fontWeight: 700,
            textTransform: "none",
            minWidth: 0,
            px: 1,
            py: 0.25,
            color: "text.secondary",
            "&:hover": { color: "primary.main" },
          }}
        >
          View All
        </Button>
      </Box>

      {/* Body */}
      <Box sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.6 }}>
          Ask the assistant to fetch your positions across Aave, Compound, Morpho, and more.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={() => onAskChat("Show my positions across all protocols")}
          sx={{
            mt: 2,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 12,
            borderRadius: 2,
            py: 0.75,
          }}
        >
          Fetch positions
        </Button>
      </Box>
    </Box>
  );
}
