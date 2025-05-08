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

// Single profile detail page
export function ProfileDetailFeature() {
  const { profileId } = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const [showUpdateBioForm, setShowUpdateBioForm] = useState(false);

  const profilePubkey = useMemo(() => {
    try {
      return new PublicKey(profileId as string);
    } catch (error) {
      return undefined;
    }
  }, [profileId]);


  const {
    program,
    programId,
    giveLike,
    updateProfileBio,
    pauseProfile,
    withdrawLikes,
    deleteProfile,
  } = useSecretProgram();


  const { profileQuery, likesQuery, vaultBalanceQuery } =
    useSecretProgramAccount(profilePubkey);

  // Check if the user is the authority of this profile
  const isAuthority = useMemo(() => {
    if (!publicKey || !profileQuery.data) return false;
    return profileQuery.data.authority.toString() === publicKey.toString();
  }, [publicKey, profileQuery.data]);

  // Handle actions
  const handleLike = async (data: { amount: number }) => {
    await giveLike.mutateAsync({
      profile: profileId as string,
      amount: data.amount,
    });
  };

  const handleUpdateprofileBio = async (data: { bio: string }) => {
    await updateProfileBio.mutateAsync({
      profile: profileId as string,
      bio: data.bio,
    });
    setShowUpdateBioForm(false);
  };

  const handlePauseToggle = async (paused: boolean) => {
    await pauseProfile.mutateAsync({
      profile: profileId as string,
      paused,
    });
  };

  const handleWithdrawLikes = async (data: {
    recipient: string;
    amount: number;
  }) => {
    await withdrawLikes.mutateAsync({
      profile: profileId as string,
      recipient: data.recipient,
      amount: data.amount,
    });
  };

  const handleProfileDelete = async () => {
    await deleteProfile.mutateAsync({
      profile: profileId as string,
      recipient: publicKey?.toString() || "",
    });
    router.push("/profile");
  };

  // Loading and error states
  if (profileQuery.isLoading || likesQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (profileQuery.error) {
    return (
      <EmptyState
        message="Error loading profile. The profile may not exist or has been deleted."
        icon={Icons.AlertCircle}
      />
    );
  }

  if (!profileQuery.data) {
    return <EmptyState message="Profile not found" icon={Icons.Search} />;
  }

  const profile = profileQuery.data;
  const likes = likesQuery.data || [];
  const vaultBalance = vaultBalanceQuery.data || 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <Icons.ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Profiles
        </Link>
      </div>

      {/* Profile detail section */}
      <ProfileDetails
        profile={profile}
        likes={likes}
        vaultBalance={vaultBalance}
        isAuthority={isAuthority}
        onPauseToggle={handlePauseToggle}
        onWithdraw={handleWithdrawLikes}
        onDelete={handleProfileDelete}
      />

      {/* Update profile form for authority */}
      {isAuthority && showUpdateBioForm && (
        <ProfileCard className="mt-6">
          <h3 className="text-lg font-semibold mb-4">
            Update Profile Bio
          </h3>
          <UpdateProfileBioForm
            profile={profileId as string}
            currentProfileBio={profile.bio}
            onSubmit={handleUpdateprofileBio}
          />
          <button
            onClick={() => setShowUpdateBioForm(false)}
            className="w-full mt-2 text-gray-600 text-sm"
          >
            Cancel
          </button>
        </ProfileCard>
      )}

      {/* Update button for authority */}
      {isAuthority && !showUpdateBioForm && (
        <button
          onClick={() => setShowUpdateBioForm(true)}
          className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
        >
          <Icons.Edit className="mr-2 h-4 w-4" />
          Update Bio
        </button>
      )}

      {/* Like form for non-paused profiles */}
      {publicKey && !profile.paused && !isAuthority && (
        <ProfileCard className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Make a Like</h3>
          <GiveLikeForm profile={profileId as string} onSubmit={handleLike} />
        </ProfileCard>
      )}

      {/* Profile paused notification */}
      {profile.paused && (
        <div className="mt-6 p-6 bg-yellow-50 rounded-lg border border-yellow-100 text-center">
          <Icons.Pause className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Profile is paused
          </h3>
          <p className="text-gray-600">
            The profile has been temporarily paused.
          </p>
        </div>
      )}

      {/* Wallet connect prompt */}
      {!publicKey && !profile.paused && (
        <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-100 text-center">
          <Icons.Wallet className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect Your Wallet to Like
          </h3>
          <p className="text-gray-600 mb-4">
            You need to connect your wallet to make likes to this profile.
          </p>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors">
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
 }

// My Likes History Feature
export function MyLikesFeature() {
  const { publicKey } = useWallet();
  const { getMyLikes } = useSecretProgram();
  const router = useRouter();

  // If user not connected, redirect or show message
  if (!publicKey) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 text-center">
        <Icons.Wallet className="mx-auto h-16 w-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 mb-6">
          Please connect your wallet to view your likes history.
        </p>
        <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors">
          Connect Wallet
        </button>
      </div>
    );
  }

  if (getMyLikes.isLoading) {
    return <LoadingSpinner />;
  }

  const likes = getMyLikes.data || [];


  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Link
          href="/charity"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <Icons.ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Profiles
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        My Likes History
      </h1>

      {likes.length === 0 ? (
        <EmptyState
          message="You haven't made any like yet."
          icon={Icons.Heart}
        />
      ) : (
        <ProfileCard>
          <div className="overflow-hidden border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Profile
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {likes
                  .slice()
                  .reverse()
                  .map((like) => (
                    <tr key={like.publicKey.toString()}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {like.profileName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-green-600">
                        {formatSol(like.likesInLamports)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(like.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() =>
                            router.push(
                              `/profile/${like.profileKey.toString()}`
                            )
                          }
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>


          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Likes Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-md border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {formatSol(
                    likes.reduce(
                      (sum, d) => sum + Number(d.likesInLamports || 0),
                      0
                    )
                  )}
                </div>
                <div className="text-sm text-gray-500">Total Liked</div>
              </div>
              <div className="p-4 bg-white rounded-md border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">
                  {likes.length}
                </div>
                <div className="text-sm text-gray-500">Total Likes</div>
              </div>
            </div>
          </div>
        </ProfileCard>
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
