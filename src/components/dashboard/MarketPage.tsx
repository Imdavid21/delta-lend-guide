import { Box, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  title: string;
}

export default function MarketPage({ children, title }: Props) {
  const navigate = useNavigate();
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary", ml: -0.5 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#e0e4eb", fontFamily: "Inter, sans-serif" }}>
          {title}
        </div>
      </Box>
      {children}
    </Box>
  );
}
