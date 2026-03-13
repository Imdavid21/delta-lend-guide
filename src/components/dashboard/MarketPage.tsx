import { Box, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function MarketPage({ children }: Props) {
  const navigate = useNavigate();
  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </Box>
  );
}
