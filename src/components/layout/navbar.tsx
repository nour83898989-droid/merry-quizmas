'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@/components/wallet/connect-button';
import { useFarcaster } from '@/components/providers/farcaster-provider';
import { IS_TESTNET, BASE_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/lib/web3/config';
import { getCurrentNetwork, switchToBase } from '@/lib/web3/client';

// Chain options
const CHAINS = [
  { id: BASE_CHAIN_ID, name: 'Base Mainnet', shortName: 'Base', color: 'bg-blue-500' },
  { id: BASE_SEPOLIA_CHAIN_ID, name: 'Base Sepolia', shortName: 'Sepolia', color: 'bg-orange-500' },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, chainId: wagmiChainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { user: farcasterUser, isReady, isInMiniApp } = useFarcaster();
  
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Wallet dropdown
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false); // Chain selector
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // Mobile navigation
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chainDropdownRef = useRef<HTMLDivElement>(null);

  const expectedChainId = IS_TESTNET ? BASE_SEPOLIA_CHAIN_ID : BASE_CHAIN_ID;
  const currentChain = CHAINS.find(c => c.id === currentChainId) || CHAINS[IS_TESTNET ? 1 : 0];

  // Sync chainId from wagmi (works in both browser and MiniApp)
  useEffect(() => {
    if (wagmiChainId) {
      setCurrentChainId(wagmiChainId);
      setIsCorrectNetwork(wagmiChainId === expectedChainId);
    }
  }, [wagmiChainId, expectedChainId]);

  // Fallback: Check network via window.ethereum (browser only)
  useEffect(() => {
    if (isConnected && !wagmiChainId) {
      checkNetwork();
    }
  }, [isConnected, wagmiChainId]);

  // Check admin status when address or farcasterUser changes (with debounce)
  useEffect(() => {
    if (address || farcasterUser?.fid) {
      // Small delay to avoid multiple rapid calls
      const timer = setTimeout(() => {
        checkAdminStatus(address, farcasterUser?.fid);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAdmin(false);
    }
  }, [address, farcasterUser?.fid]);

  // Listen for network changes (browser only fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && !isInMiniApp) {
      const handleChainChanged = () => checkNetwork();
      window.ethereum.on?.('chainChanged', handleChainChanged);
      return () => {
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, [isInMiniApp]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target as Node)) {
        setChainDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const checkAdminStatus = async (wallet?: string, fid?: number) => {
    try {
      const headers: Record<string, string> = {};
      if (wallet) headers['x-wallet-address'] = wallet;
      if (fid) headers['x-fid'] = fid.toString();
      
      if (Object.keys(headers).length === 0) {
        setIsAdmin(false);
        return;
      }
      
      const res = await fetch('/api/admin', { headers });
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  const checkNetwork = async () => {
    const network = await getCurrentNetwork();
    if (network) {
      setIsCorrectNetwork(network.isCorrect);
      setCurrentChainId(network.chainId);
    }
  };

  const handleSwitchNetwork = async () => {
    // Use wagmi switchChain for MiniApp compatibility
    if (switchChain) {
      try {
        switchChain({ chainId: expectedChainId });
      } catch (e) {
        console.error('Failed to switch chain via wagmi:', e);
        // Fallback to direct provider call
        const success = await switchToBase();
        if (success) setIsCorrectNetwork(true);
      }
    } else {
      const success = await switchToBase();
      if (success) setIsCorrectNetwork(true);
    }
  };

  const handleSwitchChain = async (chainId: number) => {
    setIsSwitchingChain(true);
    setChainDropdownOpen(false);
    try {
      // Use wagmi switchChain - works in both browser and MiniApp
      if (switchChain) {
        switchChain({ chainId });
      }
    } catch (e) {
      console.error('Failed to switch chain:', e);
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setDropdownOpen(false);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/quizzes', label: 'Quizzes', icon: '🎮' },
    { href: '/polls', label: 'Polls', icon: '📊' },
    { href: '/create', label: 'Create', icon: '✨' },
    { href: '/claim', label: 'Rewards', icon: '🎁' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-foreground/10">
      {/* Testnet Banner */}
      {IS_TESTNET && (
        <div className="bg-warning/20 px-4 py-1 text-center">
          <p className="text-xs text-warning font-medium">
            🧪 Testnet Mode - Base Sepolia
          </p>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎄</span>
            <span className="font-bold text-foreground hidden sm:block">Merry Quizmas</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <button
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-primary/20 text-primary'
                      : 'text-foreground-muted hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </button>
              </Link>
            ))}
          </div>


          {/* Wallet & Menu */}
          <div className="flex items-center gap-2">
            {/* Chain Selector Dropdown */}
            {isConnected && (
              <div className="relative" ref={chainDropdownRef}>
                <button
                  onClick={() => setChainDropdownOpen(!chainDropdownOpen)}
                  disabled={isSwitchingChain}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    !isCorrectNetwork
                      ? 'bg-warning/20 text-warning hover:bg-warning/30'
                      : 'bg-surface hover:bg-surface/80 text-foreground border border-foreground/10'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentChain.color} ${!isCorrectNetwork ? 'animate-pulse' : ''}`} />
                  {isSwitchingChain ? '...' : currentChain.shortName}
                  <ChevronIcon className={`w-3 h-3 transition-transform ${chainDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {chainDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-surface border border-foreground/10 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
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
            )}

            {/* Connected State - Show PFP/Username or Address */}
            {isConnected && address ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10 hover:border-foreground/20 transition-colors"
                >
                  {/* Farcaster PFP */}
                  {farcasterUser?.pfpUrl ? (
                    <img 
                      src={farcasterUser.pfpUrl} 
                      alt={farcasterUser.username || 'Profile'} 
                      className="w-6 h-6 rounded-full object-cover border border-foreground/20"
                    />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'}`} />
                  )}
                  
                  {/* Username or Address */}
                  <span className="text-sm font-medium text-foreground">
                    {!isReady ? '...' : farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
                  </span>
                  
                  <ChevronIcon className={`w-4 h-4 text-foreground-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-surface rounded-xl border border-foreground/10 shadow-xl z-50">
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setDropdownOpen(false)}>
                        <div className="px-4 py-2 text-sm text-foreground hover:bg-foreground/5 cursor-pointer">
                          🛡️ Admin
                        </div>
                      </Link>
                    )}
                    <button
                      onClick={handleDisconnect}
                      className="w-full px-4 py-2 text-sm text-left text-error hover:bg-error/5"
                    >
                      🚪 Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not Connected - Show ConnectButton */
              <ConnectButton />
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-foreground/5"
            >
              <MenuIcon className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>


        {/* Mobile Nav */}
        {mobileNavOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-foreground/10">
            <div className="grid grid-cols-6 gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileNavOpen(false)}>
                  <div
                    className={`flex flex-col items-center py-2 rounded-lg text-xs ${
                      pathname === item.href
                        ? 'bg-primary/20 text-primary'
                        : 'text-foreground-muted'
                    }`}
                  >
                    <span className="text-lg mb-1">{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
