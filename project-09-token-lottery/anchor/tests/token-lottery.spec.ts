import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import * as sb from "@switchboard-xyz/on-demand";
import { TokenLottery } from "../target/types/token_lottery";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";

import SwitchboardIdl from "../switchboard.json";

describe("token lottery", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const program = anchor.workspace.TokenLottery as Program<TokenLottery>;
  const wallet = provider.wallet as anchor.Wallet;

  const switchboardProgram = new anchor.Program(SwitchboardIdl as anchor.Idl);
  const rngKp = anchor.web3.Keypair.generate();

  // Fetch the switchboard IDL from mainnet and save it to a file
  // beforeAll(async () => {
  //   const switchboardIDL = (await anchor.Program.fetchIdl(
  //     sb.ON_DEMAND_MAINNET_PID,
  //     {
  //       connection: new anchor.web3.Connection(
  //         "https://api.mainnet-beta.solana.com",
  //       ),
  //     },
  //   )) as anchor.Idl;

  //   var fs = require("fs");
  //   fs.writeFile(
  //     "switchboard.json",
  //     JSON.stringify(switchboardIDL),
  //     function (err: Error) {
  //       if (err) {
  //         console.log(err);
  //       }
  //     },
  //   );

  //   switchboardProgram = new anchor.Program(switchboardIDL, provider);
  // });

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

  it("should test token lottery system", async () => {
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

    const slot = await connection.getSlot();
    const endSlot = slot + 20;

    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();
    await buyTicket();

    const queue = new anchor.web3.PublicKey(
      "A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w",
    );
    const queueAccount = new sb.Queue(switchboardProgram, queue);
    console.log("Queue account", queue.toString());
    try {
      await queueAccount.loadData();
    } catch (err) {
      console.log("Queue account not found");
      process.exit(1);
    }

    const [randomness, ix] = await sb.Randomness.create(
      switchboardProgram,
      rngKp,
      queue,
    );
    console.log("Created randomness account..");
    console.log("Randomness account", randomness.pubkey.toBase58());
    console.log("rkp account", rngKp.publicKey.toBase58());
    const createRandomnessTx = await sb.asV0Tx({
      connection: connection,
      ixs: [ix],
      payer: wallet.publicKey,
      signers: [wallet.payer, rngKp],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    });

    const latestBlockhash = await connection.getLatestBlockhash();

    const createRandomnessSignature = await connection.sendTransaction(
      createRandomnessTx,
    );

    await connection.confirmTransaction({
      signature: createRandomnessSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    console.log(
      "Transaction Signature for randomness account creation: ",
      createRandomnessSignature,
    );

    // TO-DO this line will generate error
    const sbCommitIx = await randomness.commitIx(queue);

    const commitIx = await program.methods
      .commitRandomness()
      .accounts({
        randomnessAccount: randomness.pubkey,
      })
      .instruction();

    const commitComputeIx =
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: 100000,
      });

    const commitPriorityIx =
      anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1,
      });

    const commitBlockhashWithContext =
      await provider.connection.getLatestBlockhash();
    const commitTx = new anchor.web3.Transaction({
      feePayer: wallet.payer.publicKey,
      blockhash: commitBlockhashWithContext.blockhash,
      lastValidBlockHeight: commitBlockhashWithContext.lastValidBlockHeight,
    })
      .add(commitComputeIx)
      .add(commitPriorityIx)
      .add(sbCommitIx)
      .add(commitIx);

    const commitSignature = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      commitTx,
      [wallet.payer],
      { skipPreflight: true },
    );

    console.log("Commit randomness signature: ", commitSignature);

    // reveal winner
    const sbRevealIx = await randomness.revealIx();
    const revealWinnerIx = await program.methods
      .revealWinner()
      .accounts({
        randomnessAccount: randomness.pubkey,
      })
      .instruction();

    const revealBlockHashWithContext = await connection.getLatestBlockhash();

    const revealTx = new anchor.web3.Transaction({
      feePayer: wallet.payer.publicKey,
      blockhash: revealBlockHashWithContext.blockhash,
      lastValidBlockHeight: revealBlockHashWithContext.lastValidBlockHeight,
    })
      .add(sbRevealIx)
      .add(revealWinnerIx);

    let currentSlot = 0;
    while (currentSlot < endSlot) {
      const slot = await connection.getSlot();
      if (slot > currentSlot) {
        currentSlot = slot;
        console.log("current slot", currentSlot);
      }
    }

    const revealSignature = await anchor.web3.sendAndConfirmTransaction(
      connection,
      revealTx,
      [wallet.payer],
    );

    console.log("Reveal Signature ", revealSignature);

    // claim prize

    const claimIx = await program.methods
      .claimPrize()
      .accounts({
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const claimBlockHashWithContext = await connection.getLatestBlockhash();

    const claimTx = new anchor.web3.Transaction({
      feePayer: wallet.payer.publicKey,
      blockhash: claimBlockHashWithContext.blockhash,
      lastValidBlockHeight: claimBlockHashWithContext.lastValidBlockHeight,
    }).add(claimIx);

    const claimSignature = await anchor.web3.sendAndConfirmTransaction(
      connection,
      claimTx,
      [wallet.payer],
    );

    console.log("Claim prize Signature ", claimSignature);
  });
});
