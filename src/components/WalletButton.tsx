import { Button, Chip } from "@mui/material";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <Chip
        label={short}
        onDelete={() => disconnect()}
        sx={{
          "& .MuiChip-deleteIcon": { color: "inherit" },
          fontFamily: "monospace",
          fontSize: 13,
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
      onClick={() => connect({ connector: injected() })}
    >
      Connect Wallet
    </Button>
  );
}
