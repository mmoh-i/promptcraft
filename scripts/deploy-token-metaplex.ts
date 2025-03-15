// import { Connection, Keypair } from "@solana/web3.js"
// import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token"
// import { Metaplex } from "@metaplex-foundation/js"
// import { KeypairIdentityDriver, keypairIdentity } from "@metaplex-foundation/js"

// // Replace with your actual private key and RPC endpoint
// const PRIVATE_KEY = process.env.PRIVATE_KEY ? Uint8Array.from(Buffer.from(process.env.PRIVATE_KEY, 'base64')) : new Uint8Array();
// const RPC_ENDPOINT = "https://api.testnet.sonic.game"

// // Metadata for the Prompt Craft token
// const tokenMetadata = {
//   name: "Prompt Craft Gaming",
//   symbol: "PCG",
//   uri: "https://github.com/mmoh-i/t2c_images/blob/main/pcg.json",
//   decimals: 9, // Using 9 decimals which is standard for Solana tokens
//   initialSupply: 1_000_000, // 1 million tokens
// }

// async function deployPromptCraftToken() {
//   try {
//     console.log("Initializing connection to Solana...")

//     // Connect to the Sonic SVM network
//     const connection = new Connection(RPC_ENDPOINT, "confirmed")

//     // Create a keypair from the private key
//     const payerKeypair = Keypair.fromSecretKey(PRIVATE_KEY)

//     console.log("Deploying Prompt Craft token...")

//     // Create a new token mint
//     const tokenMint = await createMint(
//       connection,
//       payerKeypair,
//       payerKeypair.publicKey, // Mint authority
//       payerKeypair.publicKey, // Freeze authority
//       tokenMetadata.decimals,
//     )

//     console.log("Token mint created:", tokenMint.toBase58())

//     // Create an associated token account for the payer
//     const tokenAccount = await getOrCreateAssociatedTokenAccount(
//       connection,
//       payerKeypair,
//       tokenMint,
//       payerKeypair.publicKey,
//     )

//     console.log("Token account created:", tokenAccount.address.toBase58())

//     // Mint the initial supply to the payer's account
//     const initialSupplyWithDecimals = tokenMetadata.initialSupply * 10 ** tokenMetadata.decimals
//     await mintTo(
//       connection,
//       payerKeypair,
//       tokenMint,
//       tokenAccount.address,
//       payerKeypair, // Mint authority
//       initialSupplyWithDecimals,
//     )

//     console.log(`Minted ${tokenMetadata.initialSupply} tokens to ${tokenAccount.address.toBase58()}`)

//     // Initialize Metaplex
//     const metaplex = Metaplex.make(connection).use(keypairIdentity(payerKeypair))

//     // Create token metadata
//     console.log("Creating token metadata...")
//     const { nft } = await metaplex.nfts().create({
//       uri: tokenMetadata.uri,
//       name: tokenMetadata.name,
//       sellerFeeBasisPoints: 0,
//       symbol: tokenMetadata.symbol,
//       // Remove mintAddress if it's not valid
//       // Remove tokenStandard if it's not needed
//     })

//     console.log("Token metadata created:", nft.address.toBase58())
//     console.log("Token deployment complete!")

//     return {
//       tokenMintAddress: tokenMint.toBase58(),
//       tokenAccountAddress: tokenAccount.address.toBase58(),
//       metadataAddress: nft.address.toBase58(),
//     }
//   } catch (error) {
//     console.error("Error deploying token:", error)
//     throw error
//   }
// }

// // Execute the deployment
// deployPromptCraftToken()
//   .then((result) => {
//     console.log("Deployment successful!")
//     console.log("Token Mint Address:", result.tokenMintAddress)
//     console.log("Token Account Address:", result.tokenAccountAddress)
//     console.log("Metadata Address:", result.metadataAddress)
//     console.log("Update the TOKEN_MINT_ADDRESS in your token-service.ts with this value")
//   })
//   .catch((error) => {
//     console.error("Deployment failed:", error)
//   })

