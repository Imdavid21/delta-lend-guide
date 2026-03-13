import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function MarketPage({ title, children }: Props) {
  const navigate = useNavigate();
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
