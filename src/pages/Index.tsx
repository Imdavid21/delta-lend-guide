import { Box } from "@mui/material";
import ChatSidebar from "../components/ChatSidebar";
import ChatArea from "../components/ChatArea";
import { useChats } from "../hooks/useChats";

export default function Index() {
  const { chats, activeChat, activeChatId, setActiveChatId, createChat, addMessage } = useChats();

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 48px)" }}>
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onNew={createChat}
      />
      <ChatArea
        chat={activeChat}
        chatId={activeChatId}
        onSend={addMessage}
        onCreateChat={createChat}
      />
    </Box>
  );
}
