import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TokenLottery } from "../target/types/token_lottery";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("token lottery", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;

  const wallet = provider.wallet as anchor.Wallet;

  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  );

  const ASSOCIATED_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  );

  it("should create lottery account", async () => {
    const slot = await connection.getSlot();
    console.log("Current slot:", slot);

    const createLotteryTx = await program.methods
      .createLottery(new BN(0), new BN(slot + 10), new BN(10000))
      .accounts({})
      .signers([])
      .rpc();

    console.log(createLotteryTx);
  });

  it("should create ticket collection", async () => {
    const createTicketCollectionTx = await program.methods
      .createTicketCollection()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log(createTicketCollectionTx);
  });
});
