import { useState } from "react";
import {
  Box, List, ListItem, ListItemIcon, ListItemText, Button, Typography, Collapse, IconButton,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CircularProgress from "@mui/material/CircularProgress";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAccount, useSwitchChain, useSendTransaction } from "wagmi";
import SimulationPanel from "./SimulationPanel";
import type { TxStep } from "../hooks/useChats";

type StepStatus = "idle" | "pending" | "success" | "error";

interface Props {
  transactions: TxStep[];
  quote?: any;
}

export default function TxExecutor({ transactions, quote }: Props) {
  const { chainId: currentChain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [statuses, setStatuses] = useState<StepStatus[]>(transactions.map(() => "idle"));
  const [hashes, setHashes] = useState<(string | null)[]>(transactions.map(() => null));
  const [errors, setErrors] = useState<(string | null)[]>(transactions.map(() => null));
  const [expanded, setExpanded] = useState<number | null>(null);

  const allDone = statuses.every((s) => s === "success");
  const hasError = statuses.some((s) => s === "error");

  const execute = async () => {
    for (let i = 0; i < transactions.length; i++) {
      if (statuses[i] === "success") continue;
      const step = transactions[i];
      setStatuses((p) => p.map((s, j) => (j === i ? "pending" : s)));
      try {
        if (step.chainId && step.chainId !== currentChain) {
          await switchChainAsync({ chainId: step.chainId });
        }
        const hash = await sendTransactionAsync({
          to: step.to as `0x${string}`,
          data: step.data as `0x${string}`,
          value: BigInt(step.value || 0),
        });
        setHashes((p) => p.map((h, j) => (j === i ? hash : h)));
        setStatuses((p) => p.map((s, j) => (j === i ? "success" : s)));
      } catch (err: any) {
        setErrors((p) => p.map((e, j) => (j === i ? err?.shortMessage || err?.message || "Failed" : e)));
        setStatuses((p) => p.map((s, j) => (j === i ? "error" : s)));
        break;
      }
    }
  };

  const statusIcon = (s: StepStatus) => {
    switch (s) {
      case "pending": return <CircularProgress size={20} />;
      case "success": return <CheckCircleIcon sx={{ color: "#22c55e" }} />;
      case "error": return <CancelIcon color="error" />;
      default: return <RadioButtonUncheckedIcon sx={{ color: "text.disabled" }} />;
    }
  };

  return (
    <Box sx={{ mt: 1, maxWidth: 600, border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {transactions.length} transaction(s) to execute
        </Typography>
      </Box>
      <Box sx={{ px: 1, pt: 0.5 }}>
        {quote && <SimulationPanel quote={quote} />}
        <List dense disablePadding>
          {transactions.map((step, i) => (
            <Box key={i}>
              <ListItem
                secondaryAction={
                  <IconButton size="small" onClick={() => setExpanded(expanded === i ? null : i)}>
                    <ExpandMoreIcon sx={{ transform: expanded === i ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{statusIcon(statuses[i])}</ListItemIcon>
                <ListItemText
                  primary={step.description.charAt(0).toUpperCase() + step.description.slice(1)}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
                  secondary={
                    hashes[i] ? (
                      <Typography variant="caption" sx={{ color: "#22c55e", fontFamily: "monospace" }}>
                        {hashes[i]}
                      </Typography>
                    ) : errors[i] ? (
                      <Typography variant="caption" color="error">{errors[i]}</Typography>
                    ) : null
                  }
                />
              </ListItem>
              <Collapse in={expanded === i}>
                <Box sx={{ pl: 7, pr: 2, pb: 1 }}>
                  <Typography variant="caption" color="text.secondary">To:</Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", wordBreak: "break-all" }}>{step.to}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>Data:</Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", wordBreak: "break-all", maxHeight: 60, overflow: "auto" }}>
                    {step.data}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          ))}
        </List>
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={allDone || statuses.some((s) => s === "pending")}
          onClick={execute}
          sx={{
            borderRadius: 3,
            fontWeight: 700,
            py: 1,
            ...(allDone && { bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }),
          }}
        >
          {allDone ? "All Transactions Completed" : hasError ? "Retry" : "Execute Transactions"}
        </Button>
      </Box>
    </Box>
  );
}
