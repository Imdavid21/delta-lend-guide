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
        fontWeight: 700,
        py: 0.3,
        px: 1.5,
        minWidth: 0,
        borderRadius: 3,
        borderColor: "divider",
        color: "text.primary",
        "&:hover": {
          bgcolor: "text.primary",
          color: "background.default",
          borderColor: "text.primary",
        },
        transition: "all 200ms ease",
      }}
    >
      {label}
    </Button>
  );
}
