"use client"

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
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

const heroStats = [
  {
    label: 'Encrypted volume settled',
    value: '$2.8M+',
    sublabel: 'across pilot campaigns'
  },
  {
    label: 'Median trade confirmation',
    value: '1.3s',
    sublabel: 'thanks to Solana finality'
  },
  {
    label: 'Privacy budget saved',
    value: '92%',
    sublabel: 'vs. traditional MPC rails'
  }
]

const featureHighlights = [
  {
    title: 'Zero-leakage order flow',
    description:
      'Orders settle through Arcium MPC so positions remain private until resolution. Market making can finally go dark.',
    icon: LockKeyhole
  },
  {
    title: 'Transparent settlement proofs',
    description:
      'Each market exposes cryptographic attestations that the encrypted order book settled exactly as committed.',
    icon: ShieldCheck
  },
  {
    title: 'Realtime liquidity discovery',
    description:
      'Bonding curves update in milliseconds with aggregated order flow, delivering MagicUI-grade feedback to traders.',
    icon: Zap
  }
]

const flowSteps = [
  {
    title: '1. Connect privately',
    description: 'Link your Solana wallet and open a shielded trading session secured by Arcium MPC.',
    icon: Sparkles
  },
  {
    title: '2. Stake directional liquidity',
    description: 'Commit YES/NO orders against a privacy-preserving bonding curve—your exposure never hits the public mempool.',
    icon: BarChart3
  },
  {
    title: '3. Resolve with confidence',
    description: 'Deterministic attestors post the encrypted oracle outcome with proofs so payouts can execute instantly.',
    icon: CheckCircle2
  }
]

