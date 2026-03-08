import { useState, type MouseEvent, type ReactNode } from "react";
import { Chip, Popover, Box, Typography, Button } from "@mui/material";

const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum", "10": "OP Mainnet", "56": "BNB Chain", "100": "Gnosis",
  "137": "Polygon", "146": "Sonic", "169": "Manta Pacific", "250": "Fantom",
  "1088": "Metis", "5000": "Mantle", "8217": "Klaytn", "8453": "Base",
  "34443": "Mode", "42161": "Arbitrum One", "43114": "Avalanche", "59144": "Linea",
  "80094": "Berachain", "81457": "Blast", "534352": "Scroll", "747474": "Katana",
};

const LENDER_NAMES: Record<string, string> = {
  AAVE_V2: "Aave V2", AAVE_V3: "Aave V3", COMPOUND_V2: "Compound V2",
  COMPOUND_V3: "Compound V3", LENDLE: "Lendle", AURELIUS: "Aurelius",
  MENDI: "Mendi Finance", MOONWELL: "Moonwell", SILO: "Silo Finance", RADIANT_V2: "Radiant V2",
  MORPHO_BLUE: "Morpho Blue",
};

const LENDER_SLUGS: Record<string, string> = {
  AAVE_V2: "aave-v2", AAVE_V3: "aave-v3", COMPOUND_V2: "compound",
  COMPOUND_V3: "compound-v3", LENDLE: "lendle", AURELIUS: "aurelius",
  MENDI: "mendi-finance", MOONWELL: "moonwell", SILO: "silo-finance", RADIANT_V2: "radiant-v2",
  MORPHO_BLUE: "morpho-blue",
};

interface Props {
  kind: "token" | "chain" | "market";
  value: string;
  label: string;
}

function Row({ l, v }: { l: string; v: ReactNode }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.3 }}>
      <Typography variant="caption" color="text.secondary">{l}</Typography>
      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{v}</Typography>
    </Box>
  );
}

export default function EntityChip({ kind, value, label }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);

  const handleClick = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  let rows: { l: string; v: string }[] = [];
  let link = "";
  let linkLabel = "";

  if (kind === "token") {
    rows = [{ l: "Symbol", v: value }];
    link = `https://www.coingecko.com/en/search?query=${value}`;
    linkLabel = "View on CoinGecko";
  } else if (kind === "chain") {
    const name = CHAIN_NAMES[value] || value;
    rows = [{ l: "Chain", v: name }, { l: "Chain ID", v: value }];
    link = `https://chainlist.org/chain/${value}`;
    linkLabel = "View on Chainlist";
  } else {
    const parts = value.split(":");
    const lenderId = parts[0] || value;
    const chainId = parts[1] || "";
    rows = [
      { l: "Protocol", v: LENDER_NAMES[lenderId] || lenderId },
      ...(chainId ? [{ l: "Chain", v: CHAIN_NAMES[chainId] || chainId }] : []),
      { l: "Lender ID", v: lenderId },
    ];
    const slug = LENDER_SLUGS[lenderId] || lenderId.toLowerCase();
    link = `https://defillama.com/yields?project=${slug}`;
    linkLabel = "View on DeFiLlama";
  }

  return (
    <>
      <Chip
        label={label}
        size="small"
        variant="outlined"
        onClick={handleClick}
        sx={{
          cursor: "pointer",
          mx: 0.3,
          my: 0.2,
          borderColor: "divider",
          fontWeight: 600,
          fontSize: 11,
          "&:hover": { borderColor: "text.primary" },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          {rows.map((r) => (
            <Row key={r.l} l={r.l} v={r.v} />
          ))}
          <Button size="small" href={link} target="_blank" sx={{ mt: 1, fontWeight: 600 }}>
            {linkLabel}
          </Button>
        </Box>
      </Popover>
    </>
  );
}
