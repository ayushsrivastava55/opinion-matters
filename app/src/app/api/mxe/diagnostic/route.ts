/**
 * MXE Diagnostic API Endpoint
 * GET /api/mxe/diagnostic
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { diagnoseMXE, printDiagnostic, quickHealthCheck } from '@/lib/mxe-diagnostic';

// Use the same connection as your other API routes
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  {
    confirmTransactionInitialTimeout: 60000,
    commitment: 'confirmed',
  }
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Running MXE Diagnostic...');
    
    // Get diagnostic results
    const diagnostic = await diagnoseMXE(connection);
    
    // Log to console for debugging
    printDiagnostic(diagnostic);
    
    // Return JSON response
    return NextResponse.json({
      success: true,
      timestamp: diagnostic.timestamp,
      overall: diagnostic.overall,
      mxeAccount: diagnostic.mxeAccount,
      cluster: diagnostic.cluster,
      computationDefinitions: diagnostic.computationDefinitions,
      mempool: diagnostic.mempool,
      quickStatus: await quickHealthCheck(connection)
    });
    
  } catch (error) {
    console.error('❌ MXE Diagnostic failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Quick health check endpoint
 * GET /api/mxe/health
 */
export async function healthCheck() {
  try {
    const status = await quickHealthCheck(connection);
    
    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
