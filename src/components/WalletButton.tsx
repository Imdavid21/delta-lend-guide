import { useState } from "react";
import { Button, Chip, Menu, MenuItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const injectedConnector = connectors.find((c) => c.id === "injected");
  const wcConnector = connectors.find((c) => c.id === "walletConnect");

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ fontWeight: 700, borderRadius: 4, px: 2 }}
      >
        Connect Wallet
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 3,
              minWidth: 220,
              border: 1,
              borderColor: "divider",
            },
          },
        }}
      >
        {injectedConnector && (
          <MenuItem
            onClick={() => {
              connect({ connector: injectedConnector });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <AccountBalanceWalletIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" fontWeight={600}>
                Browser Wallet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                MetaMask, Rabby, etc.
              </Typography>
            </ListItemText>
          </MenuItem>
        )}
        {wcConnector && (
          <MenuItem
            onClick={() => {
              connect({ connector: wcConnector });
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <QrCode2Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" fontWeight={600}>
                WalletConnect
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Scan QR code
              </Typography>
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
