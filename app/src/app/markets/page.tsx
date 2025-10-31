"use client"

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import Head from 'next/head'
import Link from 'next/link'
import {
  type PropsWithChildren,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

import { AuroraBackground } from '@/components/magicui/aurora-background'
import { MagicCard } from '@/components/magicui/magic-card'
import { ShinyButton } from '@/components/magicui/shiny-button'
import { NoSSR } from '@/components/no-ssr'
import { WalletButton } from '@/components/wallet-button'
import type { MarketRecord, MarketResolutionState } from '@/lib/market-types'
import { getAnchorProgram } from '@/lib/anchor-client'
import { Buffer } from 'buffer'
import { BN } from '@coral-xyz/anchor'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
} from '@solana/spl-token'
import { PublicKey, Transaction } from '@solana/web3.js'

const formatAbbrevCurrency = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

const getStatusChipStyles = (state: MarketResolutionState) => {
  switch (state) {
    case 'resolved_yes':
    case 'resolved_no':
      return 'bg-orange-500/15 text-orange-300'
    case 'computing':
      return 'bg-yellow-500/15 text-yellow-300'
    case 'awaiting_attestation':
      return 'bg-purple-500/15 text-purple-200'
    default:
      return 'bg-rose-500/15 text-rose-200'
  }
}

const getOutcomeLabel = (state: MarketResolutionState) => {
  switch (state) {
    case 'resolved_yes':
      return 'Resolved · YES'
    case 'resolved_no':
      return 'Resolved · NO'
    case 'computing':
      return 'Computing'
    case 'awaiting_attestation':
      return 'Awaiting attestation'
    default:
      return 'Active'
  }
}

