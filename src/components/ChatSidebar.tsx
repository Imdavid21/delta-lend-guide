import {
  Drawer, Box, List, ListItemButton, ListItemText, IconButton, Typography, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { Chat } from "../hooks/useChats";

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const DRAWER_WIDTH = 240;

export default function ChatSidebar({ chats, activeChatId, onSelect, onNew }: Props) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>Chats</Typography>
        <IconButton size="small" onClick={onNew}><AddIcon /></IconButton>
      </Box>
      <Divider />
      <List dense sx={{ flex: 1, overflow: "auto" }}>
        {chats
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <ListItemButton
                key={chat.id}
                selected={active}
                onClick={() => onSelect(chat.id)}
                sx={{
                  borderLeft: active ? "3px solid" : "3px solid transparent",
                  borderColor: active ? "primary.main" : "transparent",
                }}
              >
                <ListItemText
                  primary={chat.title}
                  secondary={relativeTime(chat.createdAt)}
                  primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
              </ListItemButton>
            );
          })}
      </List>
    </Drawer>
  );
}
