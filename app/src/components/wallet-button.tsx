"use client"

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

interface WalletButtonProps {
  className?: string
}

export function WalletButton({ className }: WalletButtonProps) {
  return <WalletMultiButton className={className} />
}
