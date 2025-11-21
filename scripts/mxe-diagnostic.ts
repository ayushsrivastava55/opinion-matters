/**
 * MXE Diagnostic Test Script
 * Run with: tsx scripts/mxe-diagnostic.ts
 */

import { Connection } from '@solana/web3.js';
import { diagnoseMXE, printDiagnostic, quickHealthCheck } from '../app/src/lib/mxe-diagnostic';

async function runDiagnostic() {
  console.log('🚀 Starting MXE Diagnostic Test...\n');
  
  // Use devnet connection
  const connection = new Connection('https://api.devnet.solana.com', {
    confirmTransactionInitialTimeout: 60000,
    commitment: 'confirmed',
  });
  
  try {
    // Quick health check first
    console.log('📋 Quick Health Check:');
    const healthStatus = await quickHealthCheck(connection);
    console.log(`Status: ${healthStatus}\n`);
    
    // Full diagnostic
    console.log('🔍 Running Full Diagnostic...');
    const diagnostic = await diagnoseMXE(connection);
    
    // Print detailed report
    printDiagnostic(diagnostic);
    
    // Summary for debugging
    console.log('\n🎯 DEBUGGING SUMMARY:');
    console.log('===================');
    
    if (diagnostic.overall.status === 'CRITICAL') {
      console.log('❌ CRITICAL ISSUES FOUND - This explains MxeKeysNotSet errors!');
      console.log('\nMost likely causes:');
      console.log('1. Cluster has no active nodes (most common)');
      console.log('2. MXE not properly assigned to a cluster');
      console.log('3. Cluster account does not exist');
      
      console.log('\nNext steps:');
      console.log('1. Check if cluster offset is correct');
      console.log('2. Try a different cluster with active nodes');
      console.log('3. Wait for more nodes to join the current cluster');
    } else if (diagnostic.overall.status === 'DEGRADED') {
      console.log('⚠️ DEGRADED STATUS - Some issues but may work');
    } else {
      console.log('✅ MXE appears healthy - issue might be elsewhere');
    }
    
    console.log('\n📊 Key Metrics:');
    console.log(`• MXE Cluster: ${diagnostic.mxeAccount.cluster || 'NONE'}`);
    console.log(`• Cluster Active Nodes: ${diagnostic.cluster.nodeCount || 'UNKNOWN'}`);
    console.log(`• Computation Definitions Ready: ${diagnostic.computationDefinitions.filter(c => c.initialized).length}/${diagnostic.computationDefinitions.length}`);
    console.log(`• Pending Computations: ${diagnostic.mempool.pendingComputations}`);
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    console.log('\nThis error itself is diagnostic - indicates connection or setup issues');
  }
}

// Run if called directly
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

export { runDiagnostic };
