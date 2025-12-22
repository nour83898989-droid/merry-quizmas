'use client';

import { useState, useEffect, useRef } from 'react';
import { SUPPORTED_TOKENS, IS_TESTNET } from '@/lib/web3/config';
import { getAllTokenBalances, TokenBalance } from '@/lib/web3/client';

interface TokenSelectorProps {
  value: string; // token address
  onChange: (address: string) => void;
  walletAddress?: string | null;
  showBalance?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function TokenSelector({
  value,
  onChange,
  walletAddress,
  showBalance = true,
  placeholder = 'Select token',
  disabled = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected token info
  const selectedToken = SUPPORTED_TOKENS.find(t => t.address === value);
  const selectedBalance = balances.find(b => b.address === value);

  // Fetch balances when wallet connected
  useEffect(() => {
    if (!walletAddress || !showBalance) return;
    
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    
    getAllTokenBalances(walletAddress)
      .then(data => {
        if (!cancelled) setBalances(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    
    return () => { cancelled = true; };
  }, [walletAddress, showBalance]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Token Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between ${
          disabled
            ? 'bg-surface/50 border-foreground/5 cursor-not-allowed'
            : isOpen
            ? 'border-primary bg-primary/5'
            : 'border-foreground/10 hover:border-foreground/30 bg-surface'
        }`}
      >
        <div className="flex items-center gap-3">
          {selectedToken ? (
            <>
              <TokenIcon symbol={selectedToken.symbol} />
              <div>
                <p className="font-medium text-foreground">{selectedToken.symbol}</p>
                {showBalance && selectedBalance && (
                  <p className="text-xs text-foreground-muted">
                    Balance: {selectedBalance.formattedBalance}
                  </p>
                )}
              </div>
            </>
          ) : (
            <span className="text-foreground-muted">{placeholder}</span>
          )}
        </div>
        <ChevronIcon className={`w-5 h-5 text-foreground-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-2 rounded-xl border border-foreground/10 bg-surface shadow-xl">
          {loading ? (
            <div className="px-4 py-3 text-center text-foreground-muted">
              Loading balances...
            </div>
          ) : (
            SUPPORTED_TOKENS.map(token => {
              const balance = balances.find(b => b.address === token.address);
              const isSelected = token.address === value;

              return (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => {
                    onChange(token.address);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-foreground/5 transition-colors ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token.symbol} />
                    <div className="text-left">
                      <p className="font-medium text-foreground">{token.symbol}</p>
                      <p className="text-xs text-foreground-muted">{token.name}</p>
                    </div>
                  </div>
                  {showBalance && balance && (
                    <span className="text-sm text-foreground-muted">
                      {balance.formattedBalance}
                    </span>
                  )}
                </button>
              );
            })
          )}
          
          {/* Network indicator */}
          <div className="px-4 py-2 border-t border-foreground/10 mt-2">
            <p className="text-xs text-foreground-muted flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${IS_TESTNET ? 'bg-warning' : 'bg-success'}`} />
              {IS_TESTNET ? 'Base Sepolia Testnet' : 'Base Mainnet'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  // Simple colored circle based on token
  const colors: Record<string, string> = {
    'ETH': 'bg-blue-500',
    'USDC': 'bg-green-500',
    'tUSDC': 'bg-green-500',
    'SUP': 'bg-purple-500',
    'tSUP': 'bg-purple-500',
    'BANGER': 'bg-orange-500',
    'tBANGER': 'bg-orange-500',
  };

  return (
    <div className={`w-8 h-8 rounded-full ${colors[symbol] || 'bg-gray-500'} flex items-center justify-center`}>
      <span className="text-white text-xs font-bold">
        {symbol.replace('t', '').slice(0, 2)}
      </span>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
