'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useFarcaster } from '@/components/providers/farcaster-provider';
import { IS_TESTNET, BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/lib/web3/config';
import { switchToBase, switchToBaseSepolia } from '@/lib/web3/client';

interface ConnectButtonProps {
  onConnect?: (address: string, farcasterUser?: { fid: number; username?: string } | null) => void;
  showDisconnect?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Chain options
const CHAINS = [
  { id: BASE_CHAIN_ID, name: 'Base', shortName: 'Base', color: 'bg-blue-500' },
  { id: BASE_SEPOLIA_CHAIN_ID, name: 'Base Sepolia', shortName: 'Sepolia', color: 'bg-orange-500' },
];

export function ConnectButton({ onConnect, showDisconnect = false, size = 'md' }: ConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending } = useConnect();
  const { user: farcasterUser, isReady, isInMiniApp, platform } = useFarcaster();
  
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Expected chain based on IS_TESTNET env var
  const expectedChainId = IS_TESTNET ? BASE_SEPOLIA_CHAIN_ID : BASE_CHAIN_ID;
  const isCorrectNetwork = currentChainId === null || currentChainId === expectedChainId;
  const currentChain = CHAINS.find(c => c.id === currentChainId) || CHAINS[0];

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
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          const chainId = parseInt(chainIdHex as string, 16);
          setCurrentChainId(chainId);
        } catch {
          setCurrentChainId(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = useCallback(async () => {
    setError(null);
    
    try {
      // Select connector based on platform
      if (platform === 'farcaster') {
        // Farcaster: use farcasterMiniApp connector (index 0)
        console.log('[ConnectButton] Farcaster platform, using farcasterMiniApp connector');
        connect({ connector: connectors[0] });
        return;
      }
      
      if (platform === 'base') {
        // Base App: use coinbaseWallet connector (index 1)
        console.log('[ConnectButton] Base App platform, using coinbaseWallet connector');
        connect({ connector: connectors[1] });
        return;
      }
      
      // Browser: try injected first, then coinbase
      const injectedConnector = connectors.find(c => 
        /injected/i.test(c.id) || /metamask/i.test(c.id)
      );
      const coinbaseConnector = connectors.find(c => 
        /coinbase/i.test(c.id)
      );
      
      const connector = injectedConnector || coinbaseConnector || connectors[2] || connectors[0];
      
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
  }, [connect, connectors, platform]);

  const handleSwitchChain = async (chainId: number) => {
    setIsSwitching(true);
    setIsDropdownOpen(false);
    try {
      if (chainId === BASE_CHAIN_ID) {
        await switchToBase();
      } else {
        await switchToBaseSepolia();
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Chain Selector Dropdown Component
  const ChainSelector = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isSwitching}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          !isCorrectNetwork
            ? 'bg-warning/20 text-warning hover:bg-warning/30'
            : 'bg-surface hover:bg-surface/80 text-foreground border border-foreground/10'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${currentChain.color} ${!isCorrectNetwork ? 'animate-pulse' : ''}`} />
        {isSwitching ? '...' : currentChain.shortName}
        <ChevronIcon className="w-3 h-3" />
      </button>
      
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-1 bg-surface border border-foreground/10 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
          {CHAINS.map(chain => (
            <button
              key={chain.id}
              onClick={() => handleSwitchChain(chain.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-foreground/5 transition-colors ${
                currentChainId === chain.id ? 'bg-primary/10 text-primary' : 'text-foreground'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${chain.color}`} />
              {chain.name}
              {currentChainId === chain.id && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Connected state with optional disconnect button
  if (isConnected && address) {
    if (showDisconnect) {
      return (
        <div className="flex items-center gap-2">
          <ChainSelector />
          
          <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10">
            {farcasterUser?.pfpUrl ? (
              <img 
                src={farcasterUser.pfpUrl} 
                alt={farcasterUser.username || 'Profile'} 
                className="w-6 h-6 rounded-full object-cover border border-foreground/20"
              />
            ) : (
              <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'} animate-pulse`} />
            )}
            <span className="text-sm font-medium text-foreground">
              {!isReady ? '...' : farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => disconnect()}>
            <DisconnectIcon className="w-4 h-4" />
          </Button>
        </div>
      );
    }
    
    // Simple connected indicator (no disconnect)
    return (
      <div className="flex items-center gap-2">
        <ChainSelector />
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