const formatTimeRemaining = (endTimeIso: string) => {
  const end = new Date(endTimeIso)
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (Number.isNaN(diff) || diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

const calculateYesPrice = (yesReserves: number, noReserves: number) => {
  const total = yesReserves + noReserves
  if (total === 0) return 50
  return (yesReserves / total) * 100
}

type MarketCardProps = {
  market: MarketRecord
  isConnected: boolean
  onTrade: (market: MarketRecord) => void
}

const MarketCard = memo(function MarketCard({ market, isConnected, onTrade }: MarketCardProps) {
  const yesPrice = useMemo(
    () => calculateYesPrice(market.yesReserves, market.noReserves),
    [market.noReserves, market.yesReserves],
  )

  return (
    <MagicCard>
      <div className="flex items-start justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusChipStyles(market.resolutionState)}`}>
          {getOutcomeLabel(market.resolutionState)}
        </span>
        <span className="text-xs text-white/50">{formatTimeRemaining(market.endTime)}</span>
      </div>
      <h3 className="mt-4 line-clamp-3 text-lg font-semibold text-white">{market.question}</h3>
      <p className="mt-2 text-xs text-white/60">
        Fee {(market.feeBps / 100).toFixed(2)}% · Authority {market.authority.slice(0, 4)}…{market.authority.slice(-4)}
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>YES Price</span>
            <span className="text-lg font-semibold text-orange-300">{yesPrice.toFixed(1)}¢</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300"
              style={{ width: `${yesPrice}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
          <span>YES: {market.yesReserves.toLocaleString()}</span>
          <span>NO: {market.noReserves.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-white/70">
          <span>Total volume</span>
          <span className="text-sm font-semibold text-white">{formatAbbrevCurrency(market.totalVolume)}</span>
        </div>
      </div>

      {isConnected ? (
        <ShinyButton
          type="button"
          className="mt-6 w-full justify-center"
          onClick={() => onTrade(market)}
        >
          Trade now
          <ArrowRight className="h-4 w-4" />
        </ShinyButton>
      ) : (
        <div className="mt-6">
          <NoSSR fallback={<div className="h-12 w-full rounded-full bg-white/10" />}>
            <WalletButton className="!w-full !justify-center !bg-white/10 !px-4 !py-3 !text-sm !text-white hover:!bg-white/20" />
          </NoSSR>
        </div>
      )}
    </MagicCard>
  )
})

const StatGrid = ({ children }: PropsWithChildren) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3, duration: 0.7 }}
    className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3"
  >
    {children}
  </motion.div>
)

export default function MarketsPage() {
  const { connected } = useWallet()
  const { connection } = useConnection()
  const wallet = useWallet()
  const [markets, setMarkets] = useState<MarketRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [tradingMarket, setTradingMarket] = useState<MarketRecord | null>(null)
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [tradeSide, setTradeSide] = useState<'YES' | 'NO'>('YES')
  const [tradeAmount, setTradeAmount] = useState<number>(10)
  const deferredMarkets = useDeferredValue(markets)
  const [isPending, startTransition] = useTransition()

  const loadMarkets = useCallback(
    async (signal?: AbortSignal) => {
      if (signal?.aborted) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/markets', {
          method: 'GET',
          cache: 'no-store',
          signal,
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = (await response.json()) as { markets: MarketRecord[] }

        if (signal?.aborted) return

        startTransition(() => {
          setMarkets(payload.markets)
          setLastUpdatedAt(new Date())
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Failed to load markets from API', err)
        setError('Unable to sync markets from Neon. Try refreshing in a moment.')
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [startTransition],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadMarkets(controller.signal)
    return () => controller.abort()
  }, [loadMarkets])

  const handleRefresh = useCallback(() => {
    loadMarkets()
  }, [loadMarkets])

  const handleTrade = useCallback((market: MarketRecord) => {
    setTradingMarket(market)
  }, [])

  const submitTrade = useCallback(async () => {
    if (!tradingMarket || !wallet.publicKey) return
    setTradeBusy(true)
    setTradeError(null)
    try {
      const program = await getAnchorProgram(connection, wallet as any)
      // Preflight: ensure market exists on-chain to avoid wallet sim reverts
      const marketPk = new PublicKey(tradingMarket.marketPublicKey)
      try {
        await (program.account as any).market.fetch(marketPk)
      } catch (_) {
        throw new Error('This market is not deployed on-chain. Please refresh or pick another market.')
      }
      const order = { side: tradeSide, amount: tradeAmount, slippage: 0.01 }
      const encoder = new TextEncoder()
      const payload = encoder.encode(JSON.stringify(order))

      await program.methods
        .submitPrivateTrade(Buffer.from(payload))
        .accounts({
          market: marketPk,
          user: wallet.publicKey,
        })
        .rpc()

      setTradingMarket(null)
      // Refresh list after submit
      loadMarkets()
    } catch (e: any) {
      console.error('Trade failed', e)
      const logs = e?.transactionLogs ? `\nLogs: ${e.transactionLogs.join('\n')}` : ''
      setTradeError((e?.message || 'Failed to submit trade') + logs)
    } finally {
      setTradeBusy(false)
    }
  }, [connection, loadMarkets, tradeAmount, tradeSide, tradingMarket, wallet])

  const ensureAta = useCallback(
    async (mint: PublicKey): Promise<PublicKey> => {
      if (!wallet.publicKey) throw new Error('Wallet not connected')
      const ata = await getAssociatedTokenAddress(mint, wallet.publicKey)
      const info = await connection.getAccountInfo(ata)
      if (info) return ata

      const ix = createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        mint,
      )
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized')
      const tx = new Transaction({ feePayer: wallet.publicKey, recentBlockhash: blockhash })
      tx.add(ix)
      const signed = await wallet.signTransaction!(tx)
      const sig = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
      return ata
    },
    [connection, wallet],
  )

  const depositCollateral = useCallback(async () => {
    if (!tradingMarket || !wallet.publicKey) return
    setTradeBusy(true)
    setTradeError(null)
    try {
      const program = await getAnchorProgram(connection, wallet as any)
      const marketPk = new PublicKey(tradingMarket.marketPublicKey)
      const marketAccount: any = await (program.account as any).market.fetch(marketPk)
      const collateralVault = marketAccount.collateralVault as PublicKey

      // Fetch vault token account to learn the collateral mint
      const vaultInfo = await connection.getParsedAccountInfo(collateralVault)
      const parsed = (vaultInfo.value?.data as any)?.parsed
      const mintStr: string | undefined = parsed?.info?.mint
      if (!mintStr) throw new Error('Unable to resolve collateral mint')
      const mintPk = new PublicKey(mintStr)

      // Ensure user ATA exists
      const userAta = await ensureAta(mintPk)

      // Scale amount by mint decimals
      const mint = await getMint(connection, mintPk)
      const decimals = mint.decimals ?? 6
      const scaled = new BN(Math.floor(Number(tradeAmount) * 10 ** decimals))

      await program.methods
        .depositCollateral(scaled)
        .accounts({
          market: marketPk,
          collateralVault: collateralVault,
          userCollateral: userAta,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

      // No modal close; allow immediate trade if desired
    } catch (e: any) {
      console.error('Deposit failed', e)
      setTradeError(e?.message || 'Failed to deposit collateral')
    } finally {
      setTradeBusy(false)
    }
  }, [connection, ensureAta, tradeAmount, tradingMarket, wallet])

  const stats = useMemo(() => {
    const totalMarkets = deferredMarkets.length
    const totalVolume = deferredMarkets.reduce((acc, market) => acc + market.totalVolume, 0)

    return [
      { label: 'Total markets', value: String(totalMarkets), sublabel: 'Active predictions' },
      { label: 'Total volume', value: formatAbbrevCurrency(totalVolume), sublabel: 'Across all markets' },
      { label: '24h volume', value: '—', sublabel: 'Coming soon' },
    ]
  }, [deferredMarkets])

  const busy = loading || isPending
  const showSkeleton = busy && markets.length === 0

  const relativeUpdate = useMemo(() => {
    if (!lastUpdatedAt) return null
    const diffMs = Date.now() - lastUpdatedAt.getTime()
    if (diffMs < 1000) return 'just now'
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'less than a minute ago'
    if (diffMinutes === 1) return '1 minute ago'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours === 1) return '1 hour ago'
    return `${diffHours} hours ago`
  }, [lastUpdatedAt])

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
                <Link
                  href="/"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400 text-xl font-semibold text-white shadow-lg shadow-orange-500/30"
                >
                  PM
                </Link>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">Arcium x Solana</p>
                  <h1 className="text-lg font-semibold text-white">Private Markets</h1>
                </div>
              </div>
              <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
                <Link href="/markets" className="text-white">
                  Markets
                </Link>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
                <a href="#security" className="transition hover:text-white">
                  Security
                </a>
              </div>
              <div className="flex items-center gap-3">
                <NoSSR fallback={<div className="h-10 w-20 animate-pulse rounded-full bg-white/10" />}>
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
                  Live markets · Neon synced
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
                  Trade on outcomes without revealing your positions. Markets update in real time and stay encrypted until
                  settlement on Solana.
                </motion.p>

                <StatGrid>
                  {stats.map((stat) => (
                    <MagicCard key={stat.label}>
                      <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">{stat.label}</p>
                      <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-2 text-sm text-white/60">{stat.sublabel}</p>
                    </MagicCard>
                  ))}
                </StatGrid>
              </div>
            </section>

            <section className="relative px-4 pb-24">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-3xl font-semibold text-white">Active markets</h2>
                    <p className="text-sm text-white/60">
                      Real-time markets mirrored from Neon and settled on Solana.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50">
                    {relativeUpdate && <span>Last synced {relativeUpdate}</span>}
                    <button
                      onClick={handleRefresh}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin text-white' : ''}`} />
                      {busy ? 'Syncing…' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {error && (
                  <MagicCard className="border border-red-500/40 bg-red-500/10 text-left text-red-200">
                    <p className="text-sm font-semibold">{error}</p>
                    <p className="mt-1 text-xs text-red-200/80">
                      Ensure your DATABASE_URL environment variable points to a Neon instance with the markets table seeded.
                    </p>
                  </MagicCard>
                )}

                {showSkeleton ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, idx) => (
                      <MagicCard key={`skeleton-${idx}`} className="space-y-4">
                        <div className="h-4 w-32 rounded-full bg-white/10" />
                        <div className="h-6 w-full rounded-lg bg-white/10" />
                        <div className="h-6 w-3/4 rounded-lg bg-white/10" />
                        <div className="h-32 w-full rounded-lg bg-white/10" />
                        <div className="h-10 w-full rounded-full bg-white/10" />
                      </MagicCard>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {deferredMarkets.map((market) => (
                      <MarketCard key={market.id} market={market} isConnected={connected} onTrade={handleTrade} />
                    ))}
                  </div>
                )}

                {!busy && deferredMarkets.length === 0 && !error && (
                  <MagicCard className="mx-auto max-w-xl text-center">
                    <div className="text-5xl">📊</div>
                    <h3 className="mt-4 text-xl font-semibold text-white">No markets live right now</h3>
                    <p className="mt-2 text-sm text-white/60">
                      Run <code className="rounded bg-white/10 px-2 py-1">npm run seed:markets</code> to ingest on-chain markets into your Neon
                      database.
                    </p>
                    <Link href="/">
                      <ShinyButton type="button" className="mt-6 inline-flex">
                        <Sparkles className="h-4 w-4" />
                        Launch a market
                      </ShinyButton>
                    </Link>
                  </MagicCard>
                )}

                {!connected && deferredMarkets.length > 0 && (
                  <MagicCard className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
                    <ShieldCheck className="h-12 w-12 text-orange-200" />
                    <h3 className="text-2xl font-semibold text-white">Connect to trade privately</h3>
                    <p className="max-w-2xl text-sm text-white/70">
                      Markets are loaded straight from Neon but trading requires a Solana wallet connection so we can encrypt your
                      order flow with Arcium MPC.
                    </p>
                    <NoSSR fallback={<div className="h-12 w-32 animate-pulse rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400" />}>
                      <WalletButton className="!bg-gradient-to-r !from-orange-500 !via-rose-500 !to-amber-400 !text-white !border-0 !px-6 !py-3" />
                    </NoSSR>
                  </MagicCard>
                )}
              </div>
            </section>
          </main>

          <footer className="border-t border-white/10 bg-black/40 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-white/60 sm:flex-row">
              <p>© {new Date().getFullYear()} Private Markets. Built for privacy.</p>
              <div className="flex items-center gap-4">
                <a href="https://github.com" className="transition hover:text-white">
                  Docs
                </a>
                <a href="mailto:team@privatemarkets.xyz" className="transition hover:text-white">
                  Contact
                </a>
              </div>
            </div>
          </footer>
        </div>
      </AuroraBackground>
      {tradingMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Private order</p>
                <h3 className="mt-1 text-lg font-semibold text-white line-clamp-2">{tradingMarket.question}</h3>
              </div>
              <button
                onClick={() => setTradingMarket(null)}
                className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeSide('YES')}
                  className={`rounded-xl px-4 py-2 text-sm ${tradeSide === 'YES' ? 'bg-orange-500/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
                >
                  YES
                </button>
                <button
                  onClick={() => setTradeSide('NO')}
                  className={`rounded-xl px-4 py-2 text-sm ${tradeSide === 'NO' ? 'bg-orange-500/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}
                >
                  NO
                </button>
              </div>
              <div>
                <label className="block text-xs text-white/60">Amount</label>
                <input
                  type="number"
                  min={1}
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>
              {tradeError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
                  {tradeError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={depositCollateral}
                  disabled={tradeBusy}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {tradeBusy ? 'Processing…' : 'Deposit'}
                </button>
                <button
                  onClick={submitTrade}
                  disabled={tradeBusy}
                  className="rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {tradeBusy ? 'Submitting…' : 'Submit trade'}
                </button>
              </div>
              <p className="text-xs text-white/50">
                Orders are encrypted client‑side and processed by Arcium. The on‑chain program stores a state commitment and
                public aggregates.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
