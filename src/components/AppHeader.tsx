import { useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import WalletButton from "./WalletButton";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function AppHeader({ mode, onToggle, chatOpen, onToggleChat }: Props) {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = mode === "dark";

  const activeSection = location.pathname.startsWith("/borrow") ? "borrow" : "lending";

  const bg = isDark ? "rgba(20, 26, 32, 0.75)" : "rgba(255,255,255,0.8)";
  const border = isDark ? "rgba(67,72,78,0.15)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#eaeef5" : "#0a0a0a";
  const textSecondary = isDark ? "#a7abb2" : "#737373";
  const green = "#00FF9D";
  const surfaceHigh = isDark ? "#1f262e" : "#f1f5f9";
  const surfaceTop = isDark ? "#252d35" : "#e2e8f0";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: bg,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
      }}
    >
      {/* Left: Logo + Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill={green} />
            <path d="M14 5L15.5 11.5L22 14L15.5 16.5L14 23L12.5 16.5L6 14L12.5 11.5L14 5Z" fill="#004527" fillRule="evenodd" />
          </svg>
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: "-0.04em",
              color: textPrimary,
            }}
          >
            NEBULA
          </span>
        </div>

        {/* Nav pill toggle */}
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
          {(["lending", "borrow"] as const).map((section) => {
            const active = activeSection === section;
            return (
              <button
                key={section}
                onClick={() => navigate(`/${section}`)}
                style={{
                  padding: "5px 20px",
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
                }}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <WalletButton />

        <div
          style={{
            width: 1,
            height: 20,
            background: border,
            margin: "0 4px",
          }}
        />

        {/* Dark mode toggle */}
        <button
          onClick={onToggle}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* AI chat toggle */}
        <button
          onClick={onToggleChat}
          title="AI Assistant"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: chatOpen ? `1px solid rgba(0,255,157,0.3)` : "none",
            background: chatOpen ? "rgba(0,255,157,0.08)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: chatOpen ? green : textSecondary,
            transition: "all 200ms ease",
            position: "relative",
          }}
          onMouseEnter={(e) => { if (!chatOpen) e.currentTarget.style.background = surfaceHigh; }}
          onMouseLeave={(e) => { if (!chatOpen) e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 7.38 16.74L21 21l-2.26-1.62A10 10 0 1 1 12 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
          {chatOpen && (
            <span style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: "50%", background: green }} />
          )}
        </button>

        {/* Account icon (when connected) */}
        {isConnected && (
          <button
            onClick={() => navigate(location.pathname === "/account" ? "/" : "/account")}
            title="Account"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: location.pathname === "/account" ? `1px solid rgba(0,255,157,0.3)` : `1px solid ${border}`,
              background: location.pathname === "/account" ? "rgba(0,255,157,0.08)" : surfaceHigh,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: location.pathname === "/account" ? green : textSecondary,
              transition: "all 200ms ease",
              overflow: "hidden",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