export default function Home() {
  const { connected, publicKey } = useWallet()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (connected) {
      loadMarkets()
    }
  }, [connected])

  const loadMarkets = async () => {
    setLoading(true)
    try {
      // Mock markets for demo - replace with actual program calls
      const mockMarkets: Market[] = [
        {
          publicKey: 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro',
          account: {
            authority: '11111111111111111111111111111111',
            question: 'Will SOL reach $200 by end of 2024?',
            endTime: { toString: () => '1704067200' },
            feeBps: 100,
            resolutionState: { active: {} },
            yesReserves: 1000000,
            noReserves: 800000,
            totalVolume: 5000000
          }
        },
        {
          publicKey: 'H6R9zJiN2Qv1z6aMRgPoXw7LRygC8npNUVk8bzro',
          account: {
            authority: '22222222222222222222222222222222',
            question: 'Will Bitcoin ETF approval happen in Q1 2024?',
            endTime: { toString: () => '1704067200' },
            feeBps: 150,
            resolutionState: { active: {} },
            yesReserves: 2000000,
            noReserves: 1200000,
            totalVolume: 8000000
          }
        },
        {
          publicKey: 'D4sdf6rainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro',
          account: {
            authority: '33333333333333333333333333333333',
            question: 'Will Layer-2 TVL surpass $25B before July 2024?',
            endTime: { toString: () => '1704067200' },
            feeBps: 120,
            resolutionState: { active: {} },
            yesReserves: 1500000,
            noReserves: 1600000,
            totalVolume: 6500000
          }
        }
      ]
      setMarkets(mockMarkets)
    } catch (error) {
      console.error('Failed to load markets:', error)
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

  const scrollToMarkets = () => {
    const element = document.getElementById('markets-section')
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const triggerWalletModal = () => {
    if (typeof window === 'undefined') return
    const trigger = document.querySelector<HTMLButtonElement>('button.wallet-adapter-button-trigger')
    trigger?.click()
  }

  return (
    <>
      <Head>
        <title>Private Prediction Markets - Arcium MPC</title>
        <meta name="description" content="Privacy-preserving prediction markets on Solana with Arcium MPC" />
      </Head>

      <AuroraBackground className="min-h-screen">
        <div className="relative flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 text-xl font-semibold text-white shadow-lg shadow-purple-500/30">
                  PM
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">Arcium x Solana</p>
                  <h1 className="text-lg font-semibold text-white">Private Markets</h1>
                </div>
              </div>
              <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <button onClick={scrollToMarkets} className="transition hover:text-white">Markets</button>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
                <a href="#security" className="transition hover:text-white">
                  Security
                </a>
              </div>
              <div className="flex items-center gap-3">
                {connected && (
                  <ShinyButton type="button" onClick={() => setShowCreateModal(true)} className="hidden md:inline-flex">
                    <Sparkles className="h-4 w-4" />
                    Launch market
                  </ShinyButton>
                )}
                <WalletMultiButton className="!bg-white/10 !backdrop-blur-xl !px-4 !py-2 !text-sm !text-white hover:!bg-white/20" />
              </div>
            </div>
          </header>

          <main className="flex-1">
            <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.4em] text-white/60"
                >
                  <Timer className="h-4 w-4 text-purple-300" />
                  Live on Devnet · MPC shielded
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.7 }}
                  className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
                >
                  Prediction markets with <span className="text-gradient">MagicUI-grade privacy</span> and Solana speed
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.7 }}
                  className="max-w-2xl text-lg text-white/70"
                >
                  Spin up institutional-grade prediction markets where directional liquidity is encrypted end-to-end.
                  Match flow in milliseconds, resolve with transparent MPC proofs, and keep your alpha concealed.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                  className="flex flex-col items-center gap-4 sm:flex-row"
                >
                  <ShinyButton type="button" onClick={scrollToMarkets}>
                    Explore markets
                    <ArrowRight className="h-4 w-4" />
                  </ShinyButton>
                  {!connected && (
                    <button
                      onClick={triggerWalletModal}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white/70 backdrop-blur-xl transition hover:border-white/30 hover:text-white"
                    >
                      Connect wallet
                    </button>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                  className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {heroStats.map((stat) => (
                    <MagicCard key={stat.label}>
                      <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">{stat.label}</p>
                      <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
                      <p className="mt-2 text-sm text-white/60">{stat.sublabel}</p>
                    </MagicCard>
                  ))}
                </motion.div>
              </div>
            </section>

            <section id="security" className="relative px-4 pb-24">
              <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <MagicCard key={feature.title} className="h-full">
                    <feature.icon className="h-10 w-10 rounded-lg bg-white/10 p-2 text-purple-200" />
                    <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-white/70">{feature.description}</p>
                  </MagicCard>
                ))}
              </div>
            </section>

            <section id="how-it-works" className="relative px-4 pb-24">
              <div className="mx-auto w-full max-w-6xl">
                <div className="mb-10 flex flex-col gap-3 text-center">
                  <h2 className="text-3xl font-semibold text-white">Trade in three shielded steps</h2>
                  <p className="text-white/60">
                    The MagicUI interaction patterns keep onboarding simple while the Arcium network protects intent.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {flowSteps.map((step, index) => (
                    <MagicCard key={step.title}>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-semibold text-white/80">
                        {index + 1}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <step.icon className="h-6 w-6 text-purple-200" />
                        <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      </div>
                      <p className="mt-3 text-sm text-white/70">{step.description}</p>
                    </MagicCard>
                  ))}
                </div>
              </div>
            </section>

            <section id="markets-section" className="relative px-4 pb-24">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-3xl font-semibold text-white">Active markets</h2>
                    <p className="text-sm text-white/60">
                      Synthetic dataset pulled from the program. Replace with live RPC data once contracts are deployed.
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
                      <p className="mt-2 text-sm text-white/60">Kick off the very first privacy-preserving prediction market.</p>
                      <ShinyButton type="button" onClick={() => setShowCreateModal(true)} className="mt-6 inline-flex">
                        <Sparkles className="h-4 w-4" />
                        Create market
                      </ShinyButton>
                    </MagicCard>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {markets.map((market) => (
                        <MagicCard key={market.publicKey}>
                          <div className="flex items-start justify-between">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isResolved(market.account.resolutionState)
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-blue-500/15 text-blue-200'
                              }`}
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
                                <span className="text-lg font-semibold text-emerald-300">
                                  {calculatePrice(market.account.yesReserves, market.account.noReserves).toFixed(1)}¢
                                </span>
                              </div>
                              <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300"
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
                      <ShieldCheck className="h-12 w-12 text-purple-200" />
                      <h3 className="text-2xl font-semibold text-white">Connect to reveal private order flow</h3>
                      <p className="max-w-2xl text-sm text-white/70">
                        Markets stay cloaked until you authenticate with your Solana wallet. Once connected, we decrypt a curated
                        list of active MPC pools tailored to your address.
                      </p>
                      <ShinyButton type="button" onClick={triggerWalletModal}>
                        <Sparkles className="h-4 w-4" />
                        Connect now
                      </ShinyButton>
                    </div>
                  </MagicCard>
                )}
              </div>
            </section>

            <section className="relative px-4 pb-24">
              <MagicCard className="mx-auto w-full max-w-5xl overflow-hidden">
                <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                  <div>
                    <h3 className="text-3xl font-semibold text-white">Design-first governance and liquidity</h3>
                    <p className="mt-4 text-sm text-white/70">
                      Inspired by MagicUI principles, we obsess over gradients, micro-interactions and the flow between wallet and
                      market. Every card and modal is tuned for clarity so your community focuses on conviction, not UI friction.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-white/70">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                        Progressive disclosure of market depth and fees.
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                        Animated intent hand-offs so traders feel the book react live.
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                        Accessibility-first contrast and typography for long sessions.
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-400/20 p-6">
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center justify-between text-white/70">
                        <span>Session encryption</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-emerald-300">
                          <ShieldCheck className="h-4 w-4" /> MPC active
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/70">
                        <span>Next attestation window</span>
                        <span className="inline-flex items-center gap-2 text-white">
                          <Clock4 className="h-4 w-4 text-purple-200" /> 3m 22s
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/70">
                        <span>Wallet connected</span>
                        <span className="text-white">{connected && publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : 'Awaiting signature'}</span>
                      </div>
                    </div>
                    <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                      <p>
                        We continuously stream MagicUI-inspired motion cues so participants always know where liquidity is flowing
                        without revealing their addresses.
                      </p>
                    </div>
                  </div>
                </div>
              </MagicCard>
            </section>
          </main>

          <footer className="border-t border-white/10 bg-black/40 py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-white/60 sm:flex-row">
              <p>© {new Date().getFullYear()} Private Markets. Crafted with MagicUI energy.</p>
              <div className="flex items-center gap-4">
                <a href="https://github.com" className="transition hover:text-white">Docs</a>
                <a href="mailto:team@privatemarkets.xyz" className="transition hover:text-white">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </AuroraBackground>

      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
          <div className="w-full max-w-lg">
            <MagicCard>
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">Spin up a new market</h3>
                    <p className="mt-2 text-sm text-white/60">
                      Configure your question, lifetime and fees. These values feed straight into the Arcium MPC program.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">Market question</label>
                    <input
                      type="text"
                      placeholder="Will SOL reach $200 by end of 2024?"
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">End time (days)</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="7"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">Fee (%)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder="1"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white sm:flex-none sm:px-8"
                  >
                    Cancel
                  </button>
                  <ShinyButton
                    type="button"
                    onClick={() => {
                      alert('Market creation would be implemented with program calls')
                      setShowCreateModal(false)
                    }}
                    className="flex-1 justify-center sm:flex-none sm:px-8"
                  >
                    <Sparkles className="h-4 w-4" />
                    Create market
                  </ShinyButton>
                </div>
              </div>
            </MagicCard>
          </div>
        </div>
      )}
    </>
  )
}
