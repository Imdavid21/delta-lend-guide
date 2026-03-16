import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { useAccount, useSwitchChain, useSendTransaction } from "wagmi";
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
  const [errors, setErrors] = useState<(string | null)[]>(transactions.map(() => null));

  const allDone = statuses.every((s) => s === "success");
  const isPending = statuses.some((s) => s === "pending");
  const hasError = statuses.some((s) => s === "error");
  const completedCount = statuses.filter((s) => s === "success").length;

  const execute = async () => {
    for (let i = 0; i < transactions.length; i++) {
      if (statuses[i] === "success") continue;
      const step = transactions[i];
      setStatuses((p) => p.map((s, j) => (j === i ? "pending" : s)));
      try {
        if (step.chainId && step.chainId !== currentChain) {
          await switchChainAsync({ chainId: step.chainId });
        }
        await sendTransactionAsync({
          to: step.to as `0x${string}`,
          data: step.data as `0x${string}`,
          value: BigInt(step.value || 0),
        });
        setStatuses((p) => p.map((s, j) => (j === i ? "success" : s)));
      } catch (err: any) {
        setErrors((p) => p.map((e, j) => (j === i ? err?.shortMessage || err?.message || "Failed" : e)));
        setStatuses((p) => p.map((s, j) => (j === i ? "error" : s)));
        break;
      }
    }
  };

  return (
    <Box sx={{ mt: 1, maxWidth: 600, border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {transactions.length} transaction(s) to execute
        </Typography>
      </Box>
      {/* show any per-step errors so the user knows which step failed */}
      {errors.some(Boolean) && (
        <Box sx={{ px: 2, pb: 1 }}>
          {errors.map((e, i) => e && (
            <Typography key={i} variant="caption" color="error" display="block">
              Step {i + 1}: {e}
            </Typography>
          ))}
        </Box>
      )}
      <Box sx={{ p: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          disabled={allDone || isPending}
          onClick={execute}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            borderRadius: 3,
            fontWeight: 700,
            py: 1,
            ...(allDone && { bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }),
          }}
        >
          {allDone
            ? "All Transactions Completed"
            : isPending
            ? `Executing ${completedCount + 1} of ${transactions.length}…`
            : hasError
            ? "Retry"
            : "Execute Transactions"}
        </Button>
      </Box>
    </Box>
  );
}
