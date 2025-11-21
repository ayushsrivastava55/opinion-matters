/**
 * MXE Diagnostic Tool
 * Helps diagnose MxeKeysNotSet and other MXE-related issues
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getMXEAccAddress,
  getArciumProgAddress,
  getClusterAccAddress,
} from '@arcium-hq/client'
import {
  getCorrectClusterAccount,
} from './arcium-accounts-fixed'
import { 
  getCompDefAccAddress,
  getCompDefAccInfo,
  getComputationsInMempool,
  getArciumProgramReadonly,
  getMXEAccInfo,
  getClusterAccInfo,
  type ArciumTypes
} from '@arcium-hq/reader';
import { PROGRAM_ID, ARCIUM_CLUSTER_OFFSET } from '../config/program';

interface MXEDiagnostic {
  timestamp: string;
  mxeAccount: {
    address: string;
    exists: boolean;
    authority: string | null;
    cluster: number | null;
    computationDefinitions: number[];
    fallbackClusters: number[];
    rejectedClusters: number[];
    status: string;
  };
  cluster: {
    address: string;
    exists: boolean;
    status: string;
    nodeCount?: number;
  };
  computationDefinitions: Array<{
    name: string;
    address: string;
    exists: boolean;
    initialized: boolean;
    status: string;
  }>;
  mempool: {
    pendingComputations: number;
    computations: any[];
  };
  overall: {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Diagnose MXE health and identify issues
 */
export async function diagnoseMXE(connection: Connection): Promise<MXEDiagnostic> {
  console.log('🔍 Starting MXE Diagnostic...');
  
  const diagnostic: MXEDiagnostic = {
    timestamp: new Date().toISOString(),
    mxeAccount: {
      address: '',
      exists: false,
      authority: null,
      cluster: null,
      computationDefinitions: [],
      fallbackClusters: [],
      rejectedClusters: [],
      status: 'UNKNOWN'
    },
    cluster: {
      address: '',
      exists: false,
      status: 'UNKNOWN'
    },
    computationDefinitions: [],
    mempool: {
      pendingComputations: 0,
      computations: []
    },
    overall: {
      status: 'UNKNOWN',
      issues: [],
      recommendations: []
    }
  };

  try {
    // 1. Get Arcium program
    const arciumProgram = getArciumProgramReadonly({
      connection,
      // @ts-ignore - provider type mismatch
      provider: null
    });

    // 2. Check MXE Account
    const mxeAddress = getMXEAccAddress(new PublicKey(PROGRAM_ID));
    diagnostic.mxeAccount.address = mxeAddress.toString();
    
    console.log(`📍 MXE Account: ${mxeAddress.toString()}`);
    
    try {
      const mxeInfo = await getMXEAccInfo(arciumProgram, mxeAddress);
      diagnostic.mxeAccount.exists = true;
      diagnostic.mxeAccount.authority = mxeInfo.authority?.toString() || null;
      diagnostic.mxeAccount.cluster = mxeInfo.cluster;
      diagnostic.mxeAccount.computationDefinitions = mxeInfo.computationDefinitions;
      diagnostic.mxeAccount.fallbackClusters = mxeInfo.fallbackClusters;
      diagnostic.mxeAccount.rejectedClusters = mxeInfo.rejectedClusters;
      
      // Analyze MXE status
      if (!mxeInfo.cluster) {
        diagnostic.mxeAccount.status = 'NO_CLUSTER';
        diagnostic.overall.issues.push('MXE has no assigned cluster');
      } else {
        diagnostic.mxeAccount.status = 'HAS_CLUSTER';
        console.log(`✅ MXE assigned to cluster: ${mxeInfo.cluster}`);
      }
      
      if (mxeInfo.computationDefinitions.length === 0) {
        diagnostic.overall.issues.push('No computation definitions found');
        diagnostic.overall.recommendations.push('Initialize computation definitions for your circuits');
      }
      
    } catch (error) {
      diagnostic.mxeAccount.exists = false;
      diagnostic.mxeAccount.status = 'NOT_FOUND';
      diagnostic.overall.issues.push(`MXE account not found: ${error}`);
      diagnostic.overall.recommendations.push('Ensure MXE is properly deployed');
    }

    // 3. Check Cluster if MXE has one
    if (diagnostic.mxeAccount.cluster) {
      // For cluster offset 1, use the correct hardcoded address
      const clusterAddress = diagnostic.mxeAccount.cluster === 1 
        ? getCorrectClusterAccount()
        : getClusterAccAddress(diagnostic.mxeAccount.cluster);
      diagnostic.cluster.address = clusterAddress.toString();
      
      console.log(`📍 Cluster Account: ${clusterAddress.toString()}`);
      
      try {
        const clusterInfo = await getClusterAccInfo(arciumProgram, clusterAddress);
        diagnostic.cluster.exists = true;
        
        // Analyze cluster status
        if (clusterInfo.activeNodes && clusterInfo.activeNodes > 0) {
          diagnostic.cluster.status = 'ACTIVE';
          diagnostic.cluster.nodeCount = clusterInfo.activeNodes;
          console.log(`✅ Cluster has ${clusterInfo.activeNodes} active nodes`);
        } else {
          diagnostic.cluster.status = 'NO_NODES';
          diagnostic.overall.issues.push('Cluster has no active nodes - this causes MxeKeysNotSet');
          diagnostic.overall.recommendations.push('Wait for more nodes to join the cluster or use a different cluster');
        }
        
      } catch (error) {
        diagnostic.cluster.exists = false;
        diagnostic.cluster.status = 'NOT_FOUND';
        diagnostic.overall.issues.push(`Cluster account not found: ${error}`);
      }
    }

    // 4. Check Computation Definitions
    const circuitNames = ['private_trade', 'batch_clear', 'resolve_market'];
    
    for (const circuitName of circuitNames) {
      const compDefAddress = getCompDefAccAddress(new PublicKey(PROGRAM_ID), getCircuitOffset(circuitName));
      
      const compDef = {
        name: circuitName,
        address: compDefAddress.toString(),
        exists: false,
        initialized: false,
        status: 'UNKNOWN'
      };
      
      try {
        const compDefInfo = await getCompDefAccInfo(arciumProgram, compDefAddress);
        compDef.exists = true;
        compDef.initialized = true;
        compDef.status = 'READY';
        console.log(`✅ ${circuitName} computation definition ready`);
      } catch (error) {
        compDef.status = 'NOT_INITIALIZED';
        diagnostic.overall.issues.push(`${circuitName} computation definition not initialized`);
        console.log(`❌ ${circuitName} computation definition: ${error}`);
      }
      
      diagnostic.computationDefinitions.push(compDef);
    }

    // 5. Check Mempool
    try {
      const computations = await getComputationsInMempool(arciumProgram, mxeAddress);
      diagnostic.mempool.pendingComputations = computations.length;
      diagnostic.mempool.computations = computations;
      
      if (computations.length > 0) {
        console.log(`📊 ${computations.length} computations in mempool`);
      }
    } catch (error) {
      console.log(`⚠️ Could not check mempool: ${error}`);
    }

    // 6. Overall Assessment
    const criticalIssues = diagnostic.overall.issues.filter(i => 
      i.includes('no active nodes') || i.includes('NOT_FOUND') || i.includes('no assigned cluster')
    );
    
    if (criticalIssues.length > 0) {
      diagnostic.overall.status = 'CRITICAL';
    } else if (diagnostic.overall.issues.length > 0) {
      diagnostic.overall.status = 'DEGRADED';
    } else {
      diagnostic.overall.status = 'HEALTHY';
    }

    // Add specific recommendations based on findings
    if (diagnostic.mxeAccount.cluster && !diagnostic.cluster.exists) {
      diagnostic.overall.recommendations.push('Cluster assigned to MXE does not exist - check cluster offset');
    }
    
    if (diagnostic.cluster.status === 'NO_NODES') {
      diagnostic.overall.recommendations.push('This is the likely cause of MxeKeysNotSet errors');
      diagnostic.overall.recommendations.push('Try using a different cluster offset or wait for nodes');
    }

  } catch (error) {
    diagnostic.overall.status = 'CRITICAL';
    diagnostic.overall.issues.push(`Diagnostic failed: ${error}`);
  }

  return diagnostic;
}

