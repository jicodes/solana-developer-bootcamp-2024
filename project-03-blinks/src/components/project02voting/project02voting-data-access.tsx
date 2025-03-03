'use client'

import { getProject02votingProgram, getProject02votingProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useProject02votingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getProject02votingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getProject02votingProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['project02voting', 'all', { cluster }],
    queryFn: () => program.account.project02voting.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['project02voting', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ project02voting: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useProject02votingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useProject02votingProgram()

  const accountQuery = useQuery({
    queryKey: ['project02voting', 'fetch', { cluster, account }],
    queryFn: () => program.account.project02voting.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['project02voting', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ project02voting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['project02voting', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ project02voting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['project02voting', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ project02voting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['project02voting', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ project02voting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
