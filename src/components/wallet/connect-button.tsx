'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { IS_TESTNET } from '@/lib/web3/config';
import { getCurrentNetwork, switchToBase } from '@/lib/web3/client';
import { fetchUserByAddress, type FarcasterUserData } from '@/lib/neynar/client';

interface ConnectButtonProps {
  onConnect?: (address: string, farcasterUser?: FarcasterUserData | null) => void;
}

export function ConnectButton({ onConnect }: ConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUserData | null>(null);
  const [fcLoading, setFcLoading] = useState(false);

  // Lookup Farcaster user when address changes
  useEffect(() => {
    if (!address) {
      setFarcasterUser(null);
      return;
    }
    
    setFcLoading(true);
    fetchUserByAddress(address)
      .then(user => {
        setFarcasterUser(user);
        onConnect?.(address, user);
      })
      .catch(() => setFarcasterUser(null))
      .finally(() => setFcLoading(false));
  }, [address]);

  // Check network on mount and listen for changes
  useEffect(() => {
    const checkNetwork = async () => {
      const network = await getCurrentNetwork();
      if (network) {
        setIsCorrectNetwork(network.isCorrect);
      }
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
        }
      });
      
      checkNetwork();
      window.ethereum.on?.('chainChanged', () => checkNetwork());
      window.ethereum.on?.('accountsChanged', (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
        } else {
          setAddress(null);
          setFarcasterUser(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if ethereum provider exists (MetaMask, etc.)
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setAddress(addr);
          onConnect?.(addr);
          
          // Check and switch network if needed
          const network = await getCurrentNetwork();
          if (network && !network.isCorrect) {
            await switchToBase();
          }
        }
      } else {
        setError('No wallet found. Please install MetaMask or another wallet.');
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchNetwork = async () => {
    const success = await switchToBase();
    if (success) {
      setIsCorrectNetwork(true);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10">
          {/* Farcaster PFP or Network indicator */}
          {farcasterUser?.pfpUrl ? (
            <img 
              src={farcasterUser.pfpUrl} 
              alt={farcasterUser.username || 'Profile'} 
              className="w-6 h-6 rounded-full object-cover border border-foreground/20"
            />
          ) : (
            <div 
              className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'} animate-pulse`}
              title={isCorrectNetwork ? `Connected to ${IS_TESTNET ? 'Base Sepolia' : 'Base'}` : 'Wrong network'}
            />
          )}
          <span className="text-sm font-medium text-foreground">
            {fcLoading ? '...' : farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
          </span>
          {IS_TESTNET && (
            <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
              Testnet
            </span>
          )}
          {!isCorrectNetwork && (
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" title="Wrong network" />
          )}
        </div>
        {!isCorrectNetwork && (
          <Button variant="ghost" size="sm" onClick={handleSwitchNetwork} className="text-warning">
            Switch
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={disconnectWallet}>
          <DisconnectIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={connectWallet}
        isLoading={isConnecting}
        className="christmas-gradient text-white"
      >
        <WalletIcon className="w-4 h-4 mr-2" />
        Connect Wallet
        {IS_TESTNET && <span className="ml-1 text-xs opacity-75">(Testnet)</span>}
      </Button>
      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
    </div>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function DisconnectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<string[]>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
