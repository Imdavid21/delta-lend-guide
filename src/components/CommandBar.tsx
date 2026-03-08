import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Box, Typography, Popper, Paper, List, ListItemButton, ListItemText, ListItemIcon, ClickAwayListener, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LockClockIcon from "@mui/icons-material/LockClock";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HistoryIcon from "@mui/icons-material/History";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";
import { formatPercent } from "@/lib/marketTypes";
import type { TabId } from "./AppShell";
import type { Chat } from "@/hooks/useChats";

interface SearchResult {
  id: string;
  type: "market" | "vault" | "pendle" | "action" | "nav" | "history";
  label: string;
  sub: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
  onNavigate: (tab: TabId) => void;
  onNewChat: (prompt: string) => void;
  chatHistory: Chat[];
}

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Best lending rates", prompt: "What are the best lending rates on Ethereum?" },
  { label: "Compare ETH yields", prompt: "Compare ETH supply APY across all protocols" },
  { label: "Show my positions", prompt: "Show my positions" },
];

export default function CommandBar({ loading, onSend, onNavigate, onNewChat, chatHistory }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const { data: markets } = useMarkets();
  const { data: vaults } = useVaults();
  const { data: pendle } = usePendle();

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setFocused(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Extract unique recent user messages for autocomplete
  const recentQueries = useMemo(() => {
    const seen = new Set<string>();
    const queries: string[] = [];
    for (const chat of chatHistory) {
      for (let i = chat.messages.length - 1; i >= 0; i--) {
        const m = chat.messages[i];
        if (m.role === "user") {
          const normalized = m.content.trim().toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            queries.push(m.content.trim());
          }
        }
        if (queries.length >= 20) break;
      }
      if (queries.length >= 20) break;
    }
    return queries;
  }, [chatHistory]);

  const results = useMemo<SearchResult[]>(() => {
    const q = value.toLowerCase().trim();
    if (!q) return [];

    const items: SearchResult[] = [];

    // Chat history autocomplete
    const matchingHistory = recentQueries
      .filter((msg) => msg.toLowerCase().includes(q))
      .slice(0, 3);
    for (const msg of matchingHistory) {
      items.push({
        id: `history:${msg}`,
        type: "history",
        label: msg,
        sub: "Recent",
        icon: <HistoryIcon sx={{ fontSize: 16, color: "text.disabled" }} />,
        action: () => { onNewChat(msg); setValue(""); setFocused(false); },
      });
    }

    // Nav results
    const navItems: { tab: TabId; label: string; keywords: string[] }[] = [
      { tab: "overview", label: "Overview Dashboard", keywords: ["overview", "dashboard", "home"] },
      { tab: "lending", label: "Lending Markets", keywords: ["lending", "lend", "supply", "borrow"] },
      { tab: "vaults", label: "Vaults", keywords: ["vault", "morpho", "yearn", "euler"] },
      { tab: "fixed", label: "Fixed Yield", keywords: ["fixed", "pendle", "yield", "maturity"] },
      { tab: "chat", label: "Chat", keywords: ["chat", "ask", "help"] },
    ];
    for (const nav of navItems) {
      if (nav.label.toLowerCase().includes(q) || nav.keywords.some((k) => k.includes(q))) {
        items.push({
          id: `nav:${nav.tab}`,
          type: "nav",
          label: nav.label,
          sub: "Navigate",
          icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,
          action: () => { onNavigate(nav.tab); setValue(""); setFocused(false); },
        });
      }
    }

    // Market results
    if (markets) {
      for (const m of markets) {
        if (
          m.asset.toLowerCase().includes(q) ||
          m.protocolName.toLowerCase().includes(q) ||
          m.poolName.toLowerCase().includes(q)
        ) {
          items.push({
            id: m.id,
            type: "market",
            label: `${m.asset} on ${m.protocolName}`,
            sub: `Supply ${formatPercent(m.supplyAPY)}`,
            icon: <AssetIcon symbol={m.asset} size={18} />,
            action: () => { onNavigate("lending"); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    // Vault results
    if (vaults && items.length < 8) {
      for (const v of vaults) {
        if (
          v.asset.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.protocol.toLowerCase().includes(q)
        ) {
          items.push({
            id: v.id,
            type: "vault",
            label: v.name,
            sub: `APY ${formatPercent(v.apy)}`,
            icon: <ProtocolIcon name={v.protocol} size={18} />,
            action: () => { onNavigate("vaults"); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    // Pendle results
    if (pendle && items.length < 8) {
      for (const p of pendle) {
        if (p.asset.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) {
          items.push({
            id: p.id,
            type: "pendle",
            label: p.name,
            sub: `Fixed ${formatPercent(p.impliedAPY)}`,
            icon: <LockClockIcon sx={{ fontSize: 16 }} />,
            action: () => { onNavigate("fixed"); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    return items.slice(0, 8);
  }, [value, markets, vaults, pendle, onNavigate, recentQueries, onNewChat]);

  const showDropdown = focused && (results.length > 0 || (value.trim() === "" && !loading));

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue("");
    setFocused(false);
  }, [value, loading, onSend]);

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

  return (
    <ClickAwayListener onClickAway={() => setFocused(false)}>
      <Box
        ref={anchorRef}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 1.5,
          px: { xs: 1.5, md: 3 },
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            border: 1,
            borderColor: focused ? "text.secondary" : "divider",
            borderRadius: "14px",
            px: 1.5,
            py: 0.75,
            transition: "all 300ms ease",
            bgcolor: "background.default",
            // Subtle glow
            boxShadow: (t) => {
              const glowColor = t.palette.mode === "dark"
                ? "rgba(250, 250, 250, 0.04)"
                : "rgba(10, 10, 10, 0.03)";
              const focusGlow = t.palette.mode === "dark"
                ? "0 0 20px 4px rgba(250, 250, 250, 0.06), 0 0 40px 8px rgba(250, 250, 250, 0.03)"
                : "0 0 20px 4px rgba(10, 10, 10, 0.04), 0 0 40px 8px rgba(10, 10, 10, 0.02)";
              return focused ? focusGlow : `0 0 12px 2px ${glowColor}`;
            },
            "&:hover": {
              borderColor: "text.secondary",
              boxShadow: (t) =>
                t.palette.mode === "dark"
                  ? "0 0 16px 3px rgba(250, 250, 250, 0.05)"
                  : "0 0 16px 3px rgba(10, 10, 10, 0.03)",
            },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }} />
          <Box
            component="input"
            ref={inputRef}
            name="chatInput"
            value={value}
            onChange={(e: any) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search markets or ask anything…"
            disabled={loading}
            autoComplete="off"
            className="clean-input"
            sx={{
              flex: 1,
              fontSize: 13,
              color: "text.primary",
              py: 0.25,
              "&::placeholder": { color: "text.disabled", opacity: 1 },
            }}
          />
          {/* Keyboard shortcut badge */}
          {!focused && !value && (
            <Chip
              label={isMac ? "⌘ K" : "Ctrl K"}
              size="small"
              sx={{
                height: 22,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "monospace",
                bgcolor: "action.hover",
                color: "text.secondary",
                border: 1,
                borderColor: "divider",
                "& .MuiChip-label": { px: 1 },
              }}
            />
          )}
          {/* Send button — only when there's text */}
          {value.trim() && (
            <Box
              component="button"
              type="submit"
              disabled={loading}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "text.primary",
                color: "background.default",
                border: "none",
                borderRadius: "8px",
                width: 28,
                height: 28,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "all 200ms ease",
                flexShrink: 0,
                "&:hover": { opacity: 0.8 },
              }}
            >
              <SendIcon sx={{ fontSize: 14 }} />
            </Box>
          )}
        </Box>

        {/* Dropdown */}
        <Popper
          open={showDropdown}
          anchorEl={anchorRef.current}
          placement="top-start"
          style={{ width: anchorRef.current?.clientWidth ?? 400, zIndex: 1300 }}
          modifiers={[{ name: "offset", options: { offset: [0, 6] } }]}
        >
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              overflow: "hidden",
              maxHeight: 340,
              overflowY: "auto",
              bgcolor: "background.default",
              boxShadow: (t) =>
                t.palette.mode === "dark"
                  ? "0 -8px 30px -6px rgba(0,0,0,0.5)"
                  : "0 -8px 30px -6px rgba(0,0,0,0.08)",
            }}
          >
            {/* Search results */}
            {results.length > 0 && (
              <List dense disablePadding>
                {results.map((r) => (
                  <ListItemButton
                    key={r.id}
                    onClick={r.action}
                    sx={{ py: 0.75, px: 1.5, "&:hover": { bgcolor: "action.hover" } }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>{r.icon}</ListItemIcon>
                    <ListItemText
                      primary={r.label}
                      secondary={r.sub}
                      primaryTypographyProps={{ fontSize: 12, fontWeight: 500, noWrap: true }}
                      secondaryTypographyProps={{ fontSize: 10, color: "text.disabled" }}
                    />
                    <Chip
                      label={r.type === "nav" ? "Page" : r.type === "market" ? "Lending" : r.type === "vault" ? "Vault" : r.type === "history" ? "History" : "Fixed"}
                      size="small"
                      sx={{ fontSize: 9, height: 18, bgcolor: "action.hover", color: "text.secondary" }}
                    />
                  </ListItemButton>
                ))}
                {value.trim() && (
                  <ListItemButton onClick={() => handleSubmit()} sx={{ py: 0.75, px: 1.5, borderTop: 1, borderColor: "divider" }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Ask: "${value.trim()}"`}
                      primaryTypographyProps={{ fontSize: 12, fontWeight: 500, fontStyle: "italic" }}
                    />
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                      Enter ↵
                    </Typography>
                  </ListItemButton>
                )}
              </List>
            )}

            {/* Empty state — quick actions */}
            {results.length === 0 && !value.trim() && (
              <Box sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5, display: "block" }}>
                  Quick actions
                </Typography>
                <List dense disablePadding>
                  {QUICK_ACTIONS.map((a) => (
                    <ListItemButton
                      key={a.label}
                      onClick={() => { onNewChat(a.prompt); setValue(""); setFocused(false); }}
                      sx={{ py: 0.5, px: 1, borderRadius: 1.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={a.label}
                        primaryTypographyProps={{ fontSize: 12, color: "text.secondary" }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
