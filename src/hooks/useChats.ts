import { useState, useCallback, useEffect } from "react";

export interface TxStep {
  description: string;
  to: string;
  data: string;
  value: string;
  chainId?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  transactions?: TxStep[];
  quote?: any;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const STORAGE_KEY = "lending-chats";

function loadChats(): Chat[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const c = loadChats();
    return c.length > 0 ? c[0].id : null;
  });

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const createChat = useCallback(() => {
    const id = crypto.randomUUID();
    const chat: Chat = { id, title: "New chat", messages: [], createdAt: Date.now() };
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(id);
    return id;
  }, []);

  const addMessage = useCallback(
    (chatId: string, msg: ChatMessage) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          const messages = [...c.messages, msg];
          const title =
            c.title === "New chat" && msg.role === "user"
              ? msg.content.slice(0, 40)
              : c.title;
          return { ...c, messages, title };
        })
      );
    },
    []
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId((prev) => {
          const remaining = chats.filter((c) => c.id !== chatId);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }
    },
    [activeChatId, chats]
  );

  return { chats, activeChat, activeChatId, setActiveChatId, createChat, addMessage, deleteChat };
}
