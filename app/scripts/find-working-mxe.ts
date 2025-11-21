/**
 * Find MXE with proper keys set
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getArciumProgramReadonly,
  getMXEAccAddresses,
  getMXEAccInfo
} from '@arcium-hq/reader';

async function findWorkingMXE() {
  console.log('🔍 Searching for MXE with proper keys...\n');
  
  const connection = new Connection('https://api.devnet.solana.com', {
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
    console.log(`📊 Found ${mxeAddresses.length} MXE accounts\n`);
    
    let workingMXEs = 0;
    let brokenMXEs = 0;
    
    for (let i = 0; i < Math.min(mxeAddresses.length, 10); i++) {
      const mxeAddress = mxeAddresses[i];
      console.log(`🔍 Checking MXE ${i}: ${mxeAddress.toString()}`);
      
      try {
        const mxeInfo = await getMXEAccInfo(arciumProgram, mxeAddress);
        
        // Check if utility keys are set
        const utilityKeys = mxeInfo.utilityPubkeys;
        const hasKeys = utilityKeys && 'set' in utilityKeys;
        
        if (hasKeys) {
          console.log(`   ✅ KEYS ARE SET!`);
          console.log(`   Cluster: ${mxeInfo.cluster}`);
          console.log(`   Authority: ${mxeInfo.authority?.toString() || 'None'}`);
          console.log(`   Computation Definitions: ${mxeInfo.computationDefinitions.length}`);
          workingMXEs++;
        } else {
          console.log(`   ❌ Keys not set (utilityPubkeys.unset)`);
          console.log(`   Cluster: ${mxeInfo.cluster}`);
          brokenMXEs++;
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to read: ${error}`);
        brokenMXEs++;
      }
      
      console.log('');
    }
    
    console.log('📊 SUMMARY:');
    console.log(`✅ Working MXEs (keys set): ${workingMXEs}`);
    console.log(`❌ Broken MXEs (keys not set): ${brokenMXEs}`);
    
    if (workingMXEs > 0) {
      console.log('\n💡 RECOMMENDATION: Use an MXE that has keys set!');
      console.log('Your current MXE has zeroed keys - need to reinitialize or switch to a working MXE');
    } else {
      console.log('\n⚠️ No MXEs with proper keys found in first 10');
      console.log('This suggests a systemic issue with MXE initialization on devnet');
    }
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

findWorkingMXE().catch(console.error);
