/**
 * Cluster Scanner - Find clusters with active nodes
 */

import { Connection } from '@solana/web3.js';
import { 
  getArciumProgramReadonly,
  getClusterAccAddresses,
  getClusterAccInfo
} from '@arcium-hq/reader';

async function scanClusters() {
  console.log('🔍 Scanning all Arcium clusters for active nodes...\n');
  
  const connection = new Connection('https://api.devnet.solana.com', {
    commitment: 'confirmed',
  });
  
  const arciumProgram = getArciumProgramReadonly({
    connection,
    // @ts-ignore
    provider: null
  });
  
  try {
    // Get all cluster addresses
    const clusterAddresses = await getClusterAccAddresses(connection);
    console.log(`📊 Found ${clusterAddresses.length} clusters\n`);
    
    const healthyClusters = [];
    const unhealthyClusters = [];
    
    for (let i = 0; i < clusterAddresses.length; i++) {
      const clusterAddress = clusterAddresses[i];
      console.log(`🔍 Checking cluster ${i}...`);
      
      try {
        const clusterInfo = await getClusterAccInfo(arciumProgram, clusterAddress);
        
        const clusterData = {
          index: i,
          address: clusterAddress.toString(),
          activeNodes: clusterInfo.activeNodes || 0,
          status: clusterInfo.activeNodes && clusterInfo.activeNodes > 0 ? 'HEALTHY' : 'NO_NODES',
          authority: clusterInfo.authority?.toString() || 'None'
        };
        
        if (clusterData.activeNodes > 0) {
          healthyClusters.push(clusterData);
          console.log(`✅ Cluster ${i}: ${clusterData.activeNodes} active nodes`);
        } else {
          unhealthyClusters.push(clusterData);
          console.log(`❌ Cluster ${i}: No active nodes`);
        }
        
      } catch (error) {
        console.log(`❌ Cluster ${i}: Failed to read - ${error}`);
        unhealthyClusters.push({
          index: i,
          address: clusterAddress.toString(),
          activeNodes: 0,
          status: 'ERROR',
          error: error
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🏥 CLUSTER SCAN RESULTS');
    console.log('='.repeat(60));
    
    if (healthyClusters.length > 0) {
      console.log(`\n✅ HEALTHY CLUSTERS (${healthyClusters.length}):`);
      healthyClusters.forEach(cluster => {
        console.log(`   Cluster ${cluster.index}: ${cluster.activeNodes} nodes (${cluster.address})`);
      });
      
      console.log(`\n💡 RECOMMENDATION: Use cluster ${healthyClusters[0].index} with ${healthyClusters[0].activeNodes} active nodes`);
      console.log(`   Set ARCIUM_CLUSTER_OFFSET=${healthyClusters[0].index} in your .env.local`);
      
    } else {
      console.log('\n❌ NO HEALTHY CLUSTERS FOUND!');
      console.log('All clusters have 0 active nodes - this is a network-wide issue');
      console.log('\nOptions:');
      console.log('1. Wait for nodes to come online');
      console.log('2. Contact Arcium team about cluster status');
      console.log('3. Consider using mainnet instead of devnet');
    }
    
    console.log(`\n❌ UNHEALTHY CLUSTERS (${unhealthyClusters.length}):`);
    unhealthyClusters.slice(0, 10).forEach(cluster => {
      console.log(`   Cluster ${cluster.index}: ${cluster.status} ${cluster.error ? `(${cluster.error})` : ''}`);
    });
    
    if (unhealthyClusters.length > 10) {
      console.log(`   ... and ${unhealthyClusters.length - 10} more`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    return { healthyClusters, unhealthyClusters };
    
  } catch (error) {
    console.error('❌ Cluster scan failed:', error);
    return { healthyClusters: [], unhealthyClusters: [] };
  }
}

// Run if called directly
if (require.main === module) {
  scanClusters().catch(console.error);
}

export { scanClusters };
