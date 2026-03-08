import { useState } from "react";
import {
  Box, List, ListItemButton, ListItemText, IconButton, Typography, Divider, Tooltip, Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Collapsed: single subtle icon tab on the left edge */}
      {!open && (
        <Box
          sx={{
            width: 36,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 1.5,
            gap: 0.5,
            borderRight: 1,
            borderColor: "divider",
          }}
        >
          <Tooltip title="Chat history" placement="right">
            <IconButton
              size="small"
              onClick={() => setOpen(true)}
              sx={{
                color: "text.disabled",
                transition: "all 200ms ease",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Badge
                badgeContent={chats.length || undefined}
                color="default"
                max={9}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: 9,
                    height: 14,
                    minWidth: 14,
                    bgcolor: "text.disabled",
                    color: "background.default",
                  },
                }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Expanded panel — slides over content */}
      {open && (
        <Box
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.5,
              py: 1,
              minHeight: 40,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary", fontSize: 10 }}
            >
              Chat History
            </Typography>
            <Box sx={{ display: "flex", gap: 0.25 }}>
              <Tooltip title="New chat" placement="bottom">
                <IconButton size="small" onClick={onNew} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" }, p: 0.4 }}>
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close" placement="bottom">
                <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "text.disabled", "&:hover": { color: "text.primary" }, p: 0.4 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Divider />

          {/* Chat list */}
          <List dense sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
            {chats.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", py: 3, px: 2 }}>
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
                    onClick={() => onSelect(chat.id)}
                    sx={{
                      py: 0.6,
                      px: 1.5,
                      transition: "all 150ms ease",
                      borderLeft: "2px solid transparent",
                      ...(active && { borderLeftColor: "text.primary", bgcolor: "action.selected" }),
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(chat.id);
                      }}
                      sx={{ opacity: 0, transition: "opacity 150ms", ml: 0.5, p: 0.3 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </ListItemButton>
                );
              })}
          </List>
        </Box>
      )}
    </>
  );
}
