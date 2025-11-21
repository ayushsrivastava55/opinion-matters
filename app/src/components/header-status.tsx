"use client"

import { ShieldCheck, Wifi } from "lucide-react"

const getNetworkLabel = () => {
  const raw = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet").toLowerCase()
  if (raw.startsWith("main")) return "Mainnet"
  if (raw.startsWith("test")) return "Testnet"
  return "Devnet"
}

export function HeaderStatus() {
  const networkLabel = getNetworkLabel()

  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70 md:flex">
      <span className="inline-flex items-center gap-1">
        <Wifi className="h-3 w-3 text-green-300" />
        <span>{networkLabel}</span>
      </span>
      <span className="text-white/25">•</span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-orange-300" />
        <span>MPC via Arcium</span>
      </span>
    </div>
  )
}
