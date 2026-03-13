import { Box, Typography, Paper, TextField, Button, Alert } from "@mui/material";
import { useAccount } from "wagmi";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function Account() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
        <Alert severity="warning">Please connect your wallet to view account details.</Alert>
      </Box>
    );
  }

  // Dummy keys based on address
  const apiKey = `klyro_live_${address?.substring(2, 24)}`;
  const mcpConfig = `{
  "mcpServers": {
    "klyro-defi": {
      "command": "npx",
      "args": ["-y", "@klyro/mcp-server"],
      "env": {
        "KLYRO_API_KEY": "${apiKey}"
      }
    }
  }
}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        Account & Integration
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          API Key
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Use this API key to authenticate requests to the Klyro DeFi intelligence API. Keep your key secure and do not share it publicly.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            value={apiKey}
            fullWidth
            size="small"
            InputProps={{ readOnly: true, sx: { fontFamily: "monospace", fontSize: 13 } }}
          />
          <Button
            variant="outlined"
            onClick={() => handleCopy(apiKey)}
            startIcon={<ContentCopyIcon fontSize="small" />}
            sx={{ whiteSpace: "nowrap" }}
          >
            Copy
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          MCP Server Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add this to your Claude Desktop config (<code>claude_desktop_config.json</code>) or Cursor config to enable the Klyro Model Context Protocol server. This allows your AI assistant to directly query DeFi yields, simulate transactions, and manage your portfolio.
        </Typography>
        <Box sx={{ position: "relative" }}>
          <TextField
            multiline
            rows={8}
            value={mcpConfig}
            fullWidth
            InputProps={{
              readOnly: true,
              sx: { fontFamily: "monospace", fontSize: 13, bgcolor: "action.hover" },
            }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => handleCopy(mcpConfig)}
            startIcon={<ContentCopyIcon fontSize="small" />}
            sx={{ position: "absolute", top: 12, right: 12, textTransform: "none" }}
          >
            Copy JSON
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
