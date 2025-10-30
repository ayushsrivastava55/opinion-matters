'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import Head from 'next/head'

interface Market {
  publicKey: string
  account: {
    authority: string
    question: string
    endTime: { toString: () => string }
    feeBps: number
    resolutionState: { active: {} } | { awaitingAttestation: {} } | { computing: {} } | { resolved: { finalOutcome: number } }
    yesReserves: number
    noReserves: number
    totalVolume: number
  }
}

export default function Home() {
  const { connected, publicKey } = useWallet()
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const connection = new Connection(clusterApiUrl('devnet'))

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
          publicKey: 'G2jEumrainCsS2T1y6aMRgPoXw7LRygC8npNUVk8bzro',
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

  const formatTimeRemaining = (endTime: { toString: () => string }) => {
    const end = new Date(parseInt(endTime.toString()) * 1000)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const isResolved = (resolutionState: any) => {
    return 'resolved' in resolutionState
  }

  const getOutcome = (resolutionState: any) => {
    return isResolved(resolutionState) ? (resolutionState.resolved.finalOutcome === 1 ? 'YES' : 'NO') : 'Active'
  }

  return (
    <>
      <Head>
        <title>Private Prediction Markets - Arcium MPC</title>
        <meta name="description" content="Privacy-preserving prediction markets on Solana with Arcium MPC" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Private Markets</h1>
                  <p className="text-xs text-purple-200">Powered by Arcium MPC</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {connected && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Create Market
                  </button>
                )}
                <WalletMultiButton className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20" />
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        {!connected && (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <h2 className="text-5xl font-bold text-white mb-6">
              Privacy-Preserving Prediction Markets
            </h2>
            <p className="text-xl text-purple-200 mb-8">
              Trade on outcomes without revealing your positions. Powered by Arcium's secure multi-party computation.
            </p>
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">100%</div>
                <div className="text-sm text-purple-200">Private</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-300">MPC</div>
                <div className="text-sm text-blue-200">Secure</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300">Solana</div>
                <div className="text-sm text-green-200">Fast</div>
              </div>
            </div>
            <div className="mt-12">
              <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !text-white !border-0 !px-8 !py-3 !text-lg" />
            </div>
          </div>
        )}

        {/* Markets Section */}
        {connected && (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Active Markets</h2>
              <button
                onClick={loadMarkets}
                disabled={loading}
                className="text-white/70 hover:text-white transition-colors"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {markets.length === 0 && !loading ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Markets Yet</h3>
                <p className="text-purple-200 mb-6">Be the first to create a prediction market!</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Create First Market
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {markets.map((market, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isResolved(market.account.resolutionState) 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {getOutcome(market.account.resolutionState)}
                      </span>
                      <span className="text-xs text-purple-200">
                        {formatTimeRemaining(market.account.endTime)}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-3 overflow-hidden">
                      {market.account.question}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-200">YES Price</span>
                        <span className="text-lg font-bold text-green-400">
                          {calculatePrice(market.account.yesReserves, market.account.noReserves).toFixed(1)}¢
                        </span>
                      </div>
                      
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
                          style={{ width: `${calculatePrice(market.account.yesReserves, market.account.noReserves)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-purple-200">
                        <span>YES: {market.account.yesReserves.toLocaleString()}</span>
                        <span>NO: {market.account.noReserves.toLocaleString()}</span>
                      </div>
                      
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-purple-200">Volume</span>
                          <span className="text-sm text-white">
                            ${(market.account.totalVolume / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium transition-all">
                      Trade Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Market Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-md w-full border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-6">Create Prediction Market</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Question
                  </label>
                  <input
                    type="text"
                    placeholder="Will SOL reach $200 by end of 2024?"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      End Time (days)
                    </label>
                    <input
                      type="number"
                      placeholder="7"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">
                      Fee (%)
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement market creation
                    alert('Market creation would be implemented with program calls')
                    setShowCreateModal(false)
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all"
                >
                  Create Market
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
