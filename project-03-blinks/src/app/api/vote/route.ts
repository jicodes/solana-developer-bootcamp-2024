import {
  ActionGetResponse,
  ActionPostRequest,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

import { Voting } from "@/../anchor/target/types/voting";
import { Program, BN } from "@coral-xyz/anchor";
const IDL = require("@/../anchor/target/idl/voting.json");

export const OPTIONS = async (req: Request) => {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS });
};

export async function GET(request: Request) {
  const actionMetadata: ActionGetResponse = {
    icon: "https://www.color-hex.com/palettes/67855.png",
    title: "vote for your favorite color",
    description: "vote between red and blue",
    label: "Vote",
    links: {
      actions: [
        {
          type: "post",
          label: "Vote for red",
          href: "/api/vote?candidate=red",
        },
        {
          type: "post",
          label: "Vote for blue",
          href: "/api/vote?candidate=blue",
        },
      ],
    },
  };
  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get("candidate");
  if (candidate != "red" && candidate != "blue") {
    return new Response("invalid candidate", { status: 400 });
  }

  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const program: Program<Voting> = new Program(IDL, { connection });

  const body: ActionPostRequest = await request.json();
  let voter;

  try {
    voter = new PublicKey(body.account);
  } catch (error) {
    return new Response("invalid account", {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const instruction = await program.methods
    .vote(candidate, new BN(1))
    .accounts({
      signer: voter,
    })
    .instruction();

  const blockhash = await connection.getLatestBlockhash();
  
  const transaction = new Transaction({
    feePayer: voter,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  }).add(instruction);


  const payload = await createPostResponse({
    fields: {
      type: "transaction",
      transaction: transaction
    }
  });

  return Response.json(payload, { headers: ACTIONS_CORS_HEADERS });
}
