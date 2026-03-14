import { useState, useMemo, createContext, useContext, useCallback, forwardRef } from "react";
import { Box, IconButton, Tooltip, Dialog, Slide, InputBase } from "@mui/material";
import { useAccount } from "wagmi";
import { Routes, Route, Navigate } from "react-router-dom";
import { useWalletAuth } from "../hooks/useWalletAuth";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import AppHeader from "./AppHeader";
import CommandBar from "./CommandBar";
import ChatSidebar from "./ChatSidebar";
import ChatPanel from "./ChatPanel";
import HeroStats from "./dashboard/HeroStats";
import TopYields from "./dashboard/TopYields";
import MarketPage from "./dashboard/MarketPage";
import MarketExplorer from "./dashboard/MarketExplorer";
import LendingTable from "./markets/LendingTable";
import VaultsTable from "./markets/VaultsTable";
import FixedYieldTable from "./markets/FixedYieldTable";
import ExecutionPanel from "./execution/ExecutionPanel";
import PortfolioPage from "../pages/PortfolioPage";
import SettingsPage from "../pages/SettingsPage";
import Account from "./Account";
import { useChats, type ChatMessage } from "../hooks/useChats";
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
  useWalletAuth();
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

        const payload = JSON.stringify({
          query,
          history,
          userAddress: walletConnected ? walletAddress : undefined,
        });

        const fetchWithTimeout = async (timeoutMs: number) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
              body: payload,
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`Server error (${res.status})`);
            return res.json();
          } catch (err: any) {
            clearTimeout(timer);
            if (err.name === "AbortError") throw new Error("Request timed out");
            throw err;
          }
        };

        let data: any;
        try {
          data = await fetchWithTimeout(55000);
        } catch (firstErr: any) {
          console.warn("Chat first attempt failed, retrying:", firstErr.message);
          try {
            data = await fetchWithTimeout(55000);
          } catch (retryErr: any) {
            throw new Error(
              retryErr.message === "Request timed out"
                ? "The request timed out. The AI might be processing a complex query — please try again."
                : retryErr.message === "Failed to fetch"
                ? "Network error — please check your connection and try again."
                : retryErr.message
            );
          }
        }

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
    [activeChatId, loading, chats, createChat, addMessage, SUPABASE_URL, SUPABASE_KEY, walletAddress, walletConnected],
  );

  const submitAction = useCallback(
    (prompt: string) => {
      setChatOpen(true);
      const cid = activeChatId ?? createChat();
      setTimeout(() => sendMessage(prompt, cid), 100);
    },
    [activeChatId, createChat, sendMessage],
  );

  const ctx = useMemo(() => ({ submitAction }), [submitAction]);

  const isDark = mode === "dark";

  return (
    <ShellContext.Provider value={ctx}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          bgcolor: isDark ? "#0a0f14" : "#f4f6f9",
          color: isDark ? "#eaeef5" : "#0a0a0a",
          position: "relative",
        }}
      >
        {/* Background glows */}
        <Box aria-hidden sx={{ position: "fixed", top: 0, right: 0, width: 500, height: 500, borderRadius: "50%", bgcolor: isDark ? "rgba(0,255,157,0.03)" : "transparent", filter: "blur(120px)", pointerEvents: "none", zIndex: 0 }} />
        <Box aria-hidden sx={{ position: "fixed", bottom: 0, left: 0, width: 600, height: 600, borderRadius: "50%", bgcolor: isDark ? "rgba(120,223,255,0.025)" : "transparent", filter: "blur(150px)", pointerEvents: "none", zIndex: 0 }} />

        <AppHeader
          mode={mode}
          onToggle={onToggle}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((p) => !p)}
        />

        {/* Scrollable main content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            pt: { xs: 2, md: 3 },
            px: { xs: 2, md: 3 },
            pb: "100px",
            maxWidth: 1400,
            mx: "auto",
            width: "100%",
          }}
        >
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/trade" replace />} />

            {/* ── Primary pages ── */}
            <Route path="/trade" element={<TradePage isDark={isDark} />} />
            <Route path="/markets" element={<MarketsPage submitAction={submitAction} />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* ── Legacy redirects ── */}
            <Route path="/explore" element={<Navigate to="/markets" replace />} />
            <Route path="/lending" element={<Navigate to="/markets" replace />} />
            <Route path="/borrow"  element={<Navigate to="/trade"   replace />} />

            {/* ── Market detail pages ── */}
            <Route path="/markets/lending" element={
              <MarketPage title="Lending Markets"><LendingTable viewMode="lending" showTitle={false} /></MarketPage>
            } />
            <Route path="/markets/borrow" element={
              <MarketPage title="Borrow Markets"><LendingTable viewMode="borrow" showTitle={false} /></MarketPage>
            } />
            <Route path="/markets/vaults" element={
              <MarketPage title="Yield Vaults"><VaultsTable showTitle={false} /></MarketPage>
            } />
            <Route path="/markets/fixed" element={
              <MarketPage title="Fixed Rate Markets"><FixedYieldTable showTitle={false} /></MarketPage>
            } />

            {/* ── Legacy detail routes (keep for backward compat) ── */}
            <Route path="/lending/markets" element={<Navigate to="/markets/lending" replace />} />
            <Route path="/borrow/markets"  element={<Navigate to="/markets/borrow"  replace />} />
            <Route path="/lending/vaults"  element={<Navigate to="/markets/vaults"  replace />} />
            <Route path="/lending/fixed"   element={<Navigate to="/markets/fixed"   replace />} />

            <Route path="/account" element={<Account />} />
          </Routes>
        </Box>

        {/* Fixed floating CommandBar */}
        <CommandBar
          loading={loading}
          onSend={(text) => sendMessage(text)}
          onNavigate={() => {}}
          onNewChat={submitAction}
          chatHistory={chats}
          isDark={isDark}
        />

        {/* Chat overlay dialog */}
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
              bgcolor: isDark ? "#0e1419" : "background.default",
              border: "1px solid",
              borderColor: isDark ? "rgba(67,72,78,0.3)" : "divider",
            },
          }}
          sx={{
            "& .MuiBackdrop-root": {
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(6px)",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2, py: 1,
              borderBottom: "1px solid",
              borderColor: isDark ? "rgba(67,72,78,0.3)" : "divider",
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

          <Box sx={{ flex: 1, overflow: "hidden" }}>
            <ChatPanel
              chat={activeChat}
              loading={loading}
              onSuggestion={(s) => sendMessage(s)}
            />
          </Box>

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
              px: 2, py: 1.5,
              borderTop: "1px solid",
              borderColor: isDark ? "rgba(67,72,78,0.3)" : "divider",
              flexShrink: 0,
            }}
          >
            <InputBase
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              fullWidth
              autoFocus
              sx={{ fontSize: 14, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: isDark ? "rgba(31,38,46,0.5)" : "action.hover" }}
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
      </Box>
    </ShellContext.Provider>
  );
}

/* ─── Page components ─────────────────────────────────── */

function TradePage({ isDark: _isDark }: { isDark: boolean }) {
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a7abb2", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
          Execution Interface
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}>
          Trade
        </div>
      </Box>
      <ExecutionPanel />
    </Box>
  );
}

function MarketsPage({ submitAction }: { submitAction: (p: string) => void }) {
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#a7abb2", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
          Market Intelligence
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}>
          Markets
        </div>
      </Box>
      <Box sx={{ mb: 3 }}>
        <HeroStats viewMode="lending" />
      </Box>
      <Box sx={{ mb: 3 }}>
        <TopYields viewMode="lending" onAction={submitAction} />
      </Box>
      <MarketExplorer viewMode="lending" />
    </Box>
  );
}
