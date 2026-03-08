import { useRef, useEffect } from "react";
import { Box, Typography, Paper, Chip } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import MessageBubble from "./MessageBubble";
import type { Chat } from "../hooks/useChats";

const SUGGESTIONS = [
  "📈 Best USDC lending rates on Ethereum",
  "💰 Compare ETH supply APY across protocols",
  "🔍 Show Morpho Blue vault yields",
  "⚡ What Pendle fixed yields are available?",
  "📊 Top 5 markets by TVL",
  "💼 Show my positions",
];

interface Props {
  chat: Chat | null;
  loading: boolean;
  onSuggestion: (s: string) => void;
}

export default function ChatPanel({ chat, loading, onSuggestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = chat?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  if (isEmpty) {
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
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: "linear-gradient(135deg, #5865F2 0%, #2dd4bf 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <BoltIcon sx={{ fontSize: 32, color: "#fff" }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          How can I help?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ask about lending markets, vault yields, fixed rates, or execute DeFi actions.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, width: "100%" }}>
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              label={s}
              variant="outlined"
              onClick={() => onSuggestion(s)}
              sx={{
                height: "auto",
                py: 1,
                "& .MuiChip-label": { whiteSpace: "normal", fontSize: 12 },
                transition: "all 200ms ease",
                "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
              }}
            />
          ))}
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
          <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 2.5 }}>
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
