import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { TokenLottery } from "../target/types/token_lottery";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

describe("token lottery", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;

  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;

  const wallet = provider.wallet as anchor.Wallet;

  async function buyTicket() {
    const buyTicketIx = await program.methods
      .buyTicket()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const blockhashContext = await connection.getLatestBlockhash();

    // since the CU in a single tx exceeds the default limit(200000),
    // we need to set the compute budget
    // Set the compute budget for the transaction.
    const computeIx = anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    });

    // Set the priority for the transaction.
    const priorityIx = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1,
    });

    const tx = new anchor.web3.Transaction({
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    })
      .add(buyTicketIx)
      .add(computeIx)
      .add(priorityIx);

    const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
      wallet.payer,
    ]);
    console.log("buy ticket ", sig);
  }

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

  // it("should create ticket collection", async () => {
  //   const createTicketCollectionTx = await program.methods
  //     .createTicketCollection()
  //     .accounts({
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     })
  //     .signers([])
  //     .rpc({
  //       skipPreflight: true,
  //       commitment: "confirmed",
  //     });

  //   console.log(
  //     "Create ticket collection transaction signature:",
  //     createTicketCollectionTx,
  //   );
  // });

  it("should initialize the lottery system", async () => {
    const createTicketCollectionIx = await program.methods
      .createTicketCollection()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const blockhashContext = await connection.getLatestBlockhash();

    const tx = new anchor.web3.Transaction({
      blockhash: blockhashContext.blockhash,
      lastValidBlockHeight: blockhashContext.lastValidBlockHeight,
      feePayer: wallet.payer.publicKey,
    }).add(createTicketCollectionIx);

    const sig = await anchor.web3.sendAndConfirmTransaction(connection, tx, [
      wallet.payer,
    ]);
    console.log(sig);

    await buyTicket();
  });
});
