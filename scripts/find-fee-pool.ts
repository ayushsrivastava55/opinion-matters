// Script to find the correct Arcium FeePool account
import { Connection, PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey(
  "Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp"
);

async function findFeePool() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  console.log("Searching for FeePool account for Arcium program:", ARCIUM_PROGRAM_ID.toBase58());
  
  // Try common PDA seeds for FeePool
  const commonSeeds = [
    ["FeePool"],
    ["fee_pool"],
    ["feepool"],
    ["pool"],
    ["Pool"],
    ["fees"],
  ];
  
  for (const seeds of commonSeeds) {
    try {
      const [pda, bump] = PublicKey.findProgramAddressSync(
        seeds.map(s => Buffer.from(s)),
        ARCIUM_PROGRAM_ID
      );
      
      console.log(`\nTrying seeds: ${seeds.join(", ")}`);
      console.log(`  PDA: ${pda.toBase58()}`);
      console.log(`  Bump: ${bump}`);
      
      // Check if account exists
      const accountInfo = await connection.getAccountInfo(pda);
      if (accountInfo) {
        console.log(`  ✅ FOUND! Account exists`);
        console.log(`  Owner: ${accountInfo.owner.toBase58()}`);
        console.log(`  Lamports: ${accountInfo.lamports}`);
        console.log(`  Data length: ${accountInfo.data.length}`);
      } else {
        console.log(`  ❌ Account does not exist`);
      }
    } catch (e) {
      console.log(`  Error: ${e}`);
    }
  }
  
  // Also try getting all accounts owned by Arcium program
  console.log("\n\nSearching for all accounts owned by Arcium program...");
  try {
    const accounts = await connection.getProgramAccounts(ARCIUM_PROGRAM_ID, {
      filters: [
        {
          dataSize: 9, // FeePool might have a specific size, try common sizes
        },
      ],
    });
    
    console.log(`Found ${accounts.length} accounts with dataSize=9:`);
    accounts.forEach((acc, i) => {
      console.log(`  ${i + 1}. ${acc.pubkey.toBase58()} (${acc.account.lamports} lamports)`);
    });
  } catch (e) {
    console.log(`Error fetching program accounts: ${e}`);
  }
  
  // Try different data sizes
  const commonSizes = [8, 16, 32, 40, 48, 64, 72, 80, 100, 128, 200, 495];
  for (const size of commonSizes) {
    try {
      const accounts = await connection.getProgramAccounts(ARCIUM_PROGRAM_ID, {
        filters: [{ dataSize: size }],
      });
      
      if (accounts.length > 0 && accounts.length < 20) {
        console.log(`\nAccounts with dataSize=${size} (${accounts.length} found):`);
        accounts.forEach((acc, i) => {
          console.log(`  ${i + 1}. ${acc.pubkey.toBase58()}`);
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }
}

findFeePool().then(() => process.exit(0)).catch(console.error);
