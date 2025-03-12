import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TokenLottery } from "../target/types/token_lottery";
describe("token lottery", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;

  const payer = provider.wallet as anchor.Wallet;

  it("It should initialize token lottery", async () => {
    const [tokenLotteryKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_lottery")],
      program.programId,
    );

    const tx = await program.methods
      .initialize(new BN(0), new BN(1841781313), new BN(1000))
      .accounts({
        payer: payer.publicKey,
      })
      .signers([])
      .rpc();

    // Verify account was created
    console.log("Transaction:", tx);
    const account = await program.account.tokenLottery.fetch(tokenLotteryKey);
    console.log("Created account:", account);
  });
});
