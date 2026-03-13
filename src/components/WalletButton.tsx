import { Button, Chip } from "@mui/material";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <Chip
        label={short}
        onDelete={() => disconnect()}
        variant="outlined"
        sx={{
          "& .MuiChip-deleteIcon": { color: "inherit" },
          fontFamily: "monospace",
          fontSize: 12,
          borderColor: "divider",
          fontWeight: 600,
        }}
        icon={
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block",
              marginLeft: 8,
            }}
          />
        }
      />
    );
  }

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={() => open()}
      sx={{ fontWeight: 700, borderRadius: 4, px: 2 }}
    >
      Connect Wallet
    </Button>
  );
}
