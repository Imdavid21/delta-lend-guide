import { useState, useRef, useEffect } from "react";
import {
  Box, Typography, Paper, TextField, IconButton, Chip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import BoltIcon from "@mui/icons-material/Bolt";
import { useAccount } from "wagmi";
import MessageBubble from "./MessageBubble";
import type { Chat, ChatMessage } from "../hooks/useChats";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTIONS = [
  "📈 Show me the market with the best yield on Arbitrum",
  "💼 Show me my positions",
  "💰 What are the best USDC lending rates right now?",
  "🔍 Compare borrowing rates across all chains",
  "⚡ What is the highest APY for ETH collateral?",
  "📊 Show me the top 5 markets by total supply",
];

interface Props {
  chat: Chat | null;
  chatId: string | null;
  onSend: (chatId: string, msg: ChatMessage) => void;
  onCreateChat: () => string;
}

export default function ChatArea({ chat, chatId, onSend, onCreateChat }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { address } = useAccount();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages.length, loading]);

  const submit = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading) return;
    setInput("");

    let cid = chatId;
    if (!cid) cid = onCreateChat();

    const userMsg: ChatMessage = { role: "user", content: query, timestamp: Date.now() };
    onSend(cid, userMsg);
    setLoading(true);

    try {
      const history = (chat?.messages ?? []).slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ query, userAddress: address, history }),
      });

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.response || data.error || "No response",
        timestamp: Date.now(),
        transactions: data.transactions,
        quote: data.quote,
      };
      onSend(cid, assistantMsg);
    } catch (err: any) {
      onSend(cid, {
        role: "assistant",
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const messages = chat?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, height: "100vh", overflow: "hidden" }}>
      {/* Messages / Empty state */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {isEmpty ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", maxWidth: 480, mx: "auto" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
              <BoltIcon sx={{ fontSize: 36, color: "primary.contrastText" }} />
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              How can I help you today?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Ask me about lending markets, rates, positions, or execute DeFi actions.
            </Typography>
            {!address && (
              <Typography variant="caption" color="primary" sx={{ mb: 2 }}>
                Connect your wallet to query your positions automatically.
              </Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1, width: "100%" }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  variant="outlined"
                  onClick={() => submit(s)}
                  sx={{ height: "auto", py: 1, "& .MuiChip-label": { whiteSpace: "normal", fontSize: 12 } }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <>
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
                          width: 8, height: 8, borderRadius: "50%", bgcolor: "text.disabled",
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
          </>
        )}
      </Box>

      {/* Input */}
      <Paper elevation={3} sx={{ p: 2, m: 2, mt: 0, display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about lending markets..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
          disabled={loading}
        />
        <IconButton color="primary" onClick={() => submit()} disabled={loading || !input.trim()}>
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}