/**
 * Helper function to get circuit offset (simplified version)
 */
function getCircuitOffset(circuitName: string): number {
  // In real implementation, this would use the same hash-based derivation as Arcium
  const offsets: Record<string, number> = {
    'private_trade': 0, // Replace with actual offset
    'batch_clear': 1,   // Replace with actual offset  
    'resolve_market': 2  // Replace with actual offset
  };
  return offsets[circuitName] || 0;
}

/**
 * Pretty print diagnostic results
 */
export function printDiagnostic(diagnostic: MXEDiagnostic): void {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 MXE HEALTH DIAGNOSTIC REPORT');
  console.log('='.repeat(60));
  console.log(`📅 Timestamp: ${diagnostic.timestamp}`);
  console.log(`🎯 Overall Status: ${diagnostic.overall.status}`);
  
  if (diagnostic.overall.issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    diagnostic.overall.issues.forEach(issue => console.log(`   • ${issue}`));
  }
  
  if (diagnostic.overall.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    diagnostic.overall.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  console.log('\n📊 MXE ACCOUNT:');
  console.log(`   Address: ${diagnostic.mxeAccount.address}`);
  console.log(`   Exists: ${diagnostic.mxeAccount.exists}`);
  console.log(`   Status: ${diagnostic.mxeAccount.status}`);
  console.log(`   Authority: ${diagnostic.mxeAccount.authority || 'None'}`);
  console.log(`   Cluster: ${diagnostic.mxeAccount.cluster || 'None'}`);
  console.log(`   Computation Definitions: ${diagnostic.mxeAccount.computationDefinitions.length}`);
  
  console.log('\n🔗 CLUSTER:');
  console.log(`   Address: ${diagnostic.cluster.address}`);
  console.log(`   Exists: ${diagnostic.cluster.exists}`);
  console.log(`   Status: ${diagnostic.cluster.status}`);
  console.log(`   Active Nodes: ${diagnostic.cluster.nodeCount || 'Unknown'}`);
  
  console.log('\n⚙️  COMPUTATION DEFINITIONS:');
  diagnostic.computationDefinitions.forEach(comp => {
    console.log(`   ${comp.name}: ${comp.status} (${comp.address})`);
  });
  
  console.log('\n📋 MEMPOOL:');
  console.log(`   Pending Computations: ${diagnostic.mempool.pendingComputations}`);
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Quick health check
 */
export async function quickHealthCheck(connection: Connection): Promise<string> {
  try {
    const diagnostic = await diagnoseMXE(connection);
    
    switch (diagnostic.overall.status) {
      case 'HEALTHY':
        return '✅ MXE is healthy and ready for computations';
      case 'DEGRADED':
        return '⚠️ MXE has some issues but may work';
      case 'CRITICAL':
        return '❌ MXE has critical issues - computations will fail';
      default:
        return '❓ Unable to determine MXE status';
    }
  } catch (error) {
    return `❌ Health check failed: ${error}`;
  }
}
