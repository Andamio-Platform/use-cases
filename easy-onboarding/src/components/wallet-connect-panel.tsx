"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardanoWallet, useAddress, useNetwork, useWallet } from "@meshsdk/react";

function shortenAddress(address: string) {
  if (address.length < 20) {
    return address;
  }

  return `${address.slice(0, 12)}...${address.slice(-8)}`;
}

function networkLabel(networkId: number | undefined) {
  if (networkId === 1) {
    return "Mainnet";
  }

  if (networkId === 0) {
    return "Testnet";
  }

  return "Unknown";
}

export function WalletConnectPanel() {
  const router = useRouter();
  const wasDisconnectedRef = useRef(false);
  const { connected, connecting } = useWallet();
  const address = useAddress();
  const networkId = useNetwork();

  useEffect(() => {
    if (!connected) {
      wasDisconnectedRef.current = true;
      return;
    }

    // Only redirect if user actively connected (was disconnected first)
    if (wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      router.push("/dashboard");
    }
  }, [connected, router]);

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-white/20 bg-[#0c629d]/55 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <CardanoWallet
          isDark
          label={connecting ? "Connecting..." : "Connect wallet"}
          persist
          showDownload
        />
        {connected ? (
          <Link
            href="/dashboard"
            className="mt-3 inline-flex items-center rounded-md border border-[#004e89]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#004e89] transition hover:bg-[#eef6fb]"
          >
            Go to dashboard
          </Link>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-white/20 bg-white/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfdafe]">
            Status
          </p>
          <p className={`mt-1 font-semibold ${connected ? "text-[#d9ffe7]" : "text-[#ffd9cb]"}`}>
            {connected ? "Connected" : "Not connected"}
          </p>
        </div>
        <div className="rounded-lg border border-white/20 bg-white/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfdafe]">
            Network
          </p>
          <p className="mt-1 font-semibold text-[#ffd0af]">{networkLabel(networkId)}</p>
        </div>
        <div className="rounded-lg border border-white/20 bg-white/10 p-3 sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#cfdafe]">
            Wallet address
          </p>
          <p className="mt-1 font-mono text-xs text-[#e7ecff]">
            {address ? shortenAddress(address) : "Awaiting wallet"}
          </p>
        </div>
      </div>
    </div>
  );
}
