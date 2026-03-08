import { useState } from "react";
import {
  Drawer, Box, List, ListItemButton, ListItemText, IconButton, Typography, Divider, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
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
const COLLAPSED_WIDTH = 46;

export default function ChatSidebar({ chats, activeChatId, onSelect, onNew, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const width = open ? DRAWER_WIDTH : COLLAPSED_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: "width 200ms ease",
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          position: "relative",
          height: "100%",
          bgcolor: "background.default",
          overflow: "hidden",
          transition: "width 200ms ease",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          p: open ? 1.5 : 0.75,
          pb: open ? 1 : 0.75,
          minHeight: 40,
        }}
      >
        {open ? (
          <>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.08em", color: "text.secondary" }}
            >
              Chats
            </Typography>
            <Box sx={{ display: "flex", gap: 0.25 }}>
              <IconButton size="small" onClick={onNew} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            </Box>
          </>
        ) : (
          <Tooltip title="Expand chats" placement="right">
            <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Divider />

      {/* Collapsed: icon buttons */}
      {!open && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.5, gap: 0.25 }}>
          <Tooltip title="New chat" placement="right">
            <IconButton size="small" onClick={onNew} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {chats
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 8)
            .map((chat) => {
              const active = chat.id === activeChatId;
              return (
                <Tooltip key={chat.id} title={chat.title} placement="right">
                  <IconButton
                    size="small"
                    onClick={() => onSelect(chat.id)}
                    sx={{
                      color: active ? "text.primary" : "text.secondary",
                      bgcolor: active ? "action.selected" : "transparent",
                      "&:hover": { color: "text.primary" },
                    }}
                  >
                    <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              );
            })}
        </Box>
      )}

      {/* Expanded: full list */}
      {open && (
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
                    "&.Mui-selected": { bgcolor: "action.selected" },
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
      )}
    </Drawer>
  );
}
