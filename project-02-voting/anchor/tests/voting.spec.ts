import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";

import { Voting } from "../target/types/voting";
const IDL = require("../target/idl/voting.json");

import { BankrunProvider, startAnchor } from "anchor-bankrun";

const votingAddress = new PublicKey(
  "EDc2Q25Nenvp1rhEDkQnUmCi7YzeYwLBWuaeXRweVmZu",
);

describe("voting", () => {
  it("Initialize Poll", async () => {
    // Configure solana bankrun provider
    const context = await startAnchor(
      "",
      [{ name: "voting", programId: votingAddress }],
      [],
    );
    const provider = new BankrunProvider(context);

    const votingProgram = new Program<Voting>(IDL, provider);

    await votingProgram.methods
      .initializePoll(
        new BN(1),
        "what is your favorite color?",
        new BN(0),
        new BN(1840718903),
      )
      .rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new BN(1).toArrayLike(Buffer, "le", 8)],
      votingAddress,
    );

    console.log("pollAddress is:", pollAddress.toBase58());

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log("poll:", poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual("what is your favorite color?");
    expect(poll.pollStart.toNumber()).toEqual(0);
    expect(poll.pollEnd.toNumber()).toEqual(1840718903);
  });
});
