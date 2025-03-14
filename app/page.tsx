"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2, RefreshCw, Zap, Trophy } from "lucide-react"
import { WalletConnection } from "@/components/wallet-connection"
import { sendTokenReward, hasUserReceivedReward } from "@/services/token-service"
import { useToast } from "@/components/ui/use-toast"

type ContentType = "image" | "text"

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  })
  clearTimeout(id)
  return response
}

export default function Home() {
  const [generationType, setGenerationType] = useState<ContentType | null>(null)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [userPrompt, setUserPrompt] = useState("")
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [rewardSent, setRewardSent] = useState(false)
  const [rewardTxId, setRewardTxId] = useState<string | null>(null)
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null)
  const { toast } = useToast()

  const apiBaseUrl = "https://multiagent.aixblock.io/api/v1"

  useEffect(() => {
    // Check if wallet is connected from localStorage
    const savedWallet = localStorage.getItem("connectedWallet")
    if (savedWallet) {
      setWalletPublicKey(savedWallet)
    }
  }, [])

  useEffect(() => {
    if (generationType && !generatedContent && !isGenerating && gameStarted) {
      generateContent()
    }
  }, [generationType, generatedContent, isGenerating, gameStarted])

  // Listen for wallet connection events
  useEffect(() => {
    const handleWalletConnection = (event: CustomEvent) => {
      setWalletPublicKey(event.detail.publicKey)
    }

    window.addEventListener("walletConnected" as any, handleWalletConnection)
    return () => {
      window.removeEventListener("walletConnected" as any, handleWalletConnection)
    }
  }, [])

  const pollTaskResult = async (taskId: string): Promise<any> => {
    const maxAttempts = 15
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetchWithTimeout(`${apiBaseUrl}/session/result/${taskId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Poll attempt ${attempts + 1} failed with status: ${response.status} - ${errorText}`)
          throw new Error(`Failed to fetch task result: ${errorText}`)
        }

        const data = await response.json()
        console.log("Poll response:", data)
        if (data.status === "Completed" && data.result?.task_output) {
          return data.result
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
        attempts++
      } catch (error) {
        console.error("Polling error:", error)
        throw error
      }
    }
    throw new Error("Task did not complete within expected time after 15 attempts")
  }

  const generateContent = async () => {
    setIsGenerating(true)
    setGeneratedContent(null)
    setEvaluationScore(null)
    setUserPrompt("")
    setTaskId(null)
    setErrorMessage(null)
    setRewardSent(false)
    setRewardTxId(null)

    try {
      const response = await fetchWithTimeout(`${apiBaseUrl}/execute/result/67c1589fdf8f15e1058c90b2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `Generate a random ${generationType}`,
          "image or text": generationType,
          output: "",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Task creation response:", data)
      if (data.Message !== "task created successfully" || !data.Task_id) {
        throw new Error("Unexpected task creation response: " + JSON.stringify(data))
      }

      setTaskId(data.Task_id)
      const result = await pollTaskResult(data.Task_id)
      const generatorResult = result.task_output.find((agent: any) => agent.name === "Generator Agent")?.result

      if (!generatorResult) {
        throw new Error("No generated content found in task output: " + JSON.stringify(result))
      }

      setGeneratedContent(generatorResult)
    } catch (error) {
      console.error("Error generating content:", error)
      setErrorMessage(`Failed to generate ${generationType}: ${error instanceof Error ? error.message : String(error)}`)
      setGeneratedContent(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEvaluating(true)
    setEvaluationScore(null)
    setTaskId(null)
    setErrorMessage(null)
    setRewardSent(false)
    setRewardTxId(null)

    try {
      const response = await fetchWithTimeout(`${apiBaseUrl}/execute/result/67c1589fdf8f15e1058c90b2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `Evaluate how close this prompt is to the provided text: ${userPrompt}`,
          "image or text": generationType,
          output: generatedContent,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("Evaluation task creation response:", data)
      if (data.Message !== "task created successfully" || !data.Task_id) {
        throw new Error("Unexpected task creation response: " + JSON.stringify(data))
      }

      setTaskId(data.Task_id)
      const result = await pollTaskResult(data.Task_id)
      const judgeResult = result.task_output.find((agent: any) => agent.name === "Prompt Judge")?.result

      if (!judgeResult) {
        throw new Error("No evaluation result found in task output: " + JSON.stringify(result))
      }

      console.log("Prompt Judge result:", judgeResult)
      const scoreMatch = judgeResult.match(/accuracy.*?(?:is|score is|score:)\s*(\d+)%/i)
      if (scoreMatch) {
        const score = Number.parseInt(scoreMatch[1]) / 10
        setEvaluationScore(score)

        // Check if score is 8.0 or higher and wallet is connected
        if (score >= 8.0 && walletPublicKey && !rewardSent) {
          try {
            // Check if user has already received a reward
            const hasReward = await hasUserReceivedReward(walletPublicKey)
            if (!hasReward) {
              // Send token reward
              const txId = await sendTokenReward(walletPublicKey, 1)
              setRewardSent(true)
              setRewardTxId(txId)
              toast({
                title: "🎉 Token Reward Sent!",
                description: `You've earned a Prompt Craft token for your excellent prompt!`,
                duration: 5000,
              })
            }
          } catch (error) {
            console.error("Error sending token reward:", error)
            toast({
              title: "Token Reward Failed",
              description: "There was an error sending your token reward. Please try again later.",
              variant: "destructive",
            })
          }
        }
      } else {
        setErrorMessage("Unable to parse accuracy score from result: " + judgeResult)
        setEvaluationScore(null)
      }
    } catch (error) {
      console.error("Error evaluating prompt:", error)
      setErrorMessage(`Failed to evaluate prompt: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsEvaluating(false)
    }
  }

  const startGame = () => {
    setGameStarted(true)
  }

  if (!gameStarted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black text-gray-100">
        <Card className="w-full max-w-3xl shadow-2xl bg-gray-800 border-gray-700">
          <CardHeader className="text-center border-b border-gray-700 pb-6">
            <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              ❯_🅿🆁🅾🅼🅿🆃 🅲🆁🅰🅵🆃
            </CardTitle>
            <CardDescription className="text-lg mt-2 text-gray-200 prompt-font">
              The Game Of Prompts: Generate AI content by playing with prompts 👾!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-200 mb-4">Welcome to Prompt Craft</h2>
              <p className="text-gray-300 mb-6">
                Test your prompt-writing skills and earn tokens for high accuracy scores!
              </p>
              <div className="flex flex-col items-center space-y-6">
                <div className="bg-gray-700/50 p-6 rounded-lg max-w-md">
                  <h3 className="text-xl font-semibold mb-2 text-gray-200">How to Play:</h3>
                  <ol className="list-decimal list-inside text-gray-300 space-y-2 text-left">
                    <li>Connect your Solana wallet</li>
                    <li>Choose between generating text or image</li>
                    <li>Write a prompt that would generate the content you see</li>
                    <li>Get scored on your prompt accuracy</li>
                    <li>Score 80% or higher to earn Prompt Craft tokens!</li>
                  </ol>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <WalletConnection />

                  <Button
                    onClick={startGame}
                    className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2 text-lg"
                  >
                    Start Playing
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-gray-700 pt-6">
            <p className="text-sm text-gray-400">Powered by Sonic SVM on Solana</p>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <Card className="w-full max-w-3xl shadow-2xl bg-gray-800 border-gray-700">
        <CardHeader className="text-center border-b border-gray-700 pb-6">
          <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            ❯_🅿🆁🅾🅼🅿🆃 🅲🆁🅰🅵🆃
          </CardTitle>
          <CardDescription className="text-lg mt-2 text-gray-200 prompt-font">
            The Game Of Prompts: Generate AI content by playing with prompts 👾!
          </CardDescription>
          <div className="mt-4">
            <WalletConnection />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-200">Choose content type:</Label>
            <RadioGroup
              value={generationType || ""}
              onValueChange={(value) => setGenerationType(value as "image" | "text")}
              className="flex justify-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="text" className="sr-only" />
                <Label
                  htmlFor="text"
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all ${
                    generationType === "text" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Text
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="image" className="sr-only" />
                <Label
                  htmlFor="image"
                  className={`px-4 py-2 rounded-full cursor-pointer transition-all ${
                    generationType === "image"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Image
                </Label>
              </div>
            </RadioGroup>
          </div>

          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-4"
              >
                <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                <p className="text-lg font-medium text-gray-300">
                  Generating {generationType} {taskId ? `(Task ID: ${taskId})` : "..."}
                </p>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 text-red-400 bg-red-900/20 rounded-lg"
              >
                {errorMessage}
              </motion.div>
            )}

            {generatedContent && !isGenerating && !errorMessage && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <Label className="text-lg font-semibold text-gray-200">Generated {generationType}:</Label>
                <div className="p-4 border-2 border-gray-600 rounded-lg bg-gray-900">
                  <p className="text-lg whitespace-pre-wrap text-gray-300">{generatedContent}</p>
                </div>

                <form onSubmit={handleEvaluate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userPrompt" className="text-lg font-semibold text-gray-200">
                      Your turn! Write a prompt:
                    </Label>
                    <p className="text-sm text-gray-400">
                      Try to write a prompt that would generate the exact {generationType} you see above. Our AI will
                      score how accurate your prompt is.
                    </p>
                    <Textarea
                      id="userPrompt"
                      placeholder={`Describe the ${generationType} you see as if you were asking an AI to generate it...`}
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="min-h-[100px] text-lg bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isEvaluating || !generatedContent}
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Evaluating {taskId ? `(Task ID: ${taskId})` : "..."}
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Test My Prompt
                      </>
                    )}
                  </Button>
                </form>

                {evaluationScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 border-2 border-gray-600 rounded-lg bg-gradient-to-r from-gray-800 to-gray-700"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                      <h3 className="text-2xl font-bold text-gray-200">Prompt Accuracy Score</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg text-gray-300">How well your prompt matches the given description:</p>
                      <div className="flex items-center justify-between">
                        <div className="w-full bg-gray-600 rounded-full h-4 mr-4">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-purple-500 h-4 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${(evaluationScore / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-2xl font-bold text-blue-400">{evaluationScore.toFixed(1)}/10</span>
                      </div>
                    </div>

                    {evaluationScore >= 8.0 && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-lg border border-yellow-500/30">
                        <div className="flex items-center space-x-3 mb-2">
                          <Trophy className="h-6 w-6 text-yellow-400" />
                          <h4 className="text-xl font-bold text-yellow-300">Token Reward Eligible!</h4>
                        </div>
                        <p className="text-gray-300 mb-2">
                          Congratulations! Your high score qualifies you for a Prompt Craft token reward.
                        </p>

                        {rewardSent ? (
                          <div className="bg-green-900/30 p-3 rounded border border-green-500/30 text-green-300 text-sm">
                            <p>Token reward sent successfully!</p>
                            {rewardTxId && (
                              <p className="mt-1 font-mono text-xs break-all">Transaction ID: {rewardTxId}</p>
                            )}
                          </div>
                        ) : !walletPublicKey ? (
                          <p className="text-amber-300 text-sm">
                            Please connect your wallet to receive your token reward.
                          </p>
                        ) : (
                          <p className="text-green-300 text-sm">
                            Your token reward will be sent to your connected wallet.
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-700 pt-6">
          <Button
            variant="outline"
            onClick={generateContent}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600"
            disabled={!generationType || isGenerating}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate New {generationType}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

