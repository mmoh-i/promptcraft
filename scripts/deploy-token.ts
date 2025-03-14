// This script deploys the Prompt Craft token on Sonic SVM
// Run this script once to create the token
//it works sha

import { Connection, Keypair } from "@solana/web3.js"
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token"

// Replace with your actual private key and RPC endpoint
const PRIVATE_KEY = new Uint8Array([
  162, 175, 150, 113, 171, 222, 139, 119, 254, 129, 206, 209, 49, 209, 178, 90, 209, 233, 45, 168, 121, 177, 19, 42,
  183, 61, 31, 79, 214, 161, 46, 204, 105, 231, 157, 104, 168, 87, 28, 186, 118, 167, 133, 202, 34, 217, 201, 16, 191,
  21, 66, 70, 93, 159, 201, 248, 3, 79, 85, 144, 252, 117, 64, 198,
])
const RPC_ENDPOINT = "https://api.testnet.sonic.game"

async function deployToken() {
  try {
    // Connect to the Sonic SVM network
    const connection = new Connection(RPC_ENDPOINT, "confirmed")

    // Create a keypair from the private key
    const payerKeypair = Keypair.fromSecretKey(PRIVATE_KEY)

    console.log("Deploying Prompt Craft token...")

    // Create a new token mint
    const tokenMint = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey, // Mint authority
      payerKeypair.publicKey, // Freeze authority
      9, // 9 decimals is standard for Solana tokens
    )

    console.log("Token mint created:", tokenMint.toBase58())

    // Create an associated token account for the payer
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      tokenMint,
      payerKeypair.publicKey,
    )

    console.log("Token account created:", tokenAccount.address.toBase58())

    // Mint some initial tokens to the payer's account
    // This will be the supply used for rewards
    const initialSupply = 1000000 * 10 ** 9 // 1 million tokens with 9 decimals
    await mintTo(
      connection,
      payerKeypair,
      tokenMint,
      tokenAccount.address,
      payerKeypair, // Mint authority
      initialSupply,
    )

    console.log(`Minted ${initialSupply / 10 ** 9} tokens to ${tokenAccount.address.toBase58()}`)
    console.log("Token deployment complete!")

    // Return the token mint address to be used in the application
    return {
      tokenMintAddress: tokenMint.toBase58(),
      tokenAccountAddress: tokenAccount.address.toBase58(),
    }
  } catch (error) {
    console.error("Error deploying token:", error)
    throw error
  }
}

// Execute the deployment
deployToken()
  .then((result) => {
    console.log("Deployment successful!")
    console.log("Token Mint Address:", result.tokenMintAddress)
    console.log("Token Account Address:", result.tokenAccountAddress)
    console.log("Update the TOKEN_MINT_ADDRESS in your token-service.ts with this value")
  })
  .catch((error) => {
    console.error("Deployment failed:", error)
  })

