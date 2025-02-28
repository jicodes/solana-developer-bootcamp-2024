// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import Project02votingIDL from '../target/idl/project02voting.json'
import type { Project02voting } from '../target/types/project02voting'

// Re-export the generated IDL and type
export { Project02voting, Project02votingIDL }

// The programId is imported from the program IDL.
export const PROJECT02VOTING_PROGRAM_ID = new PublicKey(Project02votingIDL.address)

// This is a helper function to get the Project02voting Anchor program.
export function getProject02votingProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...Project02votingIDL, address: address ? address.toBase58() : Project02votingIDL.address } as Project02voting, provider)
}

// This is a helper function to get the program ID for the Project02voting program depending on the cluster.
export function getProject02votingProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Project02voting program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return PROJECT02VOTING_PROGRAM_ID
  }
}
