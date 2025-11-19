import { PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp");
const MY_PROGRAM_ID = new PublicKey("DkZ8hXcjyoYTWUDD4VZ35PXP2HHA6bF8XRmSQXoqrprW");

const [mxePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("mxe"), MY_PROGRAM_ID.toBuffer()],
  ARCIUM_PROGRAM_ID
);

console.log("Derived MXE PDA:", mxePda.toBase58());
