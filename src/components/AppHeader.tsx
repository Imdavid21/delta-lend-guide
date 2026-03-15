import { useNavigate, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function AppHeader({ mode, onToggle, chatOpen, onToggleChat }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = mode === "dark";

  const bg = isDark ? "rgba(8, 10, 14, 0.85)" : "rgba(255,255,255,0.8)";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#e0e4eb" : "#0a0a0a";
  const textSecondary = isDark ? "#6b7280" : "#737373";
  const green = "#00FF9D";
  const surfaceHigh = isDark ? "#161b22" : "#f1f5f9";

  const navItems = [
    { label: "Trade",     path: "/trade"     },
    { label: "Markets",   path: "/markets"   },
    { label: "Portfolio", path: "/portfolio" },
  ];

  function isActive(path: string) {
    if (path === "/trade") return location.pathname === "/trade" || location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 56,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 24px",
        background: bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}
    >
      {/* Left: Logo */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill={green} />
          <path d="M14 5L15.5 11.5L22 14L15.5 16.5L14 23L12.5 16.5L6 14L12.5 11.5L14 5Z" fill="#004527" fillRule="evenodd" />
        </svg>
        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: "-0.04em", color: textPrimary }}>
          NEBULA
        </span>
      </div>

      {/* Center: Navigation */}
      <div
        style={{
          display: "flex",
          background: surfaceHigh,
          borderRadius: 10,
          padding: 3,
          border: `1px solid ${border}`,
          gap: 2,
        }}
      >
        {navItems.map(({ label, path }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                padding: "5px 16px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                background: active ? green : "transparent",
                color: active ? "#004527" : textSecondary,
                transition: "all 200ms ease",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = textPrimary; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = textSecondary; }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "end" }}>
        <WalletButton />

        <div style={{ width: 1, height: 18, background: border, margin: "0 2px" }} />

        {/* AI chat toggle */}
        <button
          onClick={onToggleChat}
          title="AI Assistant"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: chatOpen ? `1px solid rgba(0,255,157,0.3)` : `1px solid transparent`,
            background: chatOpen ? "rgba(0,255,157,0.08)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: chatOpen ? green : textSecondary,
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => { if (!chatOpen) e.currentTarget.style.background = surfaceHigh; }}
          onMouseLeave={(e) => { if (!chatOpen) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 7.38 16.74L21 21l-2.26-1.62A10 10 0 1 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={onToggle}
          title={isDark ? "Light mode" : "Dark mode"}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: `1px solid transparent`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: textSecondary,
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = surfaceHigh)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
