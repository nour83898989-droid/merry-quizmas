"use client"

// Detect if running in Farcaster miniapp
export function isFarcasterMiniApp(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  const hasFarcasterUA = userAgent.includes("farcaster") || userAgent.includes("warpcast")

  try {
    // @ts-expect-error - fc may exist on window in Farcaster
    return !!window.fc || hasFarcasterUA
  } catch {
    return hasFarcasterUA
  }
}

// Detect if running in Base miniapp (via Coinbase Wallet)
export function isBaseMiniApp(): boolean {
  if (typeof window === "undefined") return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.includes("coinbasewallet") || userAgent.includes("base")
}

// Get the current miniapp platform
export type MiniAppPlatform = "web" | "farcaster" | "base"

export function getMiniAppPlatform(): MiniAppPlatform {
  if (isFarcasterMiniApp()) return "farcaster"
  if (isBaseMiniApp()) return "base"
  return "web"
}

// Get the preferred wallet connector based on platform
export function getPreferredWalletType(): "farcaster" | "coinbase" | "injected" {
  const platform = getMiniAppPlatform()

  switch (platform) {
    case "farcaster":
      return "farcaster"
    case "base":
      return "coinbase"
    default:
      return "injected"
  }
}
