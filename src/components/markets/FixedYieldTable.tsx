import { Box, Typography } from "@mui/material";

export default function FixedYieldTable({ showTitle = true }: { showTitle?: boolean }) {
  return (
    <Box sx={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3, p: 3, background: "#0a0d10" }}>
      {showTitle && (
        <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#e0e4eb", fontFamily: "Inter, sans-serif", mb: 1 }}>
          Fixed Yield Markets
        </Typography>
      )}
      <Typography color="text.secondary">Fixed-yield (Pendle) markets have been removed from the UI.</Typography>
    </Box>
  );
}
