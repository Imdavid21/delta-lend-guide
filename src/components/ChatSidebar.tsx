import {
  Drawer, Box, List, ListItemButton, ListItemText, IconButton, Typography, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { Chat } from "../hooks/useChats";

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const DRAWER_WIDTH = 220;

export default function ChatSidebar({ chats, activeChatId, onSelect, onNew, onDelete }: Props) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          position: "relative",
          height: "100%",
          bgcolor: "background.default",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          pb: 1,
        }}
      >
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}
        >
          Chats
        </Typography>
        <IconButton size="small" onClick={onNew} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <List dense sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
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
                  borderLeft: active ? "2px solid" : "2px solid transparent",
                  borderColor: active ? "text.primary" : "transparent",
                  py: 0.75,
                  px: 1.5,
                  transition: "all 150ms ease",
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                  "&:hover .delete-btn": { opacity: 1 },
                }}
              >
                <ListItemText
                  primary={chat.title}
                  secondary={relativeTime(chat.createdAt)}
                  primaryTypographyProps={{ noWrap: true, fontSize: 12, fontWeight: active ? 600 : 400 }}
                  secondaryTypographyProps={{ fontSize: 10 }}
                />
                <IconButton
                  className="delete-btn"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(chat.id);
                  }}
                  sx={{ opacity: 0, transition: "opacity 150ms", ml: 0.5, p: 0.3 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </ListItemButton>
            );
          })}
      </List>
    </Drawer>
  );
}
