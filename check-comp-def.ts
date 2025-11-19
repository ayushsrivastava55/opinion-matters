import { PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp");
const MY_PROGRAM_ID = new PublicKey("DkZ8hXcjyoYTWUDD4VZ35PXP2HHA6bF8XRmSQXoqrprW");
const MXE_ACCOUNT = new PublicKey("34zXR49QSmNeuoH8LmoKgCJQo7vfATD57iD6Ubo2f5Pz");

const OFFSET = 1000; // private_trade

// 1. Derivation from init-comp-defs.ts
const offsetBytes = Buffer.alloc(4);
offsetBytes.writeUInt32LE(OFFSET);
const [pdaInit] = PublicKey.findProgramAddressSync(
  [Buffer.from('ComputationDefinitionAccount'), MY_PROGRAM_ID.toBuffer(), offsetBytes],
  ARCIUM_PROGRAM_ID
);

// 2. Derivation from program.ts (Current)
const [pdaFrontend] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("computation_definition"),
    MXE_ACCOUNT.toBuffer(),
    Buffer.from(OFFSET.toString().padStart(8, "0")),
  ],
  ARCIUM_PROGRAM_ID
);

// 3. Likely Correct Derivation (Standard Arcium)
// [b"computation_definition", mxe_key, offset_u32_le]
const [pdaStandard] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("computation_definition"),
    MXE_ACCOUNT.toBuffer(),
    offsetBytes,
  ],
  ARCIUM_PROGRAM_ID
);

console.log("Init Script PDA:   ", pdaInit.toBase58());
console.log("Frontend PDA:      ", pdaFrontend.toBase58());
console.log("Standard PDA:      ", pdaStandard.toBase58());
console.log("Log PDA (Failed):  ", "9VctnRketffRFCF47dC8JBbLNHj9sUBBa1TuVb2Qbfe3");
