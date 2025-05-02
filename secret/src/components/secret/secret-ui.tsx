'use client'

import { Keypair, PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import { ellipsify } from '../ui/ui-layout';
import { ExplorerLink } from '../cluster/cluster-ui';
import { useSecretProgram, useSecretProgramAccount } from './secret-data-access';
import { useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { useForm } from "react-hook-form";
import * as Icons from "lucide-react";
import { Heart } from 'lucide-react';
import { formatDistanceToNow } from "date-fns";
import {
  CreateProfileArgs,
  UpdateProfileBioArgs,
  GiveLikeArgs,
 } from "./secret-data-access";

// Reusable card component for consistent styling
export function ProfileCard({
  children,
  className = "",
 }: {
  children: React.ReactNode;
  className?: string;
 }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}

// Empty state component
export function EmptyState({
  message,
  icon: Icon = Icons.AlertCircle,
 }: {
  message: string;
  icon?: any;
 }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
      <Icon className="w-12 h-12 mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );
}


// Create Profile Form
export function CreateProfileForm({
  onSubmit,
 }: {
  onSubmit: (data: CreateProfileArgs) => void;
 }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateProfileArgs>();
  const onFormSubmit = (data: CreateProfileArgs) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="profile name"
          className="block text-sm font-medium text-rose-500 mb-1"
        >
          Profile Name
        </label>
        <input
          id="name"
          type="text"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.profile_name ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter your profile name"
          {...register("profile_name", { required: "Your profile name is required" })}
        />
        {errors.profile_name && (
          <p className="mt-1 text-sm text-red-500">{errors.profile_name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-rose-500 mb-1"
        >
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.bio ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Describe yourself in few words"
          {...register("bio", {
            required: "Your bio is required",
            maxLength: {
              value: 100,
              message: "Your bio cannot exceed 100 characters",
            },
          })}
        />
        {errors.bio && (
          <p className="mt-1 text-sm text-red-500">
            {errors.bio.message}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="gender"
          className="block text-sm font-medium text-rose-500 mb-1"
        >
          Gender
        </label>
        <textarea
          id="gender"
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.gender ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="What is your gender?"
          {...register("gender", { required: "You must tell your gender"})}
        />
        {errors.gender && (
          <p className="mt-1 text-sm text-red-500">
            {errors.gender.message}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="looking for"
          className="block text-sm font-medium text-rose-500 mb-1"
        >
          Looking for...
        </label>
        <textarea
          id="looking for"
          rows={4}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.gender ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="What are you looking for?"
          {...register("looking_for", { required: "You must tell what are you looking for"})}
        />
        {errors.looking_for && (
          <p className="mt-1 text-sm text-red-500">
            {errors.looking_for.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-1/2 mx-auto flex items-center justify-center gap-2 py-2 px-4 bg-rose-500 hover:bg-rose-700 text-white font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
      {isSubmitting ? (
      <>
        <span>Creating...</span>
        <Icons.Loader2 className="animate-spin h-4 w-4" />
      </>
      ) : (
      <>
        <Heart className="h-4 w-4 text-white" />
        <span>Create Profile</span>
      </>
      )}
      </button>
    </form>
  );
}
