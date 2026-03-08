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
        fontSize: 11,
        fontWeight: 600,
        py: 0.3,
        px: 1.5,
        minWidth: 0,
        borderColor: "primary.main",
        color: "primary.main",
        "&:hover": {
          bgcolor: "primary.main",
          color: "#fff",
        },
        transition: "all 200ms ease",
      }}
    >
      {label}
    </Button>
  );
}
