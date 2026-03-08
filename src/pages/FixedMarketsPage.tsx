import { Box, Typography, Alert } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

export default function FixedMarketsPage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Fixed Yield Markets
      </Typography>
      <Alert icon={<InfoIcon />} severity="info" sx={{ mt: 2 }}>
        Fixed yield (Pendle) data is coming soon. The OneDelta API does not expose this data yet.
      </Alert>
    </Box>
  );
}
