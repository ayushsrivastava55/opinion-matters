"use client"

import { useWallet } from '@solana/wallet-adapter-react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock4,
  LockKeyhole,
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
      'Bonding curves update in milliseconds with aggregated order flow, delivering instant feedback to traders.',
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
                <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-400 text-xl font-semibold text-white shadow-lg shadow-orange-500/30">
                  PM
                </Link>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">Arcium x Solana</p>
                  <h1 className="text-lg font-semibold text-white">Private Markets</h1>
                </div>
              </div>
              <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <Link href="/" className="text-white">Home</Link>
                <Link href="/markets" className="transition hover:text-white">Markets</Link>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
                <a href="#security" className="transition hover:text-white">
                  Security
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/markets">
                  <ShinyButton type="button" className="hidden md:inline-flex">
                    <BarChart3 className="h-4 w-4" />
                    Explore markets
                  </ShinyButton>
                </Link>
                <NoSSR fallback={<div className="h-10 w-20 rounded-full bg-white/10 animate-pulse" />}>
                  <WalletButton className="!bg-white/10 !backdrop-blur-xl !px-4 !py-2 !text-sm !text-white hover:!bg-white/20" />
                </NoSSR>
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
                  <Timer className="h-4 w-4 text-orange-300" />
                  Live on Devnet · MPC shielded
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.7 }}
                  className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
                >
                  Prediction markets with <span className="text-gradient">military-grade privacy</span> and Solana speed
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
                  <Link href="/markets">
                    <ShinyButton type="button">
                      Explore markets
                      <ArrowRight className="h-4 w-4" />
                    </ShinyButton>
                  </Link>
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
                    <feature.icon className="h-10 w-10 rounded-lg bg-white/10 p-2 text-orange-200" />
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
                    Our intuitive interface makes onboarding simple while the Arcium network protects intent.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {flowSteps.map((step, index) => (
                    <MagicCard key={step.title}>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-semibold text-white/80">
                        {index + 1}
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <step.icon className="h-6 w-6 text-orange-200" />
                        <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      </div>
                      <p className="mt-3 text-sm text-white/70">{step.description}</p>
                    </MagicCard>
                  ))}
                </div>
              </div>
            </section>

            
            <section className="relative px-4 pb-24">
              <MagicCard className="mx-auto w-full max-w-5xl overflow-hidden">
                <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                  <div>
                    <h3 className="text-3xl font-semibold text-white">Design-first governance and liquidity</h3>
                    <p className="mt-4 text-sm text-white/70">
                      We obsess over gradients, micro-interactions and the flow between wallet and
                      market. Every card and modal is tuned for clarity so your community focuses on conviction, not UI friction.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-white/70">
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-orange-300" />
                        Progressive disclosure of market depth and fees.
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-orange-300" />
                        Animated intent hand-offs so traders feel the book react live.
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-orange-300" />
                        Accessibility-first contrast and typography for long sessions.
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/20 via-rose-500/20 to-amber-400/20 p-6">
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center justify-between text-white/70">
                        <span>Session encryption</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-orange-300">
                          <ShieldCheck className="h-4 w-4" /> MPC active
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/70">
                        <span>Next attestation window</span>
                        <span className="inline-flex items-center gap-2 text-white">
                          <Clock4 className="h-4 w-4 text-orange-200" /> 3m 22s
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-white/70">
                        <span>Wallet connected</span>
                        <span className="text-white">{connected && publicKey ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}` : 'Awaiting signature'}</span>
                      </div>
                    </div>
                    <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
                      <p>
                        We continuously stream responsive motion cues so participants always know where liquidity is flowing
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
