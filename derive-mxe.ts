import { PublicKey } from "@solana/web3.js";

const ARCIUM_PROGRAM_ID = new PublicKey("Bv3Fb9VjzjWGfX18QTUcVycAfeLoQ5zZN6vv2g3cTZxp");
const MY_PROGRAM_ID = new PublicKey("GbUrf8bWp11kk41Rq7zu4P4LPfwLyExXWVyWgehQSbxn");

const [mxePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("mxe"), MY_PROGRAM_ID.toBuffer()],
  ARCIUM_PROGRAM_ID
);

console.log("Derived MXE PDA:", mxePda.toBase58());
