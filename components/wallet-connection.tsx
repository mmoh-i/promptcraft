"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { WalletIcon } from "lucide-react"

// This should be moved to a server-side environment variable in production
const PRIVATE_KEY = process.env.PRIVATE_KEY ? Uint8Array.from(Buffer.from(process.env.PRIVATE_KEY, 'base64')) : new Uint8Array();

export type WalletContextType = {
  connected: boolean
  publicKey: string | null
  connect: () => Promise<void>
  disconnect: () => void
  sendToken: (amount: number) => Promise<string | null>
}

export function WalletConnection() {
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if wallet was previously connected
    const savedWallet = localStorage.getItem("connectedWallet")
    if (savedWallet) {
      setPublicKey(savedWallet)
      setConnected(true)
    }
  }, [])

  const connect = async () => {
    try {
      setConnecting(true)

      // Check if Phantom wallet is installed
      const provider = window.solana

      if (!provider) {
        toast({
          title: "Wallet not found",
          description: "Please install Phantom wallet extension",
          variant: "destructive",
        })
        return
      }

      // Connect to wallet
      await provider.connect()

      const publicKey = provider.publicKey.toString()
      setPublicKey(publicKey)
      setConnected(true)

      // Save connection state
      localStorage.setItem("connectedWallet", publicKey)

      toast({
        title: "Wallet connected",
        description: `Connected to ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`,
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    try {
      window.solana?.disconnect()
      setConnected(false)
      setPublicKey(null)
      localStorage.removeItem("connectedWallet")
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected",
      })
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    }
  }

  return (
    <div className="flex items-center justify-center">
      {!connected ? (
        <Button
          onClick={connect}
          disabled={connecting}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {connecting ? (
            <>Connecting...</>
          ) : (
            <>
              <WalletIcon className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="px-4 py-2 bg-gray-700 rounded-lg text-sm">
            {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
          </div>
          <Button variant="outline" size="sm" onClick={disconnect} className="text-xs">
            Disconnect
          </Button>
        </div>
      )}
    </div>
  )
}

