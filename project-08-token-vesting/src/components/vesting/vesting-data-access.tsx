"use client";

import { getVestingProgram, getVestingProgramId } from "@project/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useCluster } from "../cluster/cluster-data-access";
import { useAnchorProvider } from "../solana/solana-provider";
import { useTransactionToast } from "../ui/ui-layout";
import { start } from "../../../node_modules/solana-bankrun/dist/internal.d";

interface CreateVestingArgs {
  companyName: string;
  mint: string;
}

interface CreateEmployeeArgs {
  cliffTime: number;
  startTime: number;
  endTime: number;
  totalAmount: number;
  beneficiary: string;
}

export function useVestingProgram() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const provider = useAnchorProvider();
  const programId = useMemo(
    () => getVestingProgramId(cluster.network as Cluster),
    [cluster],
  );
  const program = useMemo(
    () => getVestingProgram(provider, programId),
    [provider, programId],
  );

  const accounts = useQuery({
    queryKey: ["vesting", "all", { cluster }],
    queryFn: () => program.account.vestingAccount.all(),
  });

  const getProgramAccount = useQuery({
    queryKey: ["get-program-account", { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  });

  const createVestingAccount = useMutation<string, Error, CreateVestingArgs>({
    mutationKey: ["vestingAccount", "create", { cluster }],
    mutationFn: ({ companyName, mint }) =>
      program.methods
        .createVestingAccount(companyName)
        .accounts({ mint: new PublicKey(mint), tokenProgram: TOKEN_PROGRAM_ID })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to create vesting account"),
  });

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createVestingAccount,
  };
}

export function useVestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster();
  const transactionToast = useTransactionToast();
  const { program, accounts } = useVestingProgram();

  const accountQuery = useQuery({
    queryKey: ["vesting", "fetch", { cluster, account }],
    queryFn: () => program.account.vestingAccount.fetch(account),
  });

  const createEmployeeAccount = useMutation<string, Error, CreateEmployeeArgs>({
    mutationKey: ["employeeAccount", "create", { cluster }],
    mutationFn: ({ cliffTime, startTime, endTime, totalAmount, beneficiary }) =>
      program.methods
        .createEmployeeVestingAccount(
          new BN(cliffTime),
          new BN(startTime),
          new BN(endTime),
          new BN(totalAmount),
        )
        .accounts({
          beneficiary: new PublicKey(beneficiary),
          vestingAccount: account,
        })
        .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature);
      return accounts.refetch();
    },
    onError: () => toast.error("Failed to create employee vesting account"),
  });

  return {
    accountQuery,
    createEmployeeAccount,
  };
}
