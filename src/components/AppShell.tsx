import { useState, useMemo, createContext, useContext, useCallback } from "react";
import { Box, IconButton, Tooltip, Fab, Dialog, Slide, InputBase } from "@mui/material";
import { useAccount } from "wagmi";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import AppHeader from "./AppHeader";
import CommandBar from "./CommandBar";
import ChatSidebar from "./ChatSidebar";
import ChatPanel from "./ChatPanel";
import HeroStats from "./dashboard/HeroStats";
import TopYields from "./dashboard/TopYields";
import MarketExplorer from "./dashboard/MarketExplorer";
import PositionsPanel from "./dashboard/PositionsPanel";
import { useChats, type ChatMessage } from "../hooks/useChats";
import { forwardRef } from "react";
import type { TransitionProps } from "@mui/material/transitions";

export type TabId = "overview" | "lending" | "vaults" | "fixed" | "chat";

interface ShellCtx {
  submitAction: (prompt: string) => void;
}
export const ShellContext = createContext<ShellCtx>({ submitAction: () => {} });
export const useShell = () => useContext(ShellContext);

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
}

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function AppShell({ mode, onToggle }: Props) {
  const [chatInput, setChatInput] = useState("");
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const { chats, activeChat, activeChatId, setActiveChatId, createChat, addMessage, deleteChat } =
    useChats();
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const sendMessage = useCallback(
    async (text: string, chatIdOverride?: string) => {
      const query = text.trim();
      if (!query || loading) return;

      let cid = chatIdOverride ?? activeChatId;
      if (!cid) cid = createChat();

      const userMsg: ChatMessage = { role: "user", content: query, timestamp: Date.now() };
      addMessage(cid, userMsg);
      setLoading(true);
      setChatOpen(true);

      try {
        const history = (chats.find((c) => c.id === cid)?.messages ?? [])
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            query,
            history,
            userAddress: walletConnected ? walletAddress : undefined,
          }),
        });

        const data = await res.json();
        addMessage(cid, {
          role: "assistant",
          content: data.response || data.error || "No response",
          timestamp: Date.now(),
          transactions: data.transactions,
          quote: data.quote,
        });
      } catch (err: any) {
        addMessage(cid, {
          role: "assistant",
          content: `Error: ${err.message}`,
          timestamp: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    },
    [activeChatId, loading, chats, createChat, addMessage, SUPABASE_URL, SUPABASE_KEY],
  );

  const submitAction = useCallback(
    (prompt: string) => {
      setChatOpen(true);
      const cid = createChat();
      setTimeout(() => sendMessage(prompt, cid), 100);
    },
    [createChat, sendMessage],
  );

  const ctx = useMemo(() => ({ submitAction }), [submitAction]);

  return (
    <ShellContext.Provider value={ctx}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppHeader
          mode={mode}
          onToggle={onToggle}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((p) => !p)}
        />

        {/* Main dashboard content */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: { xs: 2, md: 3 },
              maxWidth: 1400,
              mx: "auto",
              width: "100%",
            }}
          >
            <Box sx={{ mb: 2.5 }}>
              <HeroStats />
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" },
                gap: 2,
                mb: 2.5,
              }}
            >
              <TopYields onAction={submitAction} />
              <PositionsPanel onAskChat={submitAction} />
            </Box>
            <MarketExplorer />
          </Box>

          <CommandBar
            loading={loading}
            onSend={(text) => sendMessage(text)}
            onNavigate={() => {}}
            onNewChat={submitAction}
            chatHistory={chats}
          />
        </Box>

        {/* Chat overlay — centered dialog on top of dashboard */}
        <Dialog
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          TransitionComponent={SlideUp}
          maxWidth={false}
          PaperProps={{
            sx: {
              width: { xs: "95vw", sm: "85vw", md: "80vw" },
              maxWidth: 900,
              height: "80vh",
              maxHeight: "80vh",
              borderRadius: 4,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              bgcolor: "background.default",
              border: 1,
              borderColor: "divider",
            },
          }}
          sx={{
            "& .MuiBackdrop-root": {
              backgroundColor: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(4px)",
            },
          }}
        >
          {/* Chat header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              minHeight: 44,
              flexShrink: 0,
            }}
          >
            <ChatSidebar
              chats={chats}
              activeChatId={activeChatId}
              onSelect={(id) => setActiveChatId(id)}
              onNew={() => createChat()}
              onDelete={deleteChat}
            />
            <Tooltip title="Close chat">
              <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: "text.secondary" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Chat content */}
          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <ChatPanel
              chat={activeChat}
              loading={loading}
              onSuggestion={(s) => sendMessage(s)}
            />
          </Box>

          {/* Chat input */}
          <Box
            component="form"
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              if (chatInput.trim()) {
                sendMessage(chatInput.trim());
                setChatInput("");
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 1.5,
              borderTop: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <InputBase
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              fullWidth
              autoFocus
              sx={{
                fontSize: 14,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            />
            <IconButton
              type="submit"
              size="small"
              disabled={!chatInput.trim() || loading}
              sx={{ color: "text.primary" }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Dialog>

        {/* Chat FAB when dialog is closed */}
        {!chatOpen && (
          <Fab
            size="medium"
            onClick={() => setChatOpen(true)}
            sx={{
              position: "fixed",
              bottom: 80,
              right: 24,
              bgcolor: "text.primary",
              color: "background.default",
              "&:hover": { bgcolor: "text.secondary" },
              zIndex: 1200,
              boxShadow: (t) =>
                t.palette.mode === "dark"
                  ? "0 4px 20px rgba(255,255,255,0.1)"
                  : "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <ChatBubbleOutlineIcon />
          </Fab>
        )}
      </Box>
    </ShellContext.Provider>
  );
}
