import { useEnsName, useEnsAvatar } from "wagmi";
import { mainnet } from "@reown/appkit/networks";

/**
 * Resolve ENS name + avatar for a wallet address.
 * Always queries mainnet regardless of connected chain.
 */
export function useEnsIdentity(address?: `0x${string}`) {
  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !!address },
  });

  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
    query: { enabled: !!ensName },
  });

  return {
    ensName: ensName ?? null,
    ensAvatar: ensAvatar ?? null,
    isLoading: nameLoading || avatarLoading,
    /** Short display: ENS name if available, else truncated address */
    displayName: ensName ?? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null),
  };
}
