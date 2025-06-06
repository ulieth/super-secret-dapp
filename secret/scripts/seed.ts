/**
 * Seed Script
 *
 * This script creates test profiles from different wallets for frontend testing.
 * It uses the Anchor framework and Solana web3.js to interact with your deployed
 * Secret program on a local Solana validator.
 *
 * Usage:
 *   - Run without arguments to create profile and make test donations
 *   - Run with --delete to remove all created profiles
 *   - Run with --fund "Profile Name" --amount 2.5 to give sol to a specific profile
 *   - Run with --fund "Profile Name" --amount 2.5 --authority <pubkey> to give sol to an external profile
 *
 * Example:
 *   - npm run seed                                                            - Create profile and make test donations
 *   - npm run seed -- --delete                                                - Delete all created profiles
 *   - npm run seed -- --fund "Profile Name"                                   - Donate 1 SOL to a specific profile
 *   - npm run seed -- --fund "Profile Name" --amount 2.5                      - Donate 2.5 SOL to a specific profile
 *   - npm run seed -- --fund "Profile Name" --amount 2.5 --authority <pubkey> - Donate to an external profile
 */
