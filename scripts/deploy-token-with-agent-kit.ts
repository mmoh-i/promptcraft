import { SolanaAgentKit } from "solana-agent-kit"
import { ChatGroq } from "@langchain/groq";
import { Keypair } from "@solana/web3.js"
import bs58 from "bs58"

// Replace with your actual private key and RPC endpoint
const PRIVATE_KEY = process.env.PRIVATE_KEY ? Uint8Array.from(Buffer.from(process.env.PRIVATE_KEY, 'base64')) : new Uint8Array();
const RPC_ENDPOINT = "https://api.testnet.sonic.game"; 

// Convert the private key to a base58 string
const privateKeyBase58 = bs58.encode(PRIVATE_KEY)

// Create a keypair from the private key
const payerKeypair = Keypair.fromSecretKey(PRIVATE_KEY);

// Metadata for the Prompt Craft token
const tokenMetadata = {
  name: "Prompt Craft Gaming",
  symbol: "PCG",
  uri: "https://github.com/mmoh-i/t2c_images/blob/main/pcg.json",
  decimals: 9, // Using 9 decimals which is standard for Solana tokens
  initialSupply: 1_000_000, // 1 million tokens
}

async function deployPromptCraftToken() {
  try {
    console.log("Initializing Solana Agent Kit...")

    // Initialize the Solana Agent Kit with the base58 private key and RPC endpoint
    
    const agent = new SolanaAgentKit(
      privateKeyBase58,
      RPC_ENDPOINT,
      process.env.GROQ_API_KEY || null // Pass the API key directly
    )

    console.log("Deploying Prompt Craft token with the following metadata:")
    console.log(`Name: ${tokenMetadata.name}`)
    console.log(`Symbol: ${tokenMetadata.symbol}`)
    console.log(`URI: ${tokenMetadata.uri}`)
    console.log(`Decimals: ${tokenMetadata.decimals}`)
    console.log(`Initial Supply: ${tokenMetadata.initialSupply}`)

    // Deploy the token using the agent kit
    const result = await agent.deployToken(
      tokenMetadata.name,
      tokenMetadata.uri,
      tokenMetadata.symbol,
      tokenMetadata.decimals,
      {
        mintAuthority: payerKeypair.publicKey,
        freezeAuthority: payerKeypair.publicKey
      }
    )

    const mintAddress = result.mint.toString()

    console.log("Token deployment successful!")
    console.log("Token Mint Address:", mintAddress)
    console.log("Update the TOKEN_MINT_ADDRESS in your token-service.ts with this value")

    return {
      tokenMintAddress: mintAddress,
    }
  } catch (error) {
    console.error("Error deploying token:", error)
    throw error
  }
}

// Execute the deployment
deployPromptCraftToken()
  .then((result) => {
    console.log("Deployment complete!")
    console.log("Token Mint Address:", result.tokenMintAddress)
  })
  .catch((error) => {
    console.error("Deployment failed:", error)
  })

