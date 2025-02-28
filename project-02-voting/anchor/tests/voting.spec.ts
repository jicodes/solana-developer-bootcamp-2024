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
  let context;
  let provider;
  let votingProgram: Program<Voting>;

  beforeAll(async () => {
    // Configure solana bankrun provider
    context = await startAnchor(
      "",
      [{ name: "voting", programId: votingAddress }],
      [],
    );
    provider = new BankrunProvider(context);

    votingProgram = new Program<Voting>(IDL, provider);
  });

  it("Initialize Poll", async () => {
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

  it("Initialize Candidate", async () => {
    await votingProgram.methods.initializeCandidate("red", new BN(1)).rpc();
    await votingProgram.methods.initializeCandidate("blue", new BN(1)).rpc();

    const [redAddress] = PublicKey.findProgramAddressSync(
      [new BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("red")],
      votingAddress,
    );
    const [blueAddress] = PublicKey.findProgramAddressSync(
      [new BN(1).toArrayLike(Buffer, 'le', 8), Buffer.from("blue")],
      votingAddress,
    );

    const redCandidate = await votingProgram.account.candidate.fetch(redAddress); 
    const blueCandidate = await votingProgram.account.candidate.fetch(blueAddress);
    console.log("redCandidate:", redCandidate);
    console.log("blueCandidate:", blueCandidate);
    expect(redCandidate.candidateVotes.toNumber()).toEqual(0);
    expect(blueCandidate.candidateVotes.toNumber()).toEqual(0);
  });

  it("Vote", async () => {});
});
