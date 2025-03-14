"use client"

import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token"

// This should be moved to a server-side environment variable in production
const PRIVATE_KEY = process.env.PRIVATE_KEY ? Uint8Array.from(Buffer.from(process.env.PRIVATE_KEY, 'base64')) : new Uint8Array();
const RPC_ENDPOINT = "https://api.testnet.sonic.game"

const TOKEN_MINT_ADDRESS = "EvLH6ykAsa4o4KpEjuY22vcgTnvpZhutirqfj5PgVoCz"

// Create a record of users who have received rewards
const rewardedUsers = new Map<string, boolean>()

export async function sendTokenReward(recipientAddress: string, amount: number): Promise<string> {
  try {
    // Connect to the Sonic SVM network
    const connection = new Connection(RPC_ENDPOINT, "confirmed")

    // Create a keypair from the private key
    const payerKeypair = Keypair.fromSecretKey(PRIVATE_KEY)

    // Convert recipient address string to PublicKey
    const recipientPublicKey = new PublicKey(recipientAddress)
    const mintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS)

    console.log(`Sending ${amount} PCG tokens to ${recipientAddress}`)

    // Get the source token account (payer's account)
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      payerKeypair.publicKey,
    )

    // Get or create the destination token account (recipient's account)
    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      mintPublicKey,
      recipientPublicKey,
    )

    // Transfer tokens
    const signature = await transfer(
      connection,
      payerKeypair,
      sourceTokenAccount.address,
      destinationTokenAccount.address,
      payerKeypair.publicKey,
      amount * 10 ** 9, // Convert to raw token amount with 9 decimals
    )

    // Record that this user has received a reward
    rewardedUsers.set(recipientAddress, true)

    return signature
  } catch (error) {
    console.error("Error sending token reward:", error)
    throw error
  }
}

// Check if a user has already received a reward
export async function hasUserReceivedReward(userAddress: string): Promise<boolean> {
  try {
    // Check our local record first
    if (rewardedUsers.has(userAddress)) {
      return true
    }

    

    
    return false
  } catch (error) {
    console.error("Error checking reward status:", error)
    return false
  }
}

