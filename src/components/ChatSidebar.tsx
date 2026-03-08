import { useState } from "react";
import {
  Box, List, ListItemButton, ListItemText, IconButton, Typography, Tooltip, Menu,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
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

export default function ChatSidebar({ chats, activeChatId, onSelect, onNew, onDelete }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title="New chat">
        <IconButton size="small" onClick={onNew} sx={{ color: "text.secondary", p: 0.5 }}>
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Typography
        variant="caption"
        fontWeight={600}
        sx={{ fontSize: 12, color: "text.primary", cursor: "pointer" }}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        {activeChat?.title || "New Chat"}
      </Typography>
      <Tooltip title="Chat history">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ color: "text.disabled", p: 0.5 }}
        >
          <HistoryIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              width: 260,
              maxHeight: 320,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.default",
              boxShadow: (t: any) =>
                t.palette.mode === "dark"
                  ? "0 8px 30px rgba(0,0,0,0.6)"
                  : "0 8px 30px rgba(0,0,0,0.1)",
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 9, color: "text.disabled" }}
          >
            Chat History
          </Typography>
        </Box>
        <List dense disablePadding sx={{ maxHeight: 260, overflow: "auto" }}>
          {chats.length === 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", py: 2 }}>
              No chats yet
            </Typography>
          )}
          {chats
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((chat) => {
              const active = chat.id === activeChatId;
              return (
                <ListItemButton
                  key={chat.id}
                  selected={active}
                  onClick={() => { onSelect(chat.id); setAnchorEl(null); }}
                  sx={{
                    py: 0.5,
                    px: 1.5,
                    "&:hover .delete-btn": { opacity: 1 },
                  }}
                >
                  <ListItemText
                    primary={chat.title}
                    secondary={relativeTime(chat.createdAt)}
                    primaryTypographyProps={{ noWrap: true, fontSize: 11, fontWeight: active ? 600 : 400 }}
                    secondaryTypographyProps={{ fontSize: 9, color: "text.disabled" }}
                  />
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onDelete(chat.id); }}
                    sx={{ opacity: 0, transition: "opacity 150ms", ml: 0.5, p: 0.3 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </ListItemButton>
              );
            })}
        </List>
      </Menu>
    </Box>
  );
}
