'use client'

import { getSecretProgram, getSecretProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'

export interface CreateProfileArgs {
  profile_name: string,
  bio: string,
  gender: string,
  looking_for: string,
  avatar_uri: string,
}

export interface UpdateProfileBioArgs {
  bio: string,
  profile: string,
}

export interface GiveLikeArgs {
  profile: string,
  amount: number,
}

export interface PauseProfileArgs {
  profile: string;
  paused: boolean;
}

export interface WithdrawLikesArgs {
  profile: string;
  recipient: string;
  amount: number;
}

export interface DeleteProfileArgs {
  profile: string,
  recipient: string,
}

export function useSecretProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSecretProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSecretProgram(provider, programId), [provider, programId])
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();

  const accounts = useQuery({
    queryKey: ['profile', 'all', { cluster }],
    queryFn: () => program.account.profile.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createProfile = useMutation<string, Error, CreateProfileArgs>({
    mutationKey: ["profile", "create", { cluster }],
    mutationFn: async ({profile_name, bio, gender, looking_for, avatar_uri}) => {
      if (!publicKey) throw new Error("Wallet not connected")
      try {
        return await program.methods
        .createProfile(profile_name, bio, gender, looking_for, avatar_uri)
        .accounts({ authority: publicKey })
        .rpc();
      } catch (error) {
        console.log("Error creating profile account:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success("Profile created successfully");
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(`Failed to create profile: ${error}`),
  });

  const updateProfileBio = useMutation<string, Error, UpdateProfileBioArgs>({
    mutationKey: ["profile", "update", { cluster }],
    mutationFn: async ({bio, profile}) => {
      if (!publicKey) throw new Error("Wallet not connected")
      try {
        return await program.methods
        .updateProfileBio(bio)
        .accounts({
          authority: publicKey,
          profile: new PublicKey(profile)
         })
        .rpc();
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success("Profile updated successfully!");
      return queryClient.invalidateQueries({ queryKey: ["profile"] });

    },
    onError: (error) => toast.error(`Failed to update profile: ${error}`),
  });

  const giveLike = useMutation<string, Error, GiveLikeArgs>({
    mutationKey: ["giveLike", "create", {cluster}],
    mutationFn: async ({profile, amount}) => {
      if (!publicKey) throw new Error("Wallet not connected")
      try {
        return await program.methods
        .giveLike(new BN(amount))
        .accounts({
          liker: publicKey,
          profile: new PublicKey(profile)
        })
        .rpc();
      } catch (error) {
        console.error("Error sending like to profile:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success("Like sent successfully!");
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["giveLike"] }),
      ]);
    },
    onError: (error) => toast.error(`Failed to give like: ${error}`),
  });

  const pauseProfile = useMutation<string, Error, PauseProfileArgs>({
    mutationKey: ["profile", "pause", { cluster }],
    mutationFn: async ({ profile, paused }) => {
      try {
        return program.methods
          .pauseProfile(paused)
          .accounts({
            authority: publicKey,
            profile: new PublicKey(profile),
          })
          .rpc();
      } catch (error) {
        console.error("Error pausing profile:", error);
        throw error;
      }
    },
    onSuccess: (signature, { paused }) => {
      transactionToast(signature);
      toast.success(
        `Profile ${paused ? "paused" : "unpaused"} successfully!`
      );
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(`Failed to update pause status: ${error}`),
  });

  const withdrawLikes = useMutation<string, Error, WithdrawLikesArgs>({
    mutationKey: ["profile", "withdraw", { cluster }],
    mutationFn: async ({ profile, recipient, amount }) => {
      try {
        return program.methods
          .withdrawLikes(new BN(amount))
          .accounts({
            profile: new PublicKey(profile),
            recipient: new PublicKey(recipient),
          })
          .rpc();
      } catch (error) {
        console.error("Error withdrawing likes:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success("Likes withdrawn successfully!");
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(`Failed to withdraw likes: ${error}`),
  });

  const deleteProfile = useMutation<string, Error, DeleteProfileArgs>({
    mutationKey: ["profile", "delete", {cluster}],
    mutationFn: async ({profile, recipient}) => {
      if (!publicKey) throw new Error("Wallet not connected");
      try {
        return program.methods
          .deleteProfile()
          .accounts({
            profile: new PublicKey(profile),
            recipient: new PublicKey(recipient)
          } as any) // Cast to `any` to bypass TypeScript warning
          .rpc();
      } catch (error) {
        console.error("Error deleting profile:", error);
        throw error;
      }
    },
    onSuccess: (signature) => {
      transactionToast(signature);
      toast.success("Profile deleted successfully!");
      return queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast.error(`Failed to delete profile: ${error}`),
  });



  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createProfile,
  }
}

export function useSecretProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useSecretProgram()

  const accountQuery = useQuery({
    queryKey: ['profile', 'fetch', { cluster, account }],
    queryFn: () => program.account.profile.fetch(account),
  })

}
