import { Box, Paper, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EntityChip from "./EntityChip";
import MarketCard from "./MarketCard";
import TxExecutor from "./TxExecutor";
import { useShell } from "./AppShell";
import type { ChatMessage } from "../hooks/useChats";
import type { Components } from "react-markdown";

/** Parse {{market:ID;;PROTOCOL;;ASSET;;APY;;TVL|Label}} segments */
interface MarketSegment {
  type: "market";
  id: string;
  protocol: string;
  asset: string;
  apy: string;
  tvl: string;
  label: string;
}

interface TextSegment {
  type: "text";
  value: string;
}

type ContentSegment = MarketSegment | TextSegment;

const MARKET_RE = /\{\{market:([^}]+)\|([^}]+)\}\}/g;

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MARKET_RE.lastIndex = 0;
  while ((match = MARKET_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    const parts = match[1].split(";;");
    if (parts.length >= 5) {
      segments.push({
        type: "market",
        id: parts[0],
        protocol: parts[1],
        asset: parts[2],
        apy: parts[3],
        tvl: parts[4],
        label: match[2],
      });
    } else {
      // Fallback: render as text
      segments.push({ type: "text", value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments;
}

function useMdComponents(): Components {
  const { submitAction } = useShell();

  return {
    a: ({ href, children }) => {
      const text = String(children);
      if (href?.startsWith("token:")) {
        return <EntityChip kind="token" value={href.replace("token:", "")} label={text} />;
      }
      if (href?.startsWith("chain:")) {
        return <EntityChip kind="chain" value={href.replace("chain:", "")} label={text} />;
      }
      if (href?.startsWith("market:")) {
        const marketId = href.replace("market:", "");
        return (
          <EntityChip
            kind="market"
            value={marketId}
            label={text}
            onClick={() => submitAction(`Tell me more about ${text} and help me deposit (market id: ${marketId})`)}
          />
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
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
      <th style={{ borderBottom: "1px solid var(--md-border)", padding: "4px 8px", textAlign: "left", fontSize: 12 }} {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td style={{ borderBottom: "1px solid var(--md-border)", padding: "4px 8px", fontSize: 12 }} {...props}>
        {children}
      </td>
    ),
  };
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const mdComponents = useMdComponents();
  const { submitAction } = useShell();

  const segments = isUser ? null : parseContent(message.content);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", mb: 2.5 }}>
      <Paper
        elevation={0}
        sx={{
          px: 2.5,
          py: 1.5,
          maxWidth: "85%",
          borderRadius: 3,
          border: 1,
          borderColor: isUser ? "text.primary" : "divider",
          textAlign: "left",
          ...(isUser
            ? { bgcolor: "text.primary", color: "background.default" }
            : { bgcolor: "background.default" }),
          "& p": { m: 0, lineHeight: 1.7 },
          "& p + p": { mt: 1.5 },
          "& ul, & ol": { pl: 2.5, my: 1 },
          "& li": { mb: 0.5 },
          "& li:last-child": { mb: 0 },
          "& h3, & h4": { mt: 2, mb: 1 },
          "& code": { fontSize: 12, bgcolor: "action.hover", px: 0.5, borderRadius: 0.5 },
          "& pre": { overflow: "auto", bgcolor: "action.hover", p: 1, borderRadius: 1, my: 1.5 },
        }}
      >
        {isUser ? (
          <Typography variant="body2">{message.content}</Typography>
        ) : (
          segments!.map((seg, i) =>
            seg.type === "market" ? (
              <MarketCard
                key={i}
                label={seg.label}
                marketId={seg.id}
                protocol={seg.protocol}
                asset={seg.asset}
                apy={seg.apy}
                tvl={seg.tvl}
                onClick={() => submitAction(`Tell me more about ${seg.label} and help me deposit (market id: ${seg.id})`)}
              />
            ) : (
              <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
                {seg.value}
              </ReactMarkdown>
            )
          )
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
