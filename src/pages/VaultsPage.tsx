import { Box, Typography, Alert } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

export default function VaultsPage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        Vaults
      </Typography>
      <Alert icon={<InfoIcon />} severity="info" sx={{ mt: 2 }}>
        Vault data is coming soon. The OneDelta API does not expose vault data yet.
      </Alert>
    </Box>
  );
}
