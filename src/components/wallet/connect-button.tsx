'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { Button } from '@/components/ui/button';
import { IS_TESTNET } from '@/lib/web3/config';
import { switchToBase } from '@/lib/web3/client';
import { useFarcasterUser } from '@/hooks/useFarcasterUser';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';
import { getMiniAppPlatform } from '@/lib/miniapp/config';

interface ConnectButtonProps {
  onConnect?: (address: string, farcasterUser?: { fid: number; username?: string } | null) => void;
}

export function ConnectButton({ onConnect }: ConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending } = useConnect();
  const { user: farcasterUser, loading: fcLoading } = useFarcasterUser();
  const isInFarcaster = useIsInFarcaster();
  
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get preferred connector based on platform
  const preferred = useMemo(() => {
    const far = connectors.find((c) => 
      /farcaster/i.test(c.name) || /mini.?app/i.test(c.name) || /warp/i.test(c.name)
    );
    const inj = connectors.find((c) => 
      /injected/i.test(c.id) || /injected/i.test(c.name) || /metamask/i.test(c.id)
    );
    const cbw = connectors.find((c) => 
      /coinbase/i.test(c.id) || /coinbase/i.test(c.name)
    );
    return { far, inj, cbw };
  }, [connectors]);

  // Notify parent when connected
  useEffect(() => {
    if (address && farcasterUser) {
      onConnect?.(address, farcasterUser);
    } else if (address) {
      onConnect?.(address, null);
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
    const platform = getMiniAppPlatform();
    
    try {
      // In Farcaster miniapp, use farcasterMiniApp() connector directly
      if (platform === 'farcaster' || isInFarcaster) {
        console.log('[ConnectButton] Connecting with farcasterMiniApp connector');
        connect({ connector: farcasterMiniApp() });
        return;
      }
      
      // Outside Farcaster, use other connectors
      let connector;
      if (platform === 'base' && preferred.cbw) {
        connector = preferred.cbw;
      } else {
        connector = preferred.inj || preferred.cbw || connectors[0];
      }
      
      if (connector) {
        connect({ connector });
      } else {
        // Fallback to window.ethereum
        if (typeof window !== 'undefined' && window.ethereum) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } else {
          setError('No wallet found. Please install a wallet.');
        }
      }
    } catch (err) {
      console.error('Connect failed:', err);
      setError('Failed to connect. Please try again.');
    }
  }, [connect, connectors, preferred, isInFarcaster]);

  const handleSwitchNetwork = async () => {
    const success = await switchToBase();
    if (success) {
      setIsCorrectNetwork(true);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Connected state
  if (isConnected && address) {
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
        <Button variant="ghost" size="sm" onClick={() => disconnect()}>
          <DisconnectIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Not connected - show login buttons based on platform
  const platform = getMiniAppPlatform();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {/* In Farcaster, show single connect button */}
        {isInFarcaster || platform === 'farcaster' ? (
          <Button
            onClick={handleConnect}
            isLoading={isPending}
            className="christmas-gradient text-white"
          >
            <WalletIcon className="w-4 h-4 mr-2" />
            Connect
          </Button>
        ) : (
          <>
            {/* Browser: show Farcaster + Wallet buttons */}
            <Button
              onClick={() => connect({ connector: farcasterMiniApp() })}
              isLoading={isPending}
              variant="secondary"
              size="sm"
            >
              Farcaster
            </Button>
            <Button
              onClick={handleConnect}
              isLoading={isPending}
              className="christmas-gradient text-white"
            >
              <WalletIcon className="w-4 h-4 mr-2" />
              Wallet
              {IS_TESTNET && <span className="ml-1 text-xs opacity-75">(Testnet)</span>}
            </Button>
          </>
        )}
      </div>
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
