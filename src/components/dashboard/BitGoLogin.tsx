import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import { useState } from "react";
import { useWalletMode } from "../../hooks/useWalletMode";

export default function BitGoLogin() {
  const { setBitgoToken, setEnterpriseId } = useWalletMode();
  const [token, setToken] = useState("");
  const [eid, setEid] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    if (!token || !eid) {
      setError("Please provide both API Token and Enterprise ID");
      return;
    }
    setBitgoToken(token);
    setEnterpriseId(eid);
  };

  return (
    <Box sx={{ maxWidth: 450, mx: "auto", mt: 8 }}>
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
          Institutional Login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Connect your BitGo enterprise account to manage custodial wallets and multi-signer transactions.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="BitGo API Token"
            type="password"
            fullWidth
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="api_..."
          />
          <TextField
            label="Enterprise ID"
            fullWidth
            value={eid}
            onChange={(e) => setEid(e.target.value)}
            placeholder="64f..."
          />
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleLogin}
            sx={{ mt: 1, py: 1.5, fontWeight: 700 }}
          >
            Connect BitGo
          </Button>
        </Box>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: "block" }}>
          By connecting, you authorize Klyro to construct transaction requests for your authorization.
        </Typography>
      </Paper>
    </Box>
  );
}
