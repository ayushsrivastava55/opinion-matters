"use client"

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, CalendarClock, Loader2 } from 'lucide-react'
import { BN } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { AuroraBackground } from '@/components/magicui/aurora-background'
import { MagicCard } from '@/components/magicui/magic-card'
import { ShinyButton } from '@/components/magicui/shiny-button'
import { NoSSR } from '@/components/no-ssr'
import { WalletButton } from '@/components/wallet-button'
import { HeaderStatus } from '@/components/header-status'
import { getAnchorProgram } from '@/lib/anchor-client'

export default function CreateMarketPage() {
  const router = useRouter()
  const { connection } = useConnection()
  const wallet = useWallet()
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [endTime, setEndTime] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const iso = d.toISOString().slice(0, 16)
    return iso
  })
  const [feeBps, setFeeBps] = useState(100)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [marketPk, setMarketPk] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      setError('Please enter a market question.')
      return
    }

    if (!wallet.publicKey) {
      setError('Connect your wallet to create a market.')
      return
    }

    const parsedEndTime = new Date(endTime)
    if (Number.isNaN(parsedEndTime.getTime())) {
      setError('End time must be a valid date.')
      return
    }

    setSubmitting(true)
    setError(null)
    setTxSig(null)
    setMarketPk(null)

    try {
      const program = await getAnchorProgram(connection, wallet as any)

      const authority = wallet.publicKey

      const [market] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), authority.toBuffer()],
        program.programId,
      )
      const [collateralVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), market.toBuffer()],
        program.programId,
      )
      const [feeVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('fee_vault'), market.toBuffer()],
        program.programId,
      )
      const [yesMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('yes_mint'), market.toBuffer()],
        program.programId,
      )
      const [noMint] = PublicKey.findProgramAddressSync(
        [Buffer.from('no_mint'), market.toBuffer()],
        program.programId,
      )

      const cleanFeeBps = Number.isFinite(feeBps)
        ? Math.max(0, Math.min(10_000, Math.floor(feeBps)))
        : 100

      const batchIntervalSec = 300
      const resolverQuorum = 3

      const endTimeSeconds = Math.floor(parsedEndTime.getTime() / 1000)

      const collateralMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

      const createdTxSig = await program.methods
        .createMarket(
          question.trim(),
          new BN(endTimeSeconds),
          cleanFeeBps,
          new BN(batchIntervalSec),
          resolverQuorum,
        )
        .accounts({
          market,
          collateralVault,
          feeVault,
          yesMint,
          noMint,
          collateralMint,
          authority,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc()

      const marketPublicKey = market.toBase58()
      setTxSig(createdTxSig)
      setMarketPk(marketPublicKey)

      try {
        const indexRes = await fetch('/api/markets/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketPublicKey,
            description: description.trim() || null,
            category: category.trim() || null,
          }),
        })

        if (!indexRes.ok) {
          console.warn('Failed to index market after creation', await indexRes.text())
        }
      } catch (indexError) {
        console.error('Indexing market failed', indexError)
      }
    } catch (err: any) {
      console.error('Create market failed', err)
      setError(err?.message || 'Failed to create market')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Create Market - Private Markets</title>
        <meta name="description" content="Launch a new private prediction market using Arcium MPC" />
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
                  <h1 className="text-lg font-semibold text-white">Create Market</h1>
                </div>
              </div>
              <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <Link href="/" className="transition hover:text-white">
                  Home
                </Link>
                <Link href="/markets" className="transition hover:text-white">
                  Markets
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <HeaderStatus />
                <NoSSR fallback={<div className="h-10 w-20 animate-pulse rounded-full bg-white/10" />}>
                  <WalletButton className="!bg-white/10 !backdrop-blur-xl !px-4 !py-2 !text-sm !text-white hover:!bg-white/20" />
                </NoSSR>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <section className="relative px-4 pb-24 pt-12">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex flex-col gap-3"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
                    <CalendarClock className="h-4 w-4 text-orange-300" />
                    Launch encrypted market
                  </div>
                  <h2 className="text-3xl font-semibold text-white">Define your private prediction market</h2>
                  <p className="text-sm text-white/70">
                    Configure the core parameters for a new binary market. Orders and positions will be protected end-to-end by
                    Arcium MPC while settlement remains fully verifiable on Solana.
                  </p>
                </motion.div>

                <MagicCard>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Question</label>
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={3}
                        placeholder="Will BTC be above $90k by EOY 2025?"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white">Description (optional)</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Additional context, data sources, or resolution criteria."
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Category (optional)</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="macro, crypto, governance…"
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">End time</label>
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white">Protocol fee (bps)</label>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={feeBps}
                          onChange={(e) => setFeeBps(Number(e.target.value) || 0)}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                        />
                        <p className="text-xs text-white/50">1% = 100 bps. Fee is taken on volume and routed per protocol rules.</p>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {error}
                      </div>
                    )}

                    {txSig && marketPk && (
                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        <p className="mb-1 font-medium">Market created successfully.</p>
                        <p className="mb-1 break-all text-[11px]">Market: {marketPk}</p>
                        <a
                          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-emerald-100"
                        >
                          View transaction on Solana Explorer
                        </a>
                        <button
                          type="button"
                          onClick={() => router.push('/markets')}
                          className="ml-2 inline-flex items-center gap-1 text-[11px] underline hover:text-emerald-100"
                        >
                          Go to markets
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <Link
                        href="/markets"
                        className="text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
                      >
                        Back to markets
                      </Link>

                      <ShinyButton type="submit" className="inline-flex items-center gap-2 px-6" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating market…
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-4 w-4" />
                            Launch market
                          </>
                        )}
                      </ShinyButton>
                    </div>
                  </form>
                </MagicCard>
              </div>
            </section>
          </main>
        </div>
      </AuroraBackground>
    </>
  )
}
