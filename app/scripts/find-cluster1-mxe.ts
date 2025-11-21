/**
 * Find MXE on cluster 1 for your program
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getArciumProgramReadonly,
  getMXEAccAddresses,
  getMXEAccInfo
} from '@arcium-hq/reader';

async function findMXEOnCluster1() {
  console.log('🔍 Looking for MXE on cluster 1...\n');
  
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=cac5129f-2030-484b-b9c9-6776f80ce9e7', {
    commitment: 'confirmed',
  });
  
  const arciumProgram = getArciumProgramReadonly({
    connection,
    // @ts-ignore
    provider: null
  });
  
  try {
    // Get all MXE addresses
    const mxeAddresses = await getMXEAccAddresses(connection);
    console.log(`📊 Checking ${mxeAddresses.length} MXE accounts for cluster 1...\n`);
    
    let cluster1MXEs = [];
    
    for (let i = 0; i < Math.min(mxeAddresses.length, 50); i++) {
      const mxeAddress = mxeAddresses[i];
      
      try {
        const mxeInfo = await getMXEAccInfo(arciumProgram, mxeAddress);
        
        if (mxeInfo.cluster === 1) {
          console.log(`✅ Found MXE on cluster 1: ${mxeAddress.toString()}`);
          console.log(`   Authority: ${mxeInfo.authority?.toString() || 'None'}`);
          console.log(`   Computation Definitions: ${mxeInfo.computationDefinitions.length}`);
          
          // Check if keys are set
          const hasKeys = mxeInfo.utilityPubkeys && 'set' in mxeInfo.utilityPubkeys;
          console.log(`   Keys Set: ${hasKeys ? 'YES' : 'NO'}`);
          
          cluster1MXEs.push({
            address: mxeAddress,
            authority: mxeInfo.authority?.toString(),
            hasKeys,
            compDefs: mxeInfo.computationDefinitions.length
          });
        }
        
      } catch (error) {
        // Skip failed reads
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Found ${cluster1MXEs.length} MXEs on cluster 1`);
    
    if (cluster1MXEs.length > 0) {
      console.log('\n🔍 Cluster 1 MXEs:');
      cluster1MXEs.forEach((mxe, i) => {
        console.log(`   ${i+1}. ${mxe.address}`);
        console.log(`      Authority: ${mxe.authority || 'None'}`);
        console.log(`      Keys: ${mxe.hasKeys ? 'SET ✅' : 'NOT SET ❌'}`);
        console.log(`      CompDefs: ${mxe.compDefs}`);
      });
      
      // Find one with keys set or that we can use
      const workingMXE = cluster1MXEs.find(mxe => mxe.hasKeys);
      const ourAuthorityMXE = cluster1MXEs.find(mxe => mxe.authority === '3CP267HFuQj9Rc1R2TqNC2Tg2G3ZbQZeSXyNSanvKEv3');
      
      if (workingMXE) {
        console.log(`\n🎯 RECOMMENDATION: Use working MXE ${workingMXE.address}`);
        console.log(`   Update your config to point to this MXE`);
      } else if (ourAuthorityMXE) {
        console.log(`\n🎯 RECOMMENDATION: Use your authority MXE ${ourAuthorityMXE.address}`);
        console.log(`   Try to finalize keys for this MXE`);
      } else {
        console.log(`\n💡 RECOMMENDATION: Create new MXE on cluster 1`);
        console.log(`   Use a different authority keypair`);
      }
    } else {
      console.log(`\n💡 No MXEs found on cluster 1`);
      console.log(`   Create a new MXE on cluster 1`);
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

findMXEOnCluster1().catch(console.error);
