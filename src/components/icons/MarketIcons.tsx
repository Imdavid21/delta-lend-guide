import { Box } from "@mui/material";
import aaveIcon from "@/assets/protocols/aave.png";

/**
 * Protocol icon slugs for DeFiLlama icons CDN.
 * URL pattern: https://icons.llamao.fi/icons/protocols/{slug}
 */
const PROTOCOL_SLUGS: Record<string, string> = {
  "Aave V2": "aave-v2",
  "Aave V3": "aave",
  "Compound V2": "compound-finance",
  "Compound V3": "compound-finance",
  "Morpho Blue": "morpho",
  "Morpho": "morpho",
  "Spark": "spark",
  "Radiant": "radiant",
  "Radiant V2": "radiant",
  "Venus": "venus",
  "Seamless": "seamless-protocol",
  "ZeroLend": "zerolend",
  "LayerBank": "layerbank",
  "Aurelius": "aurelius",
  "Init Capital": "init-capital",
  "Moonwell": "moonwell-artemis",
  "Mendi Finance": "mendi-finance",
  "Silo Finance": "silo-finance",
  "Euler": "euler",
  "Yearn": "yearn-finance",
  "Lendle": "lendle",
  "Granary": "granary-finance",
  "Pendle": "pendle",
};

/**
 * Token icon using cryptocurrency-icons repo (symbol-based, lowercase).
 * Falls back to a colored circle with the first letter.
 */
const TOKEN_CDN = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color";

export function getTokenIconUrl(symbol: string): string {
  const clean = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${TOKEN_CDN}/${clean}.png`;
}

/** Local overrides for protocol icons */
const LOCAL_PROTOCOL_ICONS: Record<string, string> = {
  "Aave V2": aaveIcon,
  "Aave V3": aaveIcon,
};

export function getProtocolIconUrl(protocolName: string): string {
  if (LOCAL_PROTOCOL_ICONS[protocolName]) return LOCAL_PROTOCOL_ICONS[protocolName];
  const slug = PROTOCOL_SLUGS[protocolName];
  if (slug) return `https://icons.llamao.fi/icons/protocols/${slug}`;
  const derived = protocolName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `https://icons.llamao.fi/icons/protocols/${derived}`;
}

interface TokenIconProps {
  symbol: string;
  size?: number;
}

export function TokenIcon({ symbol, size = 20 }: TokenIconProps) {
  const letter = (symbol?.[0] ?? "?").toUpperCase();

  return (
    <Box
      component="img"
      src={getTokenIconUrl(symbol)}
      alt={symbol}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
      }}
      onError={(e: any) => {
        // Replace with a letter fallback
        const el = e.currentTarget as HTMLImageElement;
        el.style.display = "none";
        const fallback = el.nextElementSibling;
        if (fallback) (fallback as HTMLElement).style.display = "flex";
      }}
    />
  );
}

/** Wrapper that renders a token icon with a letter fallback */
export function AssetIcon({ symbol, size = 20 }: TokenIconProps) {
  const letter = (symbol?.[0] ?? "?").toUpperCase();

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
      <Box
        component="img"
        src={getTokenIconUrl(symbol)}
        alt={symbol}
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          objectFit: "cover",
        }}
        onError={(e: any) => {
          (e.currentTarget as HTMLElement).style.display = "none";
          const next = (e.currentTarget as HTMLElement).nextElementSibling;
          if (next) (next as HTMLElement).style.display = "flex";
        }}
      />
      {/* Letter fallback — hidden by default, shown on img error */}
      <Box
        sx={{
          display: "none",
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: "action.selected",
          color: "text.secondary",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {letter}
      </Box>
    </Box>
  );
}

interface ProtocolIconProps {
  name: string;
  size?: number;
}

export function ProtocolIcon({ name, size = 18 }: ProtocolIconProps) {
  const letter = (name?.[0] ?? "?").toUpperCase();

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
      <Box
        component="img"
        src={getProtocolIconUrl(name)}
        alt={name}
        sx={{
          width: size,
          height: size,
          borderRadius: 1,
          flexShrink: 0,
          objectFit: "contain",
        }}
        onError={(e: any) => {
          (e.currentTarget as HTMLElement).style.display = "none";
          const next = (e.currentTarget as HTMLElement).nextElementSibling;
          if (next) (next as HTMLElement).style.display = "flex";
        }}
      />
      <Box
        sx={{
          display: "none",
          width: size,
          height: size,
          borderRadius: 1,
          bgcolor: "action.selected",
          color: "text.secondary",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {letter}
      </Box>
    </Box>
  );
}

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg",
  Base: "https://icons.llamao.fi/icons/chains/rsz_base.jpg",
};

interface ChainIconProps {
  chainName: string;
  size?: number;
}

export function ChainIcon({ chainName, size = 14 }: ChainIconProps) {
  const src = CHAIN_ICONS[chainName];
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={chainName}
      title={chainName}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        objectFit: "cover",
      }}
    />
  );
}

/** Extract chain name from a protocol label like "Aave V3 Core (Ethereum)" */
export function parseChainFromLabel(label: string): { name: string; chain: string | null } {
  const match = label.match(/^(.+?)\s*\((\w+)\)$/);
  if (match) return { name: match[1], chain: match[2] };
  return { name: label, chain: null };
}
