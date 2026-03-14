import { Button } from "@mui/material";
import { useShell } from "../AppShell";

interface Props {
  label: string;
  prompt: string;
}

export default function MarketActionButton({ label, prompt }: Props) {
  const { submitAction } = useShell();

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={() => submitAction(prompt)}
      sx={{
        fontSize: "0.6875rem",
        fontWeight: 800,
        py: 0.5,
        px: 1.75,
        minWidth: 0,
        borderRadius: 1.5,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderColor: "divider",
        color: "primary.main",
        bgcolor: "rgba(0,255,157,0.04)",
        "&:hover": {
          bgcolor: "primary.main",
          color: "primary.contrastText",
          borderColor: "primary.main",
          boxShadow: "0 4px 16px rgba(0,255,157,0.2)",
          transform: "translateY(-1px)",
        },
        transition: "all 200ms ease",
      }}
    >
      {label}
    </Button>
  );
}
