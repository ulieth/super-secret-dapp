'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useState, useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import {
 useSecretProgram,
 useSecretProgramAccount,
 useLikeAccount,
 findProfilePda,
 findVaultPda,
 CreateProfileArgs,
} from "./secret-data-access";
import {
 ProfileCard,
 ProfileSummary,
 ProfileDetails,
 CreateProfileForm,
 GiveLikeForm,
 UpdateProfileBioForm,
 LikesSummary,
 EmptyState,
 LoadingSpinner,
 formatSol,
 formatTime,
 truncateAddress,
} from "./secret-ui";

export default function SecretFeature() {
  const { publicKey } = useWallet()
  const { programId } = useSecretProgram()

  return publicKey ? (
    <div>
      <AppHero
        title={<span className="text-rose-500 text-4xl font-bold">Secret</span>}
        subtitle={
            'Create your profile and find your blockchain soulmate'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <CreateProfileForm onSubmit={function (data: CreateProfileArgs): void {
          throw new Error('Function not implemented.')
        } } />
      </AppHero>
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}
