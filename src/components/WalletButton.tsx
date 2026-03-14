import { Button } from "@mui/material";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useEnsIdentity } from "@/hooks/useEns";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { ensName, ensAvatar, displayName } = useEnsIdentity(address);

  if (isConnected && address) {
    return (
      <button
        onClick={() => open()}
        title="Click to manage wallet"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 10px 5px 7px",
          border: "1px solid rgba(67,72,78,0.4)",
          borderRadius: 10,
          background: "#1f262e",
          cursor: "pointer",
          transition: "all 200ms ease",
          fontFamily: "Inter, sans-serif",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,255,157,0.4)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,157,0.06)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(67,72,78,0.4)";
          (e.currentTarget as HTMLButtonElement).style.background = "#1f262e";
        }}
      >
        {/* Avatar or pulse dot */}
        {ensAvatar ? (
          <img
            src={ensAvatar}
            alt={ensName ?? address}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1.5px solid #86efac",
              boxShadow: "0 0 6px rgba(0,255,157,0.4)",
              flexShrink: 0,
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#86efac",
            boxShadow: "0 0 6px rgba(0,255,157,0.5)",
            flexShrink: 0,
          }} />
        )}

        {/* Display name */}
        <span style={{
          fontFamily: ensName ? "Inter, sans-serif" : "monospace",
          fontSize: ensName ? "0.8rem" : "0.75rem",
          fontWeight: 700,
          color: "#eaeef5",
          letterSpacing: ensName ? "-0.01em" : "0.01em",
        }}>
          {displayName}
        </span>
      </button>
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
