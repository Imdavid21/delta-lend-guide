import { Box, Paper, Typography, Button } from "@mui/material";
import { useAccount } from "wagmi";

interface Props {
  onAskChat: (prompt: string) => void;
}

export default function PositionsPanel({ onAskChat }: Props) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <Paper
        elevation={0}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          p: 3,
          textAlign: "center",
          bgcolor: "background.default",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Connect a wallet to view your positions
        </Typography>
        <Typography variant="caption" color="text.disabled">
          See collateral, debt, health factors, and yield performance across protocols
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        p: 2.5,
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: 10,
            color: "text.secondary",
          }}
        >
          Your Positions
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onAskChat("Show my positions across all protocols")}
          sx={{
            fontSize: 11,
            fontWeight: 700,
            py: 0.25,
            px: 1.5,
            minWidth: 0,
            borderRadius: 3,
            borderColor: "divider",
            color: "text.primary",
            textTransform: "none",
            "&:hover": {
              bgcolor: "text.primary",
              color: "background.default",
              borderColor: "text.primary",
            },
          }}
        >
          View All
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
        Ask the assistant to fetch your positions across Aave, Compound, Morpho, and more.
      </Typography>
    </Paper>
  );
}
