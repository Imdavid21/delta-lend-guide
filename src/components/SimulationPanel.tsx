import {
  Table, TableBody, TableCell, TableContainer, TableRow, Alert, Typography,
} from "@mui/material";

interface Props {
  quote: any;
}

export default function SimulationPanel({ quote }: Props) {
  const sim = quote?.simulation;
  if (!sim) return null;

  const rows = [
    { label: "Health Factor", before: sim.healthFactorBefore, after: sim.healthFactorAfter },
    { label: "Borrow Capacity", before: sim.borrowCapacityBefore, after: sim.borrowCapacityAfter },
    { label: "Collateral", before: sim.collateralBefore, after: sim.collateralAfter },
    { label: "Total Debt", before: sim.totalDebtBefore, after: sim.totalDebtAfter },
    { label: "Borrow APR", before: sim.borrowAprBefore, after: sim.borrowAprAfter },
    { label: "Deposit APR", before: sim.depositAprBefore, after: sim.depositAprAfter },
  ].filter((r) => r.before !== undefined || r.after !== undefined);

  const postHF = parseFloat(sim.healthFactorAfter);
  const showWarning = !isNaN(postHF) && postHF < 1.5;

  return (
    <>
      {showWarning && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Post-transaction health factor is {postHF.toFixed(2)} — liquidation risk!
        </Alert>
      )}
      <TableContainer>
        <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>Simulation</Typography>
        <Table size="small">
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{r.label}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.before ?? "—"}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>→</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{r.after ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
