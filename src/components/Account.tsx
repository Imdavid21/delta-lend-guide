import { useState, useEffect } from "react";
import { Box, Typography, Alert, IconButton, Tooltip } from "@mui/material";
import { useAccount } from "wagmi";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useEnsIdentity } from "@/hooks/useEns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type StatusState = "checking" | "ok" | "error";

function useApiHealth() {
  const [status, setStatus] = useState<StatusState>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      setStatus("checking");
      const t0 = performance.now();
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/markets?type=lending`, {
          headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
          signal: AbortSignal.timeout(8000),
        });
        if (cancelled) return;
        setLatencyMs(Math.round(performance.now() - t0));
        setStatus(res.ok ? "ok" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return { status, latencyMs };
}

function StatusDot({ status }: { status: StatusState }) {
  const color =
    status === "ok" ? "#00FF9D"
    : status === "error" ? "#ff716c"
    : "#f59e0b";
  return (
    <FiberManualRecordIcon
      sx={{ fontSize: 9, color, animation: status === "checking" ? "pulse 1.2s ease-in-out infinite" : "none" }}
    />
  );
}

function SectionCard({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, p: 3, ...sx }}>
      {children}
    </Box>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={() => navigator.clipboard.writeText(text)}
        sx={{ color: "text.disabled", borderRadius: 1.5, "&:hover": { color: "primary.main", bgcolor: "rgba(0,255,157,0.07)" } }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export default function Account() {
  const { isConnected, address } = useAccount();
  const { ensName, ensAvatar } = useEnsIdentity(address);
  const { status: apiStatus, latencyMs } = useApiHealth();

  if (!isConnected) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          Please connect your wallet to view account details.
        </Alert>
      </Box>
    );
  }

  const mcpConfig = `{
  "mcpServers": {
    "nebula-defi": {
      "command": "npx",
      "args": ["-y", "@nebula/mcp-server"],
      "env": {
        "NEBULA_API_KEY": "${address}"
      }
    }
  }
}`;

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", mt: 2 }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

      {/* Identity header */}
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 3 }}>
        {ensAvatar ? (
          <Box component="img" src={ensAvatar} alt={ensName ?? address}
            sx={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid", borderColor: "primary.main", objectFit: "cover" }} />
        ) : (
          <Box sx={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(0,255,157,0.25), rgba(82,152,255,0.25))",
            border: "2px solid", borderColor: "primary.main",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "primary.main",
          }}>
            {(address ?? "?")[2].toUpperCase()}
          </Box>
        )}
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.03em" }}>
            {ensName ?? "Account"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontFamily: "monospace", fontSize: "0.75rem" }}>
            {address}
          </Typography>
        </Box>
        <CopyButton text={address ?? ""} label="Copy address" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2, mb: 2 }}>

        {/* Live API Status */}
        <SectionCard>
          <Typography fontWeight={700} fontSize={14} sx={{ mb: 2.5 }}>API Status</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Markets endpoint */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StatusDot status={apiStatus} />
                <Typography fontSize={13} fontWeight={600}>Markets API</Typography>
              </Box>
              <Typography fontSize={12} color="text.secondary" fontFamily="monospace">
                {apiStatus === "checking" && "checking…"}
                {apiStatus === "ok" && latencyMs !== null && `${latencyMs}ms`}
                {apiStatus === "error" && "unreachable"}
              </Typography>
            </Box>

            {/* Chat/AI endpoint */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StatusDot status={apiStatus} />
                <Typography fontSize={13} fontWeight={600}>AI Chat API</Typography>
              </Box>
              <Typography fontSize={12} color="text.secondary" fontFamily="monospace">
                {apiStatus === "checking" && "checking…"}
                {apiStatus === "ok" && "available"}
                {apiStatus === "error" && "unreachable"}
              </Typography>
            </Box>

            {/* Supabase endpoint */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StatusDot status={apiStatus} />
                <Typography fontSize={13} fontWeight={600}>Edge Functions</Typography>
              </Box>
              <Typography fontSize={12} color="text.secondary" fontFamily="monospace" sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {SUPABASE_URL?.replace("https://", "").split(".")[0] ?? "—"}
              </Typography>
            </Box>
          </Box>
        </SectionCard>

        {/* Wallet info */}
        <SectionCard>
          <Typography fontWeight={700} fontSize={14} sx={{ mb: 2.5 }}>Wallet</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.secondary", mb: 0.5 }}>
                Address
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FiberManualRecordIcon sx={{ fontSize: 9, color: "primary.main" }} />
                <Typography sx={{ fontFamily: "monospace", fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {address}
                </Typography>
                <CopyButton text={address ?? ""} label="Copy" />
              </Box>
            </Box>

            {ensName && (
              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
                bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.secondary", mb: 0.5 }}>
                  ENS Name
                </Typography>
                <Typography fontSize={13} fontWeight={600} color="primary.main">{ensName}</Typography>
              </Box>
            )}

            <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
              bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.secondary", mb: 0.5 }}>
                Network
              </Typography>
              <Typography fontSize={13} fontWeight={600}>Ethereum Mainnet</Typography>
            </Box>
          </Box>
        </SectionCard>
      </Box>

      {/* MCP Config */}
      <SectionCard>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "rgba(100,249,195,0.08)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(100,249,195,0.2)" }}>
              <HubOutlinedIcon sx={{ fontSize: 17, color: "secondary.main" }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={14}>MCP Server Config</Typography>
              <Typography variant="caption" color="text.secondary">
                Add to Claude Desktop or Cursor
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Copy JSON">
            <Box component="button" onClick={() => navigator.clipboard.writeText(mcpConfig)}
              sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.75,
                border: "1px solid", borderColor: "divider", borderRadius: 1.5,
                bgcolor: "transparent", color: "secondary.main", fontSize: "0.6875rem",
                fontWeight: 700, cursor: "pointer",
                "&:hover": { bgcolor: "rgba(100,249,195,0.07)", borderColor: "rgba(100,249,195,0.3)" } }}>
              <ContentCopyIcon sx={{ fontSize: 13 }} />
              Copy
            </Box>
          </Tooltip>
        </Box>

        <Box sx={{ bgcolor: (t) => t.palette.mode === "dark" ? "#0a0a0a" : "#0f172a",
          border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, overflow: "auto" }}>
          <pre style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12, lineHeight: 1.7, color: "#a7abb2", whiteSpace: "pre" }}>
            <span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"  "}<span style={{ color: "#64f9c3" }}>{`"mcpServers"`}</span>{`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"    "}<span style={{ color: "#64f9c3" }}>{`"nebula-defi"`}</span>{`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"command"`}</span>{`: `}<span style={{ color: "#00FF9D" }}>{`"npx"`}</span>{",\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"args"`}</span>{`: `}<span style={{ color: "#78dfff" }}>{`[`}</span>
            <span style={{ color: "#00FF9D" }}>{`"-y"`}</span>{`, `}<span style={{ color: "#00FF9D" }}>{`"@nebula/mcp-server"`}</span>
            <span style={{ color: "#78dfff" }}>{`]`}</span>{",\n"}
            {"      "}<span style={{ color: "#64f9c3" }}>{`"env"`}</span>{`: `}<span style={{ color: "#78dfff" }}>{`{`}</span>{"\n"}
            {"        "}<span style={{ color: "#64f9c3" }}>{`"NEBULA_API_KEY"`}</span>{`: `}
            <span style={{ color: "#00FF9D" }}>{`"${address}"`}</span>{"\n"}
            {"      "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            {"    "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            {"  "}<span style={{ color: "#78dfff" }}>{`}`}</span>{"\n"}
            <span style={{ color: "#78dfff" }}>{`}`}</span>
          </pre>
        </Box>
      </SectionCard>
    </Box>
  );
}
