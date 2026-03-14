import { useNavigate, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

const NAV_TABS = [
  { id: "trade",     label: "Trade",     path: "/trade"     },
  { id: "markets",   label: "Markets",   path: "/markets"   },
  { id: "portfolio", label: "Portfolio", path: "/portfolio" },
] as const;

export default function AppHeader({ mode, onToggle, chatOpen, onToggleChat }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDark = mode === "dark";

  const bg     = isDark ? "rgba(10, 15, 20, 0.85)" : "rgba(255,255,255,0.85)";
  const border = isDark ? "rgba(67,72,78,0.2)"     : "rgba(0,0,0,0.08)";
  const textPrimary   = isDark ? "#eaeef5" : "#0a0a0a";
  const textSecondary = isDark ? "#a7abb2" : "#737373";
  const green   = "#86efac";
  const surface = isDark ? "rgba(31,38,46,0.6)" : "#f1f5f9";

  function getActiveTab(): string {
    if (pathname.startsWith("/markets"))   return "markets";
    if (pathname.startsWith("/portfolio")) return "portfolio";
    return "trade"; // default: /, /trade, /borrow, etc.
  }
  const activeTab = getActiveTab();

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 56,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 20px",
        background: bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}
    >
      {/* ── Left: Logo ── */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
        onClick={() => navigate("/trade")}
      >
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill={green}/>
          <path d="M14 5L15.5 11.5L22 14L15.5 16.5L14 23L12.5 16.5L6 14L12.5 11.5L14 5Z" fill="#004527" fillRule="evenodd"/>
        </svg>
        <span style={{
          fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 16,
          letterSpacing: "-0.04em", color: textPrimary,
        }}>
          NEBULA
        </span>
      </div>

      {/* ── Center: Nav tabs ── */}
      <nav
        style={{
          display: "flex",
          background: surface,
          borderRadius: 12,
          padding: 3,
          border: `1px solid ${border}`,
          gap: 2,
        }}
      >
        {NAV_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                padding: "5px 18px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                background: active ? (isDark ? "#1f262e" : "#ffffff") : "transparent",
                color: active ? (isDark ? "#eaeef5" : "#0a0a0a") : textSecondary,
                transition: "all 180ms ease",
                letterSpacing: "-0.01em",
                boxShadow: active ? (isDark ? "0 1px 6px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.08)") : "none",
                position: "relative",
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <span style={{
                  position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
                  width: 4, height: 4, borderRadius: "50%", background: green,
                }} />
              )}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Right: Actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "end" }}>
        <WalletButton />

        <div style={{ width: 1, height: 18, background: border, margin: "0 2px" }} />

        {/* Settings */}
        <button
          onClick={() => navigate("/settings")}
          title="Settings"
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: pathname.startsWith("/settings") ? `1px solid rgba(255,255,255,0.2)` : `1px solid transparent`,
            background: pathname.startsWith("/settings") ? "rgba(255,255,255,0.07)" : "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: pathname.startsWith("/settings") ? textPrimary : textSecondary,
            transition: "all 180ms ease",
          }}
          onMouseEnter={e => { if (!pathname.startsWith("/settings")) (e.currentTarget as HTMLButtonElement).style.background = surface; }}
          onMouseLeave={e => { if (!pathname.startsWith("/settings")) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>

        {/* AI assistant */}
        <button
          onClick={onToggleChat}
          title="AI Assistant"
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: chatOpen ? `1px solid rgba(0,255,157,0.35)` : `1px solid transparent`,
            background: chatOpen ? "rgba(0,255,157,0.08)" : "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: chatOpen ? green : textSecondary,
            transition: "all 180ms ease",
          }}
          onMouseEnter={e => { if (!chatOpen) (e.currentTarget as HTMLButtonElement).style.background = surface; }}
          onMouseLeave={e => { if (!chatOpen) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 7.38 16.74L21 21l-2.26-1.62A10 10 0 1 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggle}
          title={isDark ? "Light mode" : "Dark mode"}
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: `1px solid transparent`,
            background: "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: textSecondary,
            transition: "all 180ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = surface)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
