import React, { createContext, useContext, useState, ReactNode } from "react";

export type WalletMode = "retail" | "institutional";

interface WalletContextType {
  mode: WalletMode;
  setMode: (mode: WalletMode) => void;
  bitgoToken: string | null;
  setBitgoToken: (token: string | null) => void;
  enterpriseId: string | null;
  setEnterpriseId: (id: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WalletMode>("retail");
  const [bitgoToken, setBitgoToken] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);

  return (
    <WalletContext.Provider value={{ mode, setMode, bitgoToken, setBitgoToken, enterpriseId, setEnterpriseId }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletMode() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWalletMode must be used within a WalletProvider");
  return context;
}
