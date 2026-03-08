import { Box, Paper, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EntityChip from "./EntityChip";
import TxExecutor from "./TxExecutor";
import type { ChatMessage } from "../hooks/useChats";
import type { Components } from "react-markdown";

interface Props {
  message: ChatMessage;
}

const mdComponents: Components = {
  a: ({ href, children }) => {
    const text = String(children);
    if (href?.startsWith("token:")) {
      return <EntityChip kind="token" value={href.replace("token:", "")} label={text} />;
    }
    if (href?.startsWith("chain:")) {
      return <EntityChip kind="chain" value={href.replace("chain:", "")} label={text} />;
    }
    if (href?.startsWith("market:")) {
      return <EntityChip kind="market" value={href.replace("market:", "")} label={text} />;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <Box sx={{ overflowX: "auto", my: 1 }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }} {...props}>
        {children}
      </table>
    </Box>
  ),
  th: ({ children, ...props }) => (
    <th style={{ borderBottom: "1px solid rgba(255,255,255,0.2)", padding: "4px 8px", textAlign: "left", fontSize: 12 }} {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "4px 8px", fontSize: 12 }} {...props}>
      {children}
    </td>
  ),
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", mb: 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.2,
          maxWidth: 600,
          borderRadius: 2.5,
          ...(isUser
            ? { bgcolor: "primary.main", color: "primary.contrastText" }
            : { bgcolor: "background.paper" }),
          "& p": { m: 0 },
          "& p + p": { mt: 1 },
          "& ul, & ol": { pl: 2, my: 0.5 },
          "& code": { fontSize: 12, bgcolor: "action.hover", px: 0.5, borderRadius: 0.5 },
          "& pre": { overflow: "auto", bgcolor: "action.hover", p: 1, borderRadius: 1, my: 1 },
        }}
      >
        {isUser ? (
          <Typography variant="body2">{message.content}</Typography>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </Paper>
      {!isUser && message.transactions && message.transactions.length > 0 && (
        <TxExecutor transactions={message.transactions} quote={message.quote} />
      )}
      <Typography variant="caption" sx={{ color: "text.disabled", mt: 0.3, px: 1 }}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Typography>
    </Box>
  );
}
