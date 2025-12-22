'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFarcaster } from '@/components/providers/farcaster-provider';
import { IS_TESTNET } from '@/lib/web3/config';
import { switchToBase } from '@/lib/web3/client';

interface ConnectButtonProps {
  onConnect?: (address: string, farcasterUser?: { fid: number; username?: string } | null) => void;
  showDisconnect?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConnectButton({ onConnect, showDisconnect = false, size = 'md' }: ConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending } = useConnect();
  const { user: farcasterUser, isReady, isInMiniApp } = useFarcaster();
  
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notify parent when connected
  useEffect(() => {
    if (address && onConnect) {
      if (farcasterUser?.fid) {
        onConnect(address, { fid: farcasterUser.fid, username: farcasterUser.username });
      } else {
        onConnect(address, null);
      }
    }
  }, [address, farcasterUser, onConnect]);

  // Check network
  useEffect(() => {
    const checkNetwork = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const expectedChainId = IS_TESTNET ? '0x14a34' : '0x2105'; // Base Sepolia or Base
          setIsCorrectNetwork(chainId === expectedChainId);
        } catch {
          setIsCorrectNetwork(true);
        }
      }
    };

    checkNetwork();
    
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('chainChanged', checkNetwork);
      return () => {
        window.ethereum?.removeListener?.('chainChanged', checkNetwork);
      };
    }
  }, []);


  const handleConnect = useCallback(async () => {
    setError(null);
    
    try {
      // In Farcaster miniapp, use connectors[0] which is farcasterMiniApp (per official docs)
      if (isInMiniApp) {
        console.log('[ConnectButton] In MiniApp, connecting with connectors[0]:', connectors[0]?.name);
        connect({ connector: connectors[0] });
        return;
      }
      
      // Outside Farcaster - find best connector
      // Priority: injected (MetaMask) > coinbaseWallet > first available
      const injectedConnector = connectors.find(c => 
        /injected/i.test(c.id) || /metamask/i.test(c.id)
      );
      const coinbaseConnector = connectors.find(c => 
        /coinbase/i.test(c.id)
      );
      
      const connector = injectedConnector || coinbaseConnector || connectors[1] || connectors[0];
      
      if (connector) {
        console.log('[ConnectButton] Browser, connecting with:', connector.name);
        connect({ connector });
      } else {
        setError('No wallet found. Please install MetaMask or Coinbase Wallet.');
      }
    } catch (err) {
      console.error('Connect failed:', err);
      setError('Failed to connect. Please try again.');
    }
  }, [connect, connectors, isInMiniApp]);

  const handleSwitchNetwork = async () => {
    const success = await switchToBase();
    if (success) {
      setIsCorrectNetwork(true);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Connected state with optional disconnect button
  if (isConnected && address) {
    if (showDisconnect) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10">
            {farcasterUser?.pfpUrl ? (
              <img 
                src={farcasterUser.pfpUrl} 
                alt={farcasterUser.username || 'Profile'} 
                className="w-6 h-6 rounded-full object-cover border border-foreground/20"
              />
            ) : (
              <div 
                className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'} animate-pulse`}
              />
            )}
            <span className="text-sm font-medium text-foreground">
              {!isReady ? '...' : farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
            </span>
            {IS_TESTNET && (
              <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
                Testnet
              </span>
            )}
          </div>
          {!isCorrectNetwork && (
            <Button variant="ghost" size="sm" onClick={handleSwitchNetwork} className="text-warning">
              Switch
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => disconnect()}>
            <DisconnectIcon className="w-4 h-4" />
          </Button>
        </div>
      );
    }
    
    // Simple connected indicator (no disconnect)
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10">
        {farcasterUser?.pfpUrl ? (
          <img 
            src={farcasterUser.pfpUrl} 
            alt={farcasterUser.username || 'Profile'} 
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'}`} />
        )}
        <span className="text-sm font-medium">
          {!isReady ? '...' : farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
        </span>
      </div>
    );
  }


  // Not connected - show connect button
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleConnect}
        isLoading={isPending}
        size={size}
        className="christmas-gradient text-white"
      >
        <WalletIcon className="w-4 h-4 mr-2" />
        Connect
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
