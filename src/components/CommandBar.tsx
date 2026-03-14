import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  isDark: boolean;
}

const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Best lending rates", prompt: "What are the best lending rates on Ethereum?" },
  { label: "Compare ETH yields", prompt: "Compare ETH supply APY across all protocols" },
  { label: "Show my positions", prompt: "Show my positions" },
];

export default function CommandBar({ loading, onSend, onNavigate, onNewChat, chatHistory, isDark }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [quickActionsDismissed, setQuickActionsDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        ),
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
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          ),
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
            icon: <AssetIcon symbol={m.asset} size={16} />,
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
            icon: <ProtocolIcon name={v.protocol} size={16} />,
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
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            ),
            action: () => { onSend(`Tell me about ${p.name} fixed yield`); setValue(""); setFocused(false); },
          });
        }
        if (items.length >= 8) break;
      }
    }

    return items.slice(0, 8);
  }, [value, markets, vaults, pendle, onNavigate, recentQueries, onNewChat, onSend]);

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

  const bg = isDark ? "#0a0f14" : "#ffffff";
  const cardBg = isDark ? "#0e1419" : "#f8fafc";
  const border = isDark ? "rgba(67,72,78,0.4)" : "rgba(0,0,0,0.1)";
  const borderFocused = "#00FF9D";
  const textPrimary = isDark ? "#eaeef5" : "#0a0a0a";
  const textSecondary = isDark ? "#a7abb2" : "#737373";
  const textDisabled = isDark ? "rgba(167,171,178,0.45)" : "rgba(0,0,0,0.3)";
  const itemHover = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const green = "#00FF9D";

  const typeLabel = (type: SearchResult["type"]) => {
    if (type === "nav") return "Page";
    if (type === "market") return "Lending";
    if (type === "vault") return "Vault";
    if (type === "history") return "History";
    return "Fixed";
  };

  return (
    /* Fixed overlay — gradient above, bar at bottom */
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* Gradient fade */}
      <div
        style={{
          height: 72,
          background: `linear-gradient(to bottom, transparent, ${bg})`,
          pointerEvents: "none",
        }}
      />

      {/* Actual bar */}
      <div
        ref={containerRef}
        style={{
          background: bg,
          borderTop: `1px solid ${border}`,
          padding: "12px 24px 16px",
          pointerEvents: "auto",
          position: "relative",
        }}
      >
        {/* Dropdown — rendered above the bar */}
        {showDropdown && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 24,
              right: 24,
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 16,
              overflow: "hidden",
              maxHeight: 320,
              overflowY: "auto",
              boxShadow: isDark
                ? "0 -16px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,255,157,0.06)"
                : "0 -8px 32px -6px rgba(0,0,0,0.1)",
            }}
          >
            {results.length > 0 && (
              <div>
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={r.action}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 14px",
                      border: "none",
                      borderBottom: i < results.length - 1 ? `1px solid ${border}` : "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      color: textPrimary,
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = itemHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ color: textDisabled, flexShrink: 0, display: "flex", alignItems: "center" }}>
                      {r.icon}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.label}
                      </span>
                      <span style={{ display: "block", fontSize: 10, color: textDisabled }}>
                        {r.sub}
                      </span>
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      color: textSecondary,
                      letterSpacing: "0.03em",
                      flexShrink: 0,
                    }}>
                      {typeLabel(r.type)}
                    </span>
                  </button>
                ))}
                {value.trim() && (
                  <button
                    onClick={() => handleSubmit()}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 14px",
                      border: "none",
                      borderTop: `1px solid ${border}`,
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = itemHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 0 1 7.38 16.74L21 21l-2.26-1.62A10 10 0 1 1 12 2z"/>
                      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                    </svg>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, fontStyle: "italic", color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Ask: "{value.trim()}"
                    </span>
                    <span style={{ fontSize: 9, color: textDisabled }}>Enter ↵</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick actions when empty */}
            {results.length === 0 && !value.trim() && !quickActionsDismissed && (
              <div style={{ padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: textDisabled }}>
                    Quick actions
                  </span>
                  <button
                    type="button"
                    onClick={() => { setQuickActionsDismissed(true); setFocused(false); inputRef.current?.blur(); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "none", background: "transparent", cursor: "pointer",
                      color: textDisabled, padding: 2, borderRadius: "50%",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => { onNewChat(a.prompt); setValue(""); setFocused(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 150ms ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = itemHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 0 1 7.38 16.74L21 21l-2.26-1.62A10 10 0 1 1 12 2z"/>
                      <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>{a.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input row */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: cardBg,
            border: `1px solid ${focused ? borderFocused : border}`,
            borderRadius: 14,
            padding: "10px 14px",
            transition: "border-color 200ms ease, box-shadow 200ms ease",
            boxShadow: focused
              ? isDark
                ? "0 0 0 3px rgba(0,255,157,0.1), 0 0 24px rgba(0,255,157,0.06)"
                : "0 0 0 3px rgba(0,150,80,0.1)"
              : "none",
          }}
        >
          {/* Search icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={focused ? green : textDisabled}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "stroke 200ms ease" }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>

          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search markets or ask anything…"
            disabled={loading}
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 500,
              color: textPrimary,
              fontFamily: "Inter, sans-serif",
            }}
          />

          {/* Keyboard hint */}
          {!focused && !value && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "monospace",
              padding: "2px 6px",
              borderRadius: 5,
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              border: `1px solid ${border}`,
              color: textDisabled,
              whiteSpace: "nowrap",
            }}>
              {isMac ? "⌘ K" : "Ctrl K"}
            </span>
          )}

          {/* Send button */}
          {value.trim() && (
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: green,
                border: "none",
                borderRadius: 8,
                width: 28,
                height: 28,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                flexShrink: 0,
                transition: "opacity 200ms ease, transform 200ms ease",
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#004527" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
