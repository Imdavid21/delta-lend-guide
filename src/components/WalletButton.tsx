import { Box, Button, Tooltip } from "@mui/material";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <Tooltip title="Click to manage wallet">
        <Box
          component="button"
          onClick={() => open()}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.875,
            px: 1.5,
            py: 0.6,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: (t) => t.palette.mode === "dark" ? "#1f262e" : "#f1f5f9",
            cursor: "pointer",
            transition: "all 200ms ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "rgba(0,255,157,0.05)",
            },
          }}
        >
          {/* Green pulse dot */}
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: "#00FF9D",
              boxShadow: "0 0 6px rgba(0,255,157,0.5)",
              flexShrink: 0,
            }}
          />
          <Box
            component="span"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "0.01em",
            }}
          >
            {short}
          </Box>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={() => open()}
      sx={{
        fontWeight: 700,
        borderRadius: 1.5,
        px: 2,
        fontSize: "0.75rem",
        textTransform: "none",
      }}
    >
      Connect Wallet
    </Button>
  );
}
