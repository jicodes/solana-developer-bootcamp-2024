import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
  airdropIfRequired,
  getKeypairFromFile,
  getExplorerLink,
} from "@solana-developers/helpers";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createNft,
  fetchDigitalAsset,
  findMetadataPda,
  mplTokenMetadata,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata";
import { generateSigner, keypairIdentity, percentAmount, publicKey } from "@metaplex-foundation/umi";


const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

const user = await getKeypairFromFile("user.json");

await airdropIfRequired(
  connection,
  user.publicKey,
  1 * LAMPORTS_PER_SOL,
  0.5 * LAMPORTS_PER_SOL,
);

console.log("user public key:", user.publicKey.toBase58());

const umi = createUmi(connection.rpcEndpoint);
umi.use(mplTokenMetadata());

const umiUser = umi.eddsa.createKeypairFromSecretKey(user.secretKey);
umi.use(keypairIdentity(umiUser));

console.log("set up Umi instance for user"); 

const collectionAddress = publicKey(
  "<YOUR_COLLECTION_ADDRESS_HERE>"
);

const nftAddress = publicKey("<YOUR_NFT_ADDRESS_HERE>");

const transaction = verifyCollectionV1(umi, {
  metadata: findMetadataPda(umi, { mint: nftAddress }),
  collectionMint: collectionAddress,
  authority: umi.identity,
});

transaction.sendAndConfirm(umi);

console.log(
  `✅ NFT ${nftAddress} verified as member of collection ${collectionAddress}! See Explorer at ${getExplorerLink(
    "address",
    nftAddress,
    "devnet"
  )}`
);