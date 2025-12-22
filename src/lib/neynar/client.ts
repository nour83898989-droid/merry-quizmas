"use client"

/**
 * Neynar API client for Farcaster user lookups
 * Docs: https://docs.neynar.com/docs/getting-started-with-neynar
 */

// For client-side usage, we need NEXT_PUBLIC_ prefix
// Fallback to NEYNAR_API_DOCS for development (limited rate)
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || 'NEYNAR_API_DOCS'
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2/farcaster'

// Neynar API response types
export interface VerifiedAddressInfo {
  eth_addresses: string[]
  sol_addresses: string[]
  primary?: {
    eth_address?: string
    sol_address?: string
  }
}

export interface NeynarUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  custody_address: string
  verified_addresses: VerifiedAddressInfo
  follower_count: number
  following_count: number
}

export interface FarcasterUserData {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  custodyAddress: string
  verifiedAddresses: string[]
  primaryEthAddress?: string
}

/**
 * Extract primary ETH address from Neynar user data
 */
function extractPrimaryEthAddress(user: NeynarUser): string | undefined {
  if (user.verified_addresses?.primary?.eth_address) {
    return user.verified_addresses.primary.eth_address
  }
  
  const ethAddresses = user.verified_addresses?.eth_addresses || []
  if (ethAddresses.length > 0) {
    return ethAddresses[0]
  }
  
  return undefined
}

/**
 * Fetch user by FID from Neynar API
 */
export async function fetchUserByFid(fid: number): Promise<FarcasterUserData | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk?fids=${fid}`, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    })
    
    if (!response.ok) {
      console.warn('Neynar API request failed:', response.status)
      return null
    }
    
    const data = await response.json()
    const user = data?.users?.[0] as NeynarUser | undefined
    
    if (user) {
      return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        custodyAddress: user.custody_address,
        verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        primaryEthAddress: extractPrimaryEthAddress(user)
      }
    }
  } catch (error) {
    console.warn('Failed to fetch user by FID from Neynar:', error)
  }
  return null
}

/**
 * Fetch user by wallet address from Neynar API
 * This is the key function to get FID from wallet address!
 */
export async function fetchUserByAddress(address: string): Promise<FarcasterUserData | null> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk-by-address?addresses=${address.toLowerCase()}`, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    })
    
    if (!response.ok) {
      console.warn('Neynar API bulk-by-address failed:', response.status)
      return null
    }
    
    const data = await response.json()
    const users = data?.[address.toLowerCase()] as NeynarUser[] | undefined
    const user = users?.[0]
    
    if (user) {
      return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        pfpUrl: user.pfp_url,
        custodyAddress: user.custody_address,
        verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        primaryEthAddress: extractPrimaryEthAddress(user)
      }
    }
  } catch (error) {
    console.warn('Failed to fetch user by address from Neynar:', error)
  }
  return null
}

/**
 * Search users by username
 */
export async function searchUsersByUsername(query: string, limit = 5): Promise<FarcasterUserData[]> {
  try {
    const response = await fetch(`${NEYNAR_BASE_URL}/user/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    })
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    const users = data?.result?.users as NeynarUser[] | undefined
    
    return (users || []).map(user => ({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url,
      custodyAddress: user.custody_address,
      verifiedAddresses: user.verified_addresses?.eth_addresses || [],
      primaryEthAddress: extractPrimaryEthAddress(user)
    }))
  } catch (error) {
    console.warn('Failed to search users:', error)
    return []
  }
}
