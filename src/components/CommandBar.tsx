import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Box, Typography, Popper, Paper, List, ListItemButton,
  ListItemText, ListItemIcon, ClickAwayListener, Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LockClockIcon from "@mui/icons-material/LockClock";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
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
  const [quickActionsDismissed, setQuickActionsDismissed] = useState(false);
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
            action: () => { onSend(`Tell me about ${m.asset} on ${m.protocolName}`); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

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
            action: () => { onSend(`Tell me about the ${v.name} vault`); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    if (pendle && items.length < 8) {
      for (const p of pendle) {
        if (p.asset.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) {
          items.push({
            id: p.id,
            type: "pendle",
            label: p.name,
            sub: `Fixed ${formatPercent(p.impliedAPY)}`,
            icon: <LockClockIcon sx={{ fontSize: 16 }} />,
            action: () => { onSend(`Tell me about ${p.name} fixed yield`); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    return items.slice(0, 8);
  }, [value, markets, vaults, pendle, onNavigate, recentQueries, onNewChat]);

  const showDropdown = focused && (results.length > 0 || (value.trim() === "" && !loading && !quickActionsDismissed));

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
        sx={{
          position: "relative",
          // Gradient fade from transparent to background
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-48px",
            left: 0,
            right: 0,
            height: "48px",
            background: (t) =>
              t.palette.mode === "dark"
                ? "linear-gradient(to top, #0a0f14 0%, transparent 100%)"
                : "linear-gradient(to top, #ffffff 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 0,
          },
        }}
      >
        <Box
          ref={anchorRef}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 1.5,
            px: { xs: 1.5, md: 3 },
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "1px solid",
              borderColor: focused ? "primary.main" : "divider",
              borderRadius: "14px",
              px: 2,
              py: 1,
              transition: "all 300ms ease",
              bgcolor: "background.paper",
              boxShadow: focused
                ? (t) => t.palette.mode === "dark"
                  ? "0 0 0 3px rgba(0,255,157,0.08), 0 0 20px rgba(0,255,157,0.06)"
                  : "0 0 0 3px rgba(0,109,64,0.08)"
                : "none",
              "&:hover": {
                borderColor: (t) => t.palette.mode === "dark"
                  ? "rgba(0,255,157,0.3)"
                  : "rgba(0,0,0,0.3)",
              },
            }}
          >
            <SearchIcon
              sx={{
                fontSize: 18,
                color: focused ? "primary.main" : "text.disabled",
                flexShrink: 0,
                transition: "color 200ms ease",
              }}
            />
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
                fontWeight: 500,
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
                  fontWeight: 700,
                  fontFamily: "monospace",
                  bgcolor: "action.hover",
                  color: "text.disabled",
                  border: "1px solid",
                  borderColor: "divider",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            )}

            {/* Send button */}
            {value.trim() && (
              <Box
                component="button"
                type="submit"
                disabled={loading}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  border: "none",
                  borderRadius: "8px",
                  width: 28,
                  height: 28,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "all 200ms ease",
                  flexShrink: 0,
                  "&:hover": { opacity: 0.85, transform: "scale(1.05)" },
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
            modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
          >
            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                overflow: "hidden",
                maxHeight: 340,
                overflowY: "auto",
                bgcolor: "background.paper",
                boxShadow: (t) =>
                  t.palette.mode === "dark"
                    ? "0 -12px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,157,0.05)"
                    : "0 -8px 30px -6px rgba(0,0,0,0.08)",
              }}
            >
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
                        primaryTypographyProps={{ fontSize: 12, fontWeight: 600, noWrap: true }}
                        secondaryTypographyProps={{ fontSize: 10, color: "text.disabled" }}
                      />
                      <Chip
                        label={
                          r.type === "nav" ? "Page"
                          : r.type === "market" ? "Lending"
                          : r.type === "vault" ? "Vault"
                          : r.type === "history" ? "History"
                          : "Fixed"
                        }
                        size="small"
                        sx={{
                          fontSize: 9,
                          height: 18,
                          bgcolor: "action.hover",
                          color: "text.secondary",
                          fontWeight: 700,
                        }}
                      />
                    </ListItemButton>
                  ))}
                  {value.trim() && (
                    <ListItemButton
                      onClick={() => handleSubmit()}
                      sx={{ py: 0.75, px: 1.5, borderTop: "1px solid", borderColor: "divider" }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: "primary.main" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Ask: "${value.trim()}"`}
                        primaryTypographyProps={{ fontSize: 12, fontWeight: 600, fontStyle: "italic" }}
                      />
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                        Enter ↵
                      </Typography>
                    </ListItemButton>
                  )}
                </List>
              )}

              {/* Empty state — quick actions */}
              {results.length === 0 && !value.trim() && !quickActionsDismissed && (
                <Box sx={{ p: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "text.disabled", fontWeight: 700 }}
                    >
                      Quick actions
                    </Typography>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => { setQuickActionsDismissed(true); setFocused(false); inputRef.current?.blur(); }}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "none", bgcolor: "transparent", cursor: "pointer",
                        color: "text.disabled", p: 0, width: 18, height: 18,
                        borderRadius: "50%", "&:hover": { color: "text.secondary", bgcolor: "action.hover" },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Box>
                  <List dense disablePadding>
                    {QUICK_ACTIONS.map((a) => (
                      <ListItemButton
                        key={a.label}
                        onClick={() => { onNewChat(a.prompt); setValue(""); setFocused(false); }}
                        sx={{ py: 0.5, px: 1, borderRadius: 1.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: "primary.main" }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={a.label}
                          primaryTypographyProps={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>
          </Popper>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
