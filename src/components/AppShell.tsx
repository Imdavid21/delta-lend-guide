import { useState, useMemo, createContext, useContext, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import AppHeader from "./AppHeader";
import ChatSidebar from "./ChatSidebar";
import ChatPanel from "./ChatPanel";
import LendingTable from "./markets/LendingTable";
import VaultsTable from "./markets/VaultsTable";
import FixedYieldTable from "./markets/FixedYieldTable";
import OverviewDashboard from "./markets/OverviewDashboard";
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

export default function AppShell({ mode, onToggle }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const { chats, activeChat, activeChatId, setActiveChatId, createChat, addMessage, deleteChat } =
    useChats();
  const [loading, setLoading] = useState(false);

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
      setTab("chat");
      const cid = createChat();
      setTimeout(() => sendMessage(prompt, cid), 100);
    },
    [createChat, sendMessage],
  );

  const ctx = useMemo(() => ({ submitAction }), [submitAction]);

  const content = useMemo(() => {
    switch (tab) {
      case "lending":
        return <LendingTable />;
      case "vaults":
        return <VaultsTable />;
      case "fixed":
        return <FixedYieldTable />;
      case "chat":
        return (
          <ChatPanel
            chat={activeChat}
            loading={loading}
            onSuggestion={(s) => sendMessage(s)}
          />
        );
      default:
        return <OverviewDashboard onNavigate={setTab} />;
    }
  }, [tab, activeChat, loading, sendMessage]);

  return (
    <ShellContext.Provider value={ctx}>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppHeader activeTab={tab} onTabChange={setTab} mode={mode} onToggle={onToggle} />
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelect={(id) => {
              setActiveChatId(id);
              setTab("chat");
            }}
            onNew={() => {
              createChat();
              setTab("chat");
            }}
            onDelete={deleteChat}
          />
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <Box sx={{ flex: 1, overflow: "auto", p: tab === "chat" ? 0 : 2.5 }}>
              {content}
            </Box>
            {/* Bottom chat input */}
            <Box
              component="form"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                const input = (e.currentTarget as HTMLFormElement).elements.namedItem(
                  "chatInput",
                ) as HTMLInputElement;
                if (input?.value.trim()) {
                  if (tab !== "chat") setTab("chat");
                  sendMessage(input.value);
                  input.value = "";
                }
              }}
              sx={{
                p: 1.5,
                display: "flex",
                gap: 1,
                borderTop: 1,
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <Box
                component="input"
                name="chatInput"
                placeholder="Ask about yields, rates, or execute DeFi actions…"
                disabled={loading}
                autoComplete="off"
                className="clean-input"
                sx={{
                  flex: 1,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: "12px",
                  padding: "8px 14px",
                  fontSize: 13,
                  color: "text.primary",
                  "&::placeholder": { color: "text.secondary", opacity: 1 },
                }}
              />
              <Box
                component="button"
                type="submit"
                disabled={loading}
                sx={{
                  bgcolor: "text.primary",
                  color: "background.default",
                  border: "none",
                  borderRadius: "16px",
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  fontFamily: "inherit",
                  transition: "all 200ms ease",
                  "&:hover": { opacity: 0.85 },
                }}
              >
                {loading ? "…" : "Send"}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ShellContext.Provider>
  );
}
