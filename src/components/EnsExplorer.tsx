import { useState, useCallback } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { useShell } from "./AppShell";

const publicClient = createPublicClient({ chain: mainnet, transport: http() });

interface EnsProfile {
  address: string;
  ensName: string | null;
  avatar: string | null;
}

async function resolveEns(input: string): Promise<EnsProfile | null> {
  try {
    if (input.endsWith(".eth") || input.includes(".")) {
      const address = await publicClient.getEnsAddress({ name: input });
      if (!address) return null;
      const avatar = await publicClient.getEnsAvatar({ name: input }).catch(() => null);
      return { address, ensName: input, avatar };
    } else if (isAddress(input)) {
      const ensName = await publicClient.getEnsName({ address: input as `0x${string}` });
      const avatar = ensName
        ? await publicClient.getEnsAvatar({ name: ensName }).catch(() => null)
        : null;
      return { address: input, ensName, avatar };
    }
    return null;
  } catch {
    return null;
  }
}

export default function EnsExplorer() {
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<EnsProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { submitAction } = useShell();

  const handleLookup = useCallback(async () => {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const result = await resolveEns(q);
      if (!result) {
        setError("Could not resolve ENS name or address.");
      } else {
        setProfile(result);
      }
    } catch {
      setError("Resolution failed. Check your input.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleViewPositions = useCallback(() => {
    if (!profile) return;
    const label = profile.ensName ?? profile.address;
    submitAction(`Show all DeFi positions for ${label} (address: ${profile.address}) — include lending, vaults, and borrows across all protocols`);
  }, [profile, submitAction]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  const green = "#00FF9D";
  const border = "rgba(67,72,78,0.3)";
  const cardBg = "#0e1419";
  const textPrimary = "#eaeef5";
  const textSecondary = "#a7abb2";

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${border}`,
        background: cardBg,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "16px 20px 14px",
        borderBottom: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        {/* ENS logo icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, #5298FF 0%, #3F4CF6 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: textPrimary, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>
            ENS Portfolio Lookup
          </div>
          <div style={{ fontSize: 10, color: textSecondary, fontFamily: "Inter, sans-serif", marginTop: 1 }}>
            Search any wallet or .eth name to explore their DeFi positions
          </div>
        </div>
        <div style={{
          marginLeft: "auto",
          fontSize: 9,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 20,
          background: "rgba(82,152,255,0.15)",
          border: "1px solid rgba(82,152,255,0.3)",
          color: "#5298FF",
          letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
          fontFamily: "Inter, sans-serif",
        }}>
          Powered by ENS
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8,
            background: "#141a20",
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: "9px 12px",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="vitalik.eth or 0xd8dA6BF..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, fontWeight: 500, color: textPrimary, fontFamily: "Inter, sans-serif",
              }}
            />
            {input && (
              <button onClick={() => { setInput(""); setProfile(null); setError(null); }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: textSecondary, padding: 0, lineHeight: 1 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleLookup}
            disabled={loading || !input.trim()}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              background: loading || !input.trim() ? "rgba(0,255,157,0.15)" : green,
              color: loading || !input.trim() ? "rgba(0,255,157,0.5)" : "#004527",
              fontSize: 12,
              fontWeight: 800,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontFamily: "Inter, sans-serif",
              transition: "all 200ms ease",
              whiteSpace: "nowrap" as const,
            }}
          >
            {loading ? "Resolving…" : "Look up"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#ff716c", fontFamily: "Inter, sans-serif" }}>
            {error}
          </div>
        )}

        {/* Profile card */}
        {profile && (
          <div style={{
            marginTop: 14,
            padding: "14px 16px",
            borderRadius: 12,
            background: "#141a20",
            border: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0 }}>
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.ensName ?? profile.address}
                  style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid ${green}`, boxShadow: `0 0 12px rgba(0,255,157,0.3)` }}
                />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(0,255,157,0.3), rgba(82,152,255,0.3))",
                  border: `2px solid ${green}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: green, fontFamily: "Inter, sans-serif",
                  boxShadow: `0 0 12px rgba(0,255,157,0.2)`,
                }}>
                  {(profile.ensName ?? profile.address)[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {profile.ensName && (
                <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>
                  {profile.ensName}
                </div>
              )}
              <div style={{
                fontSize: 11,
                color: profile.ensName ? textSecondary : textPrimary,
                fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
              }}>
                {profile.address}
              </div>
              {!profile.ensName && (
                <div style={{ fontSize: 10, color: "rgba(167,171,178,0.5)", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                  No ENS name registered
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleViewPositions}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid rgba(0,255,157,0.3)`,
                background: "rgba(0,255,157,0.08)",
                color: green,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all 150ms ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,157,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,255,157,0.08)";
              }}
            >
              View Positions →
            </button>
          </div>
        )}

        {/* Quick examples */}
        {!profile && !loading && !error && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: textSecondary, fontFamily: "Inter, sans-serif" }}>Try:</span>
            {["vitalik.eth", "hayden.eth", "stani.eth"].map((name) => (
              <button
                key={name}
                onClick={() => setInput(name)}
                style={{
                  padding: "3px 10px", borderRadius: 20,
                  border: "1px solid rgba(82,152,255,0.25)",
                  background: "rgba(82,152,255,0.06)",
                  color: "#5298FF", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
