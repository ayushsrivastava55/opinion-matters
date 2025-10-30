"use client"

import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock4,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Zap
} from 'lucide-react'
import { AuroraBackground } from '@/components/magicui/aurora-background'
import { MagicCard } from '@/components/magicui/magic-card'
import { ShinyButton } from '@/components/magicui/shiny-button'
import { NoSSR } from '@/components/no-ssr'
import { WalletButton } from '@/components/wallet-button'
import Link from 'next/link'
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { PublicKey, Keypair } from '@solana/web3.js'

type TimestampLike = { toString: () => string }

type EmptyState = Record<string, never>

type ResolutionState =
  | { active: EmptyState }
  | { awaitingAttestation: EmptyState }
  | { computing: EmptyState }
  | { resolved: { finalOutcome: number } }

type ResolvedState = Extract<ResolutionState, { resolved: { finalOutcome: number } }>

interface Market {
  publicKey: string
  account: {
    authority: string
    question: string
    endTime: TimestampLike
    feeBps: number
    resolutionState: ResolutionState
    yesReserves: number
    noReserves: number
    totalVolume: number
  }
}

// Derived stats

export default function MarketsPage() {
  const { connected, publicKey } = useWallet()
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro')

  const stats = useMemo(() => {
    const totalMarkets = markets.length
    const totalVolumeRaw = markets.reduce((acc, m) => acc + (m.account.totalVolume || 0), 0)
    const formatAbbrev = (n: number) => {
      if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
      return `$${n}`
    }
    return [
      { label: 'Total markets', value: String(totalMarkets), sublabel: 'Active predictions' },
      { label: 'Total volume', value: formatAbbrev(totalVolumeRaw), sublabel: 'Across all markets' },
      { label: '24h volume', value: '—', sublabel: 'Coming soon' },
    ]
  }, [markets])

  useEffect(() => {
    // Fetch on mount
    loadMarkets()
  }, [])

  useEffect(() => {
    // Refresh when wallet connects
    if (connected) loadMarkets()
  }, [connected])

  const loadMarkets = async () => {
    try {
      setLoading(true)
      // Build Anchor provider using connected wallet or a dummy wallet for reads
      const dummyWallet = {
        publicKey: Keypair.generate().publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any
      const provider = new AnchorProvider(connection, (anchorWallet as any) || dummyWallet, {})

      // Try fetching IDL from chain/registry
      let idl = await Program.fetchIdl(PROGRAM_ID, provider)
      if (!idl) {
        console.warn('IDL not found on-chain for program', PROGRAM_ID.toBase58(), '- trying local fallback')
        try {
          const mod = await import('@/idl/private_markets.json')
          idl = (mod as any).default as Idl
        } catch (e) {
          console.warn('Local IDL not found at src/idl/private_markets.json')
        }
      }

      if (!idl) {
        setMarkets([])
        setLoading(false)
        return
      }

      const program = new Program(idl, PROGRAM_ID, provider)
      const all = await program.account.market.all()

      const hydrated: Market[] = all.map((m: any) => ({
        publicKey: m.publicKey.toBase58(),
        account: {
          authority: m.account.authority.toBase58(),
          question: m.account.question as string,
          endTime: { toString: () => (m.account.endTime.toString ? m.account.endTime.toString() : String(m.account.endTime)) },
          feeBps: Number(m.account.feeBps),
          resolutionState: m.account.resolutionState,
          yesReserves: m.account.yesReserves.toNumber ? m.account.yesReserves.toNumber() : Number(m.account.yesReserves),
          noReserves: m.account.noReserves.toNumber ? m.account.noReserves.toNumber() : Number(m.account.noReserves),
          totalVolume: m.account.totalVolume.toNumber ? m.account.totalVolume.toNumber() : Number(m.account.totalVolume),
        }
      }))

      setMarkets(hydrated)
    } catch (e) {
      console.error('Failed to load markets', e)
      setMarkets([])
    } finally {
      setLoading(false)
    }
  }

  const calculatePrice = (yesReserves: number, noReserves: number) => {
    const total = yesReserves + noReserves
    return total > 0 ? (yesReserves / total) * 100 : 50
  }

  const formatTimeRemaining = (endTime: TimestampLike) => {
    const end = new Date(parseInt(endTime.toString()) * 1000)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const isResolved = (resolutionState: ResolutionState): resolutionState is ResolvedState => {
    return 'resolved' in resolutionState
  }

  const getOutcome = (resolutionState: ResolutionState) => {
    if (isResolved(resolutionState)) {
      return resolutionState.resolved.finalOutcome === 1 ? 'YES' : 'NO'
    }
    return 'Active'
  }

  const getStatusColor = (resolutionState: ResolutionState) => {
    if (isResolved(resolutionState)) {
      return 'bg-orange-500/15 text-orange-300'
    }
    if ('computing' in resolutionState) {
      return 'bg-yellow-500/15 text-yellow-300'
    }
    return 'bg-rose-500/15 text-rose-200'
  }

  return (
    <>
      <Head>
        <title>Markets - Private Prediction Markets</title>
        <meta name="description" content="Browse and trade on privacy-preserving prediction markets" />
      </Head>

      <AuroraBackground className="min-h-screen">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400 text-xl font-semibold text-white shadow-lg shadow-orange-500/30">
                  PM
                </Link>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">Arcium x Solana</p>
                  <h1 className="text-lg font-semibold text-white">Private Markets</h1>
                </div>
              </div>
              <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <Link href="/" className="transition hover:text-white">Home</Link>
                <Link href="/markets" className="text-white">Markets</Link>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
                <a href="#security" className="transition hover:text-white">
                  Security
                </a>
              </div>
              <div className="flex items-center gap-3">
                <NoSSR fallback={<div className="h-10 w-20 rounded-full bg-white/10 animate-pulse" />}>
                  <WalletButton className="!bg-white/10 !backdrop-blur-xl !px-4 !py-2 !text-sm !text-white hover:!bg-white/20" />
                </NoSSR>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <section className="relative overflow-hidden pb-12 pt-16 sm:pt-24">
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.4em] text-white/60"
                >
                  <BarChart3 className="h-4 w-4 text-orange-300" />
                  Live markets · MPC shielded
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.7 }}
                  className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
                >
                  Privacy-Preserving <span className="text-gradient">Prediction Markets</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.7 }}
                  className="max-w-2xl text-lg text-white/70"
                >
                  Trade on outcomes without revealing your positions. All order flow is encrypted through Arcium's secure multi-party computation.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                  className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {stats.map((stat) => (
                    <MagicCard key={stat.label}>
                      <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">{stat.label}</p>
                      <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-2 text-sm text-white/60">{stat.sublabel}</p>
                    </MagicCard>
                  ))}
                </motion.div>
              </div>
            </section>

            <section className="relative px-4 pb-24">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-3xl font-semibold text-white">Active markets</h2>
                    <p className="text-sm text-white/60">
                      Real-time markets powered by encrypted order flow and transparent settlement proofs.
                    </p>
                  </div>
                  {connected && (
                    <button
                      onClick={loadMarkets}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {loading ? 'Syncing…' : 'Refresh'}
                    </button>
                  )}
                </div>

                {connected ? (
                  markets.length === 0 && !loading ? (
                    <MagicCard className="mx-auto max-w-xl text-center">
                      <div className="text-5xl">📊</div>
                      <h3 className="mt-4 text-xl font-semibold text-white">No markets yet</h3>
                      <p className="mt-2 text-sm text-white/60">Be the first to create a privacy-preserving prediction market.</p>
                      <Link href="/">
                        <ShinyButton type="button" className="mt-6 inline-flex">
                          <Sparkles className="h-4 w-4" />
                          Create market
                        </ShinyButton>
                      </Link>
                    </MagicCard>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {markets.map((market) => (
                        <MagicCard key={market.publicKey}>
                          <div className="flex items-start justify-between">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(market.account.resolutionState)}`}
                            >
                              {getOutcome(market.account.resolutionState)}
                            </span>
                            <span className="text-xs text-white/50">{formatTimeRemaining(market.account.endTime)}</span>
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-white">{market.account.question}</h3>
                          <p className="mt-2 text-xs text-white/60">Fee {market.account.feeBps / 100}% · Authority {market.account.authority.slice(0, 4)}…</p>

                          <div className="mt-6 space-y-4">
                            <div>
                              <div className="flex items-center justify-between text-sm text-white/60">
                                <span>YES Price</span>
                                <span className="text-lg font-semibold text-orange-300">
                                  {calculatePrice(market.account.yesReserves, market.account.noReserves).toFixed(1)}¢
                                </span>
                              </div>
                              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300"
                                  style={{ width: `${calculatePrice(market.account.yesReserves, market.account.noReserves)}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-white/60">
                              <span>YES: {market.account.yesReserves.toLocaleString()}</span>
                              <span>NO: {market.account.noReserves.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-white/70">
                              <span>Total volume</span>
                              <span className="text-sm font-semibold text-white">
                                ${(market.account.totalVolume / 1_000_000).toFixed(1)}M
                              </span>
                            </div>
                          </div>

                          <ShinyButton type="button" className="mt-6 w-full justify-center">
                            Trade now
                            <ArrowRight className="h-4 w-4" />
                          </ShinyButton>
                        </MagicCard>
                      ))}
                    </div>
                  )
                ) : (
                  <MagicCard className="mx-auto max-w-3xl text-center">
                    <div className="flex flex-col items-center gap-4">
                      <ShieldCheck className="h-12 w-12 text-orange-200" />
                      <h3 className="text-2xl font-semibold text-white">Connect to reveal private order flow</h3>
                      <p className="max-w-2xl text-sm text-white/70">
                        Markets stay encrypted until you authenticate with your Solana wallet. Once connected, we decrypt a curated
                        list of active MPC pools tailored to your address.
                      </p>
                      <NoSSR fallback={<div className="h-12 w-32 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 animate-pulse" />}>
                      <WalletButton className="!bg-gradient-to-r !from-orange-500 !via-rose-500 !to-amber-400 !text-white !border-0 !px-6 !py-3" />
                    </NoSSR>
                    </div>
                  </MagicCard>
                )}
              </div>
            </section>
          </main>

          <footer className="border-t border-white/10 bg-black/40 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-white/60 sm:flex-row">
              <p>© {new Date().getFullYear()} Private Markets. Built for privacy.</p>
              <div className="flex items-center gap-4">
                <a href="https://github.com" className="transition hover:text-white">Docs</a>
                <a href="mailto:team@privatemarkets.xyz" className="transition hover:text-white">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </AuroraBackground>
    </>
  )
}
