import { Box, Typography, Alert, IconButton, Tooltip, Chip } from "@mui/material";
import { useAccount } from "wagmi";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

function SectionCard({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const handleCopy = () => navigator.clipboard.writeText(text);
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          color: "text.disabled",
          borderRadius: 1.5,
          "&:hover": { color: "primary.main", bgcolor: "rgba(0,255,157,0.07)" },
        }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export default function Account() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
        <Alert
          severity="warning"
          sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}
        >
          Please connect your wallet to view account details.
        </Alert>
      </Box>
    );
  }

  const apiKey = `nebula_live_${address?.substring(2, 24)}`;
  const mcpConfig = `{
  "mcpServers": {
    "nebula-defi": {
      "command": "npx",
      "args": ["-y", "@nebula/mcp-server"],
      "env": {
        "NEBULA_API_KEY": "${apiKey}"
      }
    }
  }
}`;

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", mt: 2 }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontSize: "0.625rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "primary.main",
            mb: 0.5,
          }}
        >
          Developer Portal
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.03em" }}>
          Account & Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 560 }}>
          Manage your API keys, configure Model Context Protocol servers, and connect external tools.
        </Typography>
      </Box>

      {/* Bento grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
          mb: 2,
        }}
      >
        {/* API Key card */}
        <SectionCard>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  bgcolor: "rgba(0,255,157,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(0,255,157,0.2)",
                }}
              >
                <KeyOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
              </Box>
              <Box>
                <Typography fontWeight={700} fontSize={15}>API Key</Typography>
                <Typography variant="caption" color="text.secondary">
                  Authenticate programmatic requests
                </Typography>
              </Box>
            </Box>
            <Chip
              label="Active"
              size="small"
              sx={{
                fontSize: "0.625rem",
                fontWeight: 800,
                height: 22,
                bgcolor: "rgba(0,255,157,0.1)",
                color: "primary.main",
                border: "1px solid rgba(0,255,157,0.25)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            />
          </Box>

          {/* Key display */}
          <Box>
            <Typography
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "text.secondary",
                mb: 0.75,
              }}
            >
              Nebula Live Token
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: (t) => t.palette.mode === "dark" ? "#1a2027" : "#f1f5f9",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                px: 1.5,
                py: 1.25,
              }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }} />
              <Typography
                component="code"
                sx={{
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "primary.main",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {apiKey}
              </Typography>
              <CopyButton text={apiKey} label="Copy API key" />
            </Box>
          </Box>

          {/* Key stats */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
              mt: 2,
            }}
          >
            {[
              { label: "Usage Limit", value: "100k / month" },
              { label: "Total Requests", value: "42,891" },
            ].map(({ label, value }) => (
              <Box
                key={label}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ fontSize: "0.625rem", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>
                  {label}
                </Typography>
                <Typography fontWeight={800} fontSize={15} sx={{ letterSpacing: "-0.02em" }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        {/* Status card */}
        <SectionCard>
          <Typography fontWeight={700} fontSize={15} sx={{ mb: 2.5 }}>
            Connection Status
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, mb: 3 }}>
            {[
              { label: "Connection", value: "Stable", valueColor: "secondary.main", showDot: true },
              { label: "Latency", value: "14ms", valueColor: "#78dfff" },
              { label: "Plan", value: "Institutional", valueColor: "text.primary" },
            ].map(({ label, value, valueColor, showDot }, i) => (
              <Box
                key={label}
                sx={{
                  textAlign: "center",
                  py: 1.5,
                  borderLeft: i > 0 ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <Typography
                  sx={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary", mb: 0.75 }}
                >
                  {label}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                  {showDot && (
                    <FiberManualRecordIcon sx={{ fontSize: 10, color: "secondary.main" }} />
                  )}
                  <Typography fontWeight={700} fontSize={13} sx={{ color: valueColor }}>
                    {value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Wallet info */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: (t) => t.palette.mode === "dark" ? "#1a2027" : "#f1f5f9",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <FiberManualRecordIcon sx={{ fontSize: 10, color: "primary.main" }} />
            <Typography sx={{ fontFamily: "monospace", fontSize: 12, color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {address}
            </Typography>
            <CopyButton text={address ?? ""} label="Copy address" />
          </Box>
        </SectionCard>
      </Box>

      {/* MCP Config card (full width) */}
      <SectionCard sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: "rgba(100,249,195,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(100,249,195,0.2)",
              }}
            >
              <HubOutlinedIcon sx={{ fontSize: 18, color: "secondary.main" }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={15}>MCP Server Configuration</Typography>
              <Typography variant="caption" color="text.secondary">
                Add this to your Claude Desktop or Cursor config
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Copy JSON">
            <Box
              component="button"
              onClick={() => navigator.clipboard.writeText(mcpConfig)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                bgcolor: "transparent",
                color: "secondary.main",
                fontSize: "0.6875rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 200ms ease",
                "&:hover": {
                  bgcolor: "rgba(100,249,195,0.07)",
                  borderColor: "rgba(100,249,195,0.3)",
                },
              }}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
              Copy JSON
            </Box>
          </Tooltip>
        </Box>

        <Box
          sx={{
            bgcolor: (t) => t.palette.mode === "dark" ? "#0a0a0a" : "#0f172a",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 2.5,
            overflow: "auto",
            position: "relative",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.7,
              color: "#a7abb2",
              whiteSpace: "pre",
            }}
          >
            <span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"  "}<span style={{ color: "#64f9c3" }}>{`"mcpServers"`}</span>
            {`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"    "}<span style={{ color: "#64f9c3" }}>{`"nebula-defi"`}</span>
            {`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"command"`}</span>
            {`: `}<span style={{ color: "#00FF9D" }}>{`"npx"`}</span>{",\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"args"`}</span>
            {`: `}<span style={{ color: "#78dfff" }}>{`[`}</span>
            <span style={{ color: "#00FF9D" }}>{`"-y"`}</span>
            {`, `}<span style={{ color: "#00FF9D" }}>{`"@nebula/mcp-server"`}</span>
            <span style={{ color: "#78dfff" }}>{`]`}</span>{",\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"env"`}</span>
            {`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"        "}<span style={{ color: "#64f9c3" }}>{`"NEBULA_API_KEY"`}</span>
            {`: `}<span style={{ color: "#00FF9D" }}>{`"${apiKey}"`}</span>{"\n"}
            {"      "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            {"    "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            {"  "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            <span style={{ color: "#78dfff" }}>{`}`}</span>
          </pre>
        </Box>

        {/* Info banner */}
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: "rgba(120,223,255,0.05)",
            border: "1px solid rgba(120,223,255,0.15)",
            borderRadius: 2,
            display: "flex",
            alignItems: "flex-start",
            gap: 1.25,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16, color: "#78dfff", flexShrink: 0, mt: 0.1 }} />
          <Box>
            <Typography sx={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78dfff", mb: 0.25 }}>
              Local Development
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              The Nebula MCP server enables secure context-aware interactions between your AI assistant and DeFi market data. Compatible with Claude Desktop, Cursor, and any MCP-compatible client.
            </Typography>
          </Box>
        </Box>
      </SectionCard>

      {/* Connected apps (2-col) */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <SectionCard>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
            <LinkOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography sx={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.secondary" }}>
              Connected Apps
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[
              { name: "Visual Studio Code", sub: "Extension v4.2", icon: "{ }" },
              { name: "Cursor AI", sub: "MCP Tunnel", icon: "✦" },
            ].map(({ name, sub, icon }) => (
              <Box
                key={name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  "&:hover": { borderColor: "rgba(0,255,157,0.2)", bgcolor: "rgba(0,255,157,0.03)" },
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: "action.hover",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "text.secondary",
                    flexShrink: 0,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={13} noWrap>{name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {sub}
                  </Typography>
                </Box>
                <Typography sx={{ color: "text.disabled", fontSize: 18 }}>›</Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        <SectionCard>
          <Typography sx={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.secondary", mb: 2.5 }}>
            Webhooks
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 100,
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 200ms ease",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(0,255,157,0.03)" },
              gap: 0.75,
            }}
          >
            <Typography sx={{ fontSize: 20, color: "text.disabled" }}>+</Typography>
            <Typography sx={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "text.disabled" }}>
              Add Webhook Endpoint
            </Typography>
          </Box>
        </SectionCard>
      </Box>
    </Box>
  );
}
