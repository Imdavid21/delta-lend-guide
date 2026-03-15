import { useRef, useEffect, useState } from "react";
import { Box, Typography, Paper, Chip, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MessageBubble from "./MessageBubble";
import nebulaLogo from "@/assets/nebula-logo.png";
import type { Chat } from "../hooks/useChats";

const SUGGESTIONS = [
  "Best USDC lending rates on Ethereum",
  "Lowest USDC borrow APR on Ethereum",
  "Compare ETH supply APY across protocols",
  "Show top Morpho vault yields",
  "Top 5 markets by TVL",
  "Look up vitalik.eth's DeFi positions",
  "Show my positions",
];

interface Props {
  chat: Chat | null;
  loading: boolean;
  onSuggestion: (s: string) => void;
}

export default function ChatPanel({ chat, loading, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const messages = chat?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  if (isEmpty && !dismissed) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          maxWidth: 520,
          mx: "auto",
          px: 2,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Box
            component="img"
            src={nebulaLogo}
            alt="Nebula"
            sx={{
              width: 56,
              height: 56,
              filter: (t) => t.palette.mode === "dark" ? "none" : "invert(1)",
            }}
          />
        </Box>
        <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: "-0.02em" }}>
          How can I help?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ask about lending and borrowing rates, vault yields, or execute DeFi transactions. Search any ENS name to explore their portfolio.
        </Typography>

        {/* Quick Actions */}
        <Box sx={{ width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, px: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Suggestions
            </Typography>
            <IconButton size="small" onClick={() => setDismissed(true)} sx={{ color: "text.disabled", p: 0.3 }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                label={s}
                variant="outlined"
                onClick={() => onSuggestion(s)}
                sx={{
                  height: "auto",
                  py: 1,
                  borderRadius: 3,
                  borderColor: "divider",
                  "& .MuiChip-label": { whiteSpace: "normal", fontSize: 12, textAlign: "center", width: "100%" },
                  transition: "all 200ms ease",
                  "&:hover": {
                    borderColor: "text.primary",
                    bgcolor: "action.hover",
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      {messages.map((m, i) => (
        <MessageBubble key={i} message={m} />
      ))}
      {loading && (
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.5 }}>
          <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, border: 1, borderColor: "divider" }}>
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "text.disabled",
                    animation: "bounce 1.4s infinite ease-in-out",
                    animationDelay: `${i * 0.16}s`,
                    "@keyframes bounce": {
                      "0%,80%,100%": { transform: "scale(0)" },
                      "40%": { transform: "scale(1)" },
                    },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Box>
      )}
      <div ref={bottomRef} />
    </Box>
  );
}
