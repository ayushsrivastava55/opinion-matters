'use client'

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { clusterApiUrl, Connection } from '@solana/web3.js'
import { ReactNode, useMemo } from 'react'
import '@solana/wallet-adapter-react-ui/styles.css'

export function Providers({ children }: { children: ReactNode }) {
  const envNetwork = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Devnet
  const envEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  const network = envNetwork
  const endpoint = envEndpoint || clusterApiUrl(network)

  // Blockchain-grade connection configuration
  const connection = useMemo(() => new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 30000, // 30 seconds - standard block time
    httpHeaders: {
      'Content-Type': 'application/json',
      'User-Agent': 'Arcium-PrivateMarkets/1.0.0'
    }
  }), [endpoint])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
