"use client";

import { PublicKey } from "@solana/web3.js";
import { useState } from "react";

import {
  useCrudappProgram,
  useCrudappProgramAccount,
} from "./crudapp-data-access";
import { useWallet } from "@solana/wallet-adapter-react";

export function CrudappCreate() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { createEntry } = useCrudappProgram();
  const { publicKey } = useWallet();

  const isFormValid = title.trim() && message.trim();

  const handleSubmit = async () => {
    if (publicKey && isFormValid) {
      createEntry.mutateAsync({ title, message });
    }
  };

  if (!publicKey) {
    return (
      <div className="alert alert-warning">
        <span>Connect a wallet to create an entry.</span>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input input-bordered w-full max-w-xs"
      />
      <textarea
        placeholder="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="textarea textarea-bordered w-full max-w-xs"
      />
      <button
        onClick={handleSubmit}
        disabled={!isFormValid || createEntry.isPending}
        className="btn btn-xs lg:btn-md btn-primary"
      >
        Create Entry
      </button>
    </div>
  );
}

export function CrudappList() {
  const { accounts, getProgramAccount } = useCrudappProgram();

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>;
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>
          Program account not found. Make sure you have deployed the program and
          are on the correct cluster.
        </span>
      </div>
    );
  }
  return (
    <div className={"space-y-6"}>
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data?.map((account) => (
            <CrudappCard
              key={account.publicKey.toString()}
              account={account.publicKey}
            />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={"text-2xl"}>No journal entry</h2>
          No journal entry found. Create one above to get started.
        </div>
      )}
    </div>
  );
}

function CrudappCard({ account }: { account: PublicKey }) {
  const { accountQuery, updateEntry, deleteEntry } = useCrudappProgramAccount({
    account,
  });

  const { publicKey } = useWallet();

  const [message, setMessage] = useState("");
  const title = accountQuery.data?.title;

  const isFormValid = message.trim() && title != undefined;

  const handleSubmit = async () => {
    if (publicKey && isFormValid) {
      updateEntry.mutateAsync({ title, message });
    }
  };

  if (!publicKey) {
    return (
      <div className="alert alert-warning">
        <span>Connect a wallet to create an entry.</span>
      </div>
    );
  }

  return accountQuery.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <div className="card card-boarded boder-size-300 border-4 text-neutral-content">
      <div className="card-body">
        <div className="flex justify-between">
          <h2 className="card-titlen" onClick={() => accountQuery.refetch()}>
            {accountQuery.data?.title}
          </h2>
          <p>{accountQuery.data?.message}</p>
        </div>
        <div className="card-actions">
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input input-bordered w-full max-w-xs"
          />
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || updateEntry.isPending}
            className="btn btn-xs lg:btn-md btn-primary"
          >
            Update Entry
          </button>
          <button
            onClick={() =>
              accountQuery.data?.title &&
              deleteEntry.mutateAsync(accountQuery.data.title)
            }
            disabled={deleteEntry.isPending || !accountQuery.data?.title}
            className="btn btn-xs lg:btn-md btn-error"
          >
            Delete Entry
          </button>
        </div>
      </div>
    </div>
  );
}
