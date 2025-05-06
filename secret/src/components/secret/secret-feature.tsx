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

// Main page with profile list and create form
export function ProfileListFeature() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my" | "likes">("all");

  const { getAllProfiles, getMyLikes, createProfile } =
    useSecretProgram();

  // Filter likes to group by profile and get unique profiles
  const likedProfiles = useMemo(() => {
    if (!getMyLikes.data) return [];

    // Group likes by profile
    const profileMap = new Map();
    getMyLikes.data.forEach((like) => {
      const profileKey = like.profileKey.toString();
      if (!profileMap.has(profileKey)) {
        profileMap.set(profileKey, {
          publicKey: like.profileKey,
          name: like.profileName,
          totalLiked: 0,
          count: 0,
        });
      }
      const profile = profileMap.get(profileKey);
      profile.totalLiked += Number(like.likesInLamports || 0);
      profile.count += 1;
    });

    return Array.from(profileMap.values());
  }, [getMyLikes.data]);

  const handleCreateProfile = async (data: CreateProfileArgs) => {
    await createProfile.mutateAsync(data);
    setShowCreateForm(false);
  };

  const navigateToProfile = (publicKey: PublicKey): void => {
    router.push(`/profile/${publicKey.toString()}`);
  };

  // Determine which data to show based on active tab
  const isLoading =
    (activeTab === "all" && getAllProfiles.isLoading) ||
    (activeTab === "my" && getMyLikes.isLoading) ||
    (activeTab === "likes" && getMyLikes.isLoading);


  const profiles = useMemo(() => {
    if (activeTab === "all") return getAllProfiles.data || [];
    if (activeTab === "my") return getMyLikes.data || [];
    if (activeTab === "likes") return likedProfiles;
    return [];
  }, [activeTab, getAllProfiles.data, getMyLikes.data, likedProfiles]);


  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Solana Dating DApp
          </h1>
          <p className="text-gray-300 mb-4">
            Like and Match
          </p>
        </div>


        {publicKey && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            {showCreateForm ? (
              <>
                <Icons.X className="mr-2 h-5 w-5" />
                Cancel
              </>
            ) : (
              <>
                <Icons.Plus className="mr-2 h-5 w-5" />
                Create Profile
              </>
            )}
          </button>
        )}
      </div>

      {/* Create Profile Form */}
      {showCreateForm && (
        <ProfileCard className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Charity</h2>
          <CreateProfileForm onSubmit={handleCreateProfile} />
        </ProfileCard>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Profiles
          </button>

          {publicKey && (
            <>
              <button
                onClick={() => setActiveTab("my")}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "my"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                My Profiles
              </button>

              <button
                onClick={() => setActiveTab("likes")}
                className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "likes"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Like to
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Content based on selected tab */}
      {isLoading ? (
        <LoadingSpinner />
      ) : profiles.length === 0 ? (
        <EmptyState
          message={
            activeTab === "all"
              ? "No charities created yet. Be the first to create one!"
              : activeTab === "my"
              ? "You haven't created any charities yet."
              : "You haven't donated to any charities yet."
          }
          icon={activeTab === "likes" ? Icons.Heart : Icons.HandHeart}
        />
      ) : (
        <div>
          {profiles.map((profile) => (
            <ProfileSummary
              key={profile.publicKey.toString()}
              profile={profile}
              isAuthority={activeTab === "my"}
              onClick={() => navigateToProfile(profile.publicKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
 }

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
