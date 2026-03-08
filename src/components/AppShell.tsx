import { useState, useMemo, createContext, useContext, useCallback } from "react";
import { Box, Drawer, IconButton, Tooltip, Fab } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
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

const CHAT_DRAWER_WIDTH = 420;

export default function AppShell({ mode, onToggle }: Props) {
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
          body: JSON.stringify({ query, history }),
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

        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Main dashboard content */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transition: "margin-right 250ms ease",
              mr: chatOpen ? `${CHAT_DRAWER_WIDTH}px` : 0,
            }}
          >
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
              {/* Hero stats */}
              <Box sx={{ mb: 2.5 }}>
                <HeroStats />
              </Box>

              {/* Top yields + Positions row */}
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

              {/* Market explorer */}
              <MarketExplorer />
            </Box>

            {/* Command bar */}
            <CommandBar
              loading={loading}
              onSend={(text) => {
                sendMessage(text);
              }}
              onNavigate={() => {}}
              onNewChat={submitAction}
              chatHistory={chats}
            />
          </Box>

          {/* Chat drawer */}
          <Drawer
            variant="persistent"
            anchor="right"
            open={chatOpen}
            sx={{
              width: chatOpen ? CHAT_DRAWER_WIDTH : 0,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: CHAT_DRAWER_WIDTH,
                border: "none",
                borderLeft: 1,
                borderColor: "divider",
                bgcolor: "background.default",
                top: 49,
                height: "calc(100% - 49px)",
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
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
            </Box>
          </Drawer>
        </Box>

        {/* Chat FAB when drawer is closed */}
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
