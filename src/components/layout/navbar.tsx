'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@/components/wallet/connect-button';
import { useFarcaster } from '@/components/providers/farcaster-provider';
import { IS_TESTNET } from '@/lib/web3/config';
import { getCurrentNetwork, switchToBase } from '@/lib/web3/client';

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { user: farcasterUser, isReady } = useFarcaster();
  
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false); // Wallet dropdown
  const [mobileNavOpen, setMobileNavOpen] = useState(false); // Mobile navigation
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check network when connected
  useEffect(() => {
    if (isConnected) {
      checkNetwork();
    }
  }, [isConnected]);

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

  // Listen for network changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleChainChanged = () => checkNetwork();
      window.ethereum.on?.('chainChanged', handleChainChanged);
      return () => {
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
    }
  };

  const handleSwitchNetwork = async () => {
    const success = await switchToBase();
    if (success) setIsCorrectNetwork(true);
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
            {/* Network Warning */}
            {isConnected && !isCorrectNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="px-2 py-1 text-xs bg-warning/20 text-warning rounded-lg hover:bg-warning/30"
              >
                Wrong Network
              </button>
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
                  
                  {IS_TESTNET && (
                    <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
                      Testnet
                    </span>
                  )}
                  
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
