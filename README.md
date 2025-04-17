# Love meets blockchain ❤️‍🔥🔗

Welcome to Super Secret, a privacy-conscious, decentralized dating app built with Anchor on the Solana blockchain. This DApp lets users create profiles, like each other, and receive small SOL rewards when mutual interests are formed — all powered by smart contracts.

🚧 This project is under construction and wrapped in layers of super secret magic. Expect surprises. Maybe even romance.

## 🚀 Features (User Experience)

Sign a transaction to create an account.

Store photo on IPFS.

🔍 Browse & Swipe
Fetch a list of profiles from the chain.

Optionally filter (age, interests, location, etc.).

💚 Like/Pass
Send a tx to create a Like account.

If a Like already exists in reverse → auto-create a Match!

💬 Chat (Optional v1: Off-chain)
Use the match PDA as a shared chat room key.

Store messages in a private chat service (or eventually, encrypted on-chain?).

🎉 Matches Page
Fetch all Match accounts involving you.

Display other user's info.

🔒 Privacy & Security Ideas
Encrypt profile fields using the viewer's public key.

Zero-knowledge likes?

Prevent bots: stake small SOL amount or NFT gate

🌐 Social Layer
Add reputation (like “verified” users)

NFT badges for community roles or milestones

🛠 Tech Stack Ideas
Solana + Anchor for on-chain logic

Next.js + Tailwind for frontend

React Query / Jotai for state + async

IPFS for user images

Phantom Wallet for login

Anchor Bankrun for testing local logic

Program Tests with Mocha + Chai or Anchor’s native test runner
