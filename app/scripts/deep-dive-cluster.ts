/**
 * Deep dive into cluster data structure
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getArciumProgramReadonly,
  getClusterAccAddress,
  getClusterAccInfo
} from '@arcium-hq/reader';

async function deepDiveCluster() {
  console.log('🔍 Deep dive into cluster data...\n');
  
  const connection = new Connection('https://api.devnet.solana.com', {
    commitment: 'confirmed',
  });
  
  const arciumProgram = getArciumProgramReadonly({
    connection,
    // @ts-ignore
    provider: null
  });
  
  // Check cluster 1 (your working cluster)
  const clusterOffset = 1;
  const clusterAddress = getClusterAccAddress(clusterOffset);
  
  console.log(`🔍 Checking cluster ${clusterOffset}: ${clusterAddress.toString()}`);
  
  try {
    // Get raw account data first
    const accountInfo = await connection.getAccountInfo(clusterAddress);
    
    if (accountInfo) {
      console.log(`✅ Raw account data:`);
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      console.log(`   Lamports: ${accountInfo.lamports}`);
      console.log(`   Data size: ${accountInfo.data.length}`);
      console.log(`   Executable: ${accountInfo.executable}`);
      
      // Show first few bytes of data
      console.log(`   Data (first 32 bytes): ${Buffer.from(accountInfo.data.slice(0, 32)).toString('hex')}`);
    }
    
    // Now get parsed data
    const clusterInfo = await getClusterAccInfo(arciumProgram, clusterAddress);
    
    console.log(`\n✅ Parsed cluster info:`);
    console.log(`   Cluster: ${clusterInfo.cluster}`);
    console.log(`   Authority: ${clusterInfo.authority?.toString() || 'None'}`);
    console.log(`   Active Nodes: ${clusterInfo.activeNodes || 0}`);
    console.log(`   Total Nodes: ${clusterInfo.totalNodes || 0}`);
    console.log(`   Status: ${clusterInfo.status || 'Unknown'}`);
    
    // Check all possible fields
    console.log(`\n🔍 All cluster fields:`);
    Object.keys(clusterInfo).forEach(key => {
      const value = (clusterInfo as any)[key];
      if (typeof value === 'object' && value !== null) {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
  }
  
  // Also check a known working MXE
  console.log(`\n🔍 Checking known working MXE...`);
  
  const workingMXE = new PublicKey('AUVCVt1aSWVmBVZtURjNpTYdGmqq8x8Tx4HPnX955SNd');
  
  try {
    const mxeInfo = await getMXEAccInfo(arciumProgram, workingMXE);
    
    console.log(`✅ Working MXE info:`);
    console.log(`   Authority: ${mxeInfo.authority?.toString() || 'None'}`);
    console.log(`   Cluster: ${mxeInfo.cluster}`);
    console.log(`   Bump: ${mxeInfo.bump}`);
    console.log(`   Computation Definitions: ${mxeInfo.computationDefinitions}`);
    console.log(`   Fallback Clusters: ${mxeInfo.fallbackClusters}`);
    console.log(`   Rejected Clusters: ${mxeInfo.rejectedClusters}`);
    
    // Check utility pubkeys - this might be the key!
    console.log(`\n🔍 Utility Pubkeys:`);
    console.log(`   Type: ${typeof mxeInfo.utilityPubkeys}`);
    console.log(`   Value: ${JSON.stringify(mxeInfo.utilityPubkeys)}`);
    
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
  }
}

import { getMXEAccInfo } from '@arcium-hq/reader';

deepDiveCluster().catch(console.error);
