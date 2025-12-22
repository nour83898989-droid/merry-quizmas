'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { IS_TESTNET } from '@/lib/web3/config';
import { getCurrentNetwork, switchToBase } from '@/lib/web3/client';

export function Navbar() {
  const pathname = usePathname();
  const [address, setAddress] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check wallet on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Check existing connection
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          checkNetwork();
          checkAdminStatus(accounts[0]);
        }
      });

      // Listen for account changes
      window.ethereum.on?.('accountsChanged', (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
          checkAdminStatus(accs[0]);
        } else {
          setAddress(null);
          setIsAdmin(false);
        }
      });

      // Listen for network changes
      window.ethereum.on?.('chainChanged', () => checkNetwork());
    }
  }, []);

  // Check if user is admin
  const checkAdminStatus = async (wallet: string) => {
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-wallet-address': wallet },
      });
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    }
  };

  // Check wallet on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Check existing connection
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          checkNetwork();
        }
      });

      // Listen for account changes
      window.ethereum.on?.('accountsChanged', (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs && accs.length > 0) {
          setAddress(accs[0]);
        } else {
          setAddress(null);
        }
      });

      // Listen for network changes
      window.ethereum.on?.('chainChanged', () => checkNetwork());
    }
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkNetwork = async () => {
    const network = await getCurrentNetwork();
    if (network) {
      setIsCorrectNetwork(network.isCorrect);
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        const network = await getCurrentNetwork();
        if (network && !network.isCorrect) {
          await switchToBase();
        }
      }
    } catch (err) {
      console.error('Failed to connect:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setMenuOpen(false);
  };

  const handleSwitchNetwork = async () => {
    const success = await switchToBase();
    if (success) setIsCorrectNetwork(true);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/quizzes', label: 'Quizzes', icon: '🎮' },
    { href: '/polls', label: 'Polls', icon: '📊' },
    { href: '/create', label: 'Create', icon: '✨' },
    { href: '/claim', label: 'Rewards', icon: '🎁' },
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
            {address && !isCorrectNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="px-2 py-1 text-xs bg-warning/20 text-warning rounded-lg hover:bg-warning/30"
              >
                Wrong Network
              </button>
            )}

            {/* Wallet Button */}
            {address ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface rounded-xl border border-foreground/10 hover:border-foreground/20 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-success' : 'bg-warning'}`} />
                  <span className="text-sm font-medium text-foreground">{truncateAddress(address)}</span>
                  <ChevronIcon className={`w-4 h-4 text-foreground-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-surface rounded-xl border border-foreground/10 shadow-xl">
                    <Link href="/profile" onClick={() => setMenuOpen(false)}>
                      <div className="px-4 py-2 text-sm text-foreground hover:bg-foreground/5 cursor-pointer">
                        👤 Profile
                      </div>
                    </Link>
                    <Link href="/claim" onClick={() => setMenuOpen(false)}>
                      <div className="px-4 py-2 text-sm text-foreground hover:bg-foreground/5 cursor-pointer">
                        🎁 My Rewards
                      </div>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)}>
                        <div className="px-4 py-2 text-sm text-foreground hover:bg-foreground/5 cursor-pointer">
                          🛡️ Admin
                        </div>
                      </Link>
                    )}
                    <div className="border-t border-foreground/10 my-1" />
                    <button
                      onClick={disconnectWallet}
                      className="w-full px-4 py-2 text-sm text-left text-error hover:bg-error/5"
                    >
                      🚪 Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={connectWallet}
                isLoading={isConnecting}
                size="sm"
                className="christmas-gradient text-white"
              >
                Connect
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-foreground/5"
            >
              <MenuIcon className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-foreground/10">
            <div className="grid grid-cols-5 gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
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
