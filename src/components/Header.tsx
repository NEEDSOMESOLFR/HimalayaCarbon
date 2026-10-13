import React, { useState, useRef, useEffect } from 'react';
import { MountainLogoIcon } from './CategoryIcons';
import { WalletState } from '../types';
import { Menu, X, ExternalLink, Copy, Check, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'Marketplace' | 'Projects' | 'Verify' | 'Docs';
  setActiveTab: (tab: 'Marketplace' | 'Projects' | 'Verify' | 'Docs') => void;
  wallet: WalletState;
  onOpenWalletModal: () => void;
  onOpenPurchasesModal?: () => void;
  solUsdRate?: number;
}

export function Header({
  activeTab,
  setActiveTab,
  wallet,
  onOpenWalletModal,
  onOpenPurchasesModal,
  solUsdRate,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const navItems: Array<'Marketplace' | 'Projects' | 'Verify' | 'Docs'> = [
    'Marketplace',
    'Projects',
    'Verify',
    'Docs',
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavSelect = (item: 'Marketplace' | 'Projects' | 'Verify' | 'Docs') => {
    setActiveTab(item);
    setMobileMenuOpen(false);
  };

  const handleWalletButtonClick = () => {
    if (wallet.connected) {
      setWalletDropdownOpen((prev) => !prev);
    } else {
      onOpenWalletModal();
    }
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app-header-wrapper select-none">
      <header className="app-header relative">
        {/* Left: Logo mark + Wordmark */}
        <button
          type="button"
          className="flex items-center gap-2.5 cursor-pointer text-left bg-transparent border-0 p-0 shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
          onClick={() => setActiveTab('Marketplace')}
          aria-label="Himalaya Carbon Home"
        >
          {/* 36px rounded-square, 10px radius, solid var(--forest), white mountain icon */}
          <div className="w-[36px] h-[36px] rounded-[10px] shrink-0 bg-[var(--forest)] text-white flex items-center justify-center">
            <MountainLogoIcon className="w-4 h-4 text-white" />
          </div>
          {/* Wordmark: Fraunces 18px weight 500 #17241D (hidden below 480px) */}
          <span className="hidden min-[480px]:inline font-fraunces text-[18px] font-medium leading-none tracking-tight text-[#17241D] whitespace-nowrap">
            Himalaya Carbon
          </span>
        </button>

        {/* Center: Nav links (Marketplace, Projects, Verify, Docs) - 720px+ */}
        <nav className="hidden min-[720px]:flex items-center gap-1 sm:gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleNavSelect(item)}
                className={`px-[14px] py-[8px] rounded-full text-[14px] font-inter font-medium whitespace-nowrap cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 text-[#17241D] ${
                  isActive
                    ? 'bg-[rgba(231,238,233,0.9)] border border-[rgba(27,58,47,0.14)]'
                    : 'bg-transparent border border-transparent hover:bg-[rgba(255,255,255,0.85)]'
                }`}
                style={{
                  color: '#17241D',
                  textDecoration: 'none',
                }}
              >
                {item}
              </button>
            );
          })}
        </nav>

        {/* Right: Network Chip + Wallet Button + Mobile Menu Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Flat Glass DEVNET Chip (visible > 1000px) */}
          <div
            className="hidden min-[1001px]:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-inter font-medium text-[#17241D] bg-[rgba(255,255,255,0.8)] border border-[rgba(27,58,47,0.14)] shrink-0 select-none"
            style={{ letterSpacing: '0.06em' }}
            aria-label="Network: Solana devnet"
          >
            <span className="w-[6px] h-[6px] rounded-full bg-[#2F7D5B] shrink-0" />
            <span className="uppercase text-[#17241D] font-medium text-[12px]">DEVNET</span>
          </div>

          {/* Wallet Button Container with Dropdown */}
          <div className="relative" ref={walletRef}>
            <button
              type="button"
              onClick={handleWalletButtonClick}
              className="h-[38px] px-4 rounded-full bg-[var(--forest)] text-white hover:bg-[#234A3C] transition-colors flex items-center gap-2 cursor-pointer text-[13px] font-inter font-medium shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
              style={{
                boxShadow: 'none',
              }}
              aria-label={wallet.connected ? 'Wallet account menu' : 'Connect Solana wallet'}
              aria-expanded={walletDropdownOpen}
            >
              {/* Green status dot */}
              <span className="w-[6px] h-[6px] rounded-full bg-[#5CBA7D] shrink-0 inline-block" />

              {wallet.connected ? (
                <>
                  {/* Above 1000px: Address + Balance */}
                  <span className="hidden min-[1001px]:inline tabular-nums text-white">
                    {wallet.address?.slice(0, 4)}...{wallet.address?.slice(-4)} ({wallet.solBalance} SOL)
                  </span>

                  {/* 720px to 1000px: Address only */}
                  <span className="hidden min-[720px]:max-[1000px]:inline tabular-nums text-white">
                    {wallet.address?.slice(0, 4)}...{wallet.address?.slice(-4)}
                  </span>

                  {/* Below 720px: Shortened address only */}
                  <span className="inline min-[720px]:hidden tabular-nums text-white">
                    {wallet.address?.slice(0, 4)}...{wallet.address?.slice(-4)}
                  </span>
                </>
              ) : (
                <>
                  <span className="hidden min-[720px]:inline whitespace-nowrap text-white">
                    Connect wallet
                  </span>
                  <span className="inline min-[720px]:hidden whitespace-nowrap text-white">
                    Connect
                  </span>
                </>
              )}
            </button>

            {/* Wallet Dropdown: opens below the bar, z-index 150 */}
            {walletDropdownOpen && wallet.connected && (
              <div
                className="header-glass-dropdown absolute right-0 top-[calc(100%+8px)] w-[260px] z-[150] flex flex-col gap-1"
                role="menu"
              >
                {/* Item 1: Address and Copy */}
                <div
                  onClick={handleCopyAddress}
                  className="h-[40px] px-3 rounded-[10px] flex items-center justify-between text-[13px] font-inter font-medium text-[#17241D] hover:bg-[rgba(231,238,233,0.9)] cursor-pointer transition-colors"
                  role="menuitem"
                  title="Click to copy public address"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#2F7D5B] shrink-0" />
                    <span className="font-mono text-xs truncate">
                      {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-6)}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--forest)] flex items-center gap-1 font-semibold shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5 text-[#2F7D5B]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </span>
                </div>

                {/* Item 2: Solana Balance */}
                <div
                  className="h-[40px] px-3 rounded-[10px] flex items-center justify-between text-[13px] font-inter font-medium text-[#17241D] hover:bg-[rgba(231,238,233,0.9)] transition-colors"
                  role="menuitem"
                >
                  <span>Balance</span>
                  <span className="tabular-nums font-semibold text-[#17241D]">
                    {wallet.solBalance} SOL
                  </span>
                </div>

                {/* Item 3: My purchases */}
                <button
                  type="button"
                  onClick={() => {
                    setWalletDropdownOpen(false);
                    onOpenPurchasesModal?.();
                  }}
                  className="w-full h-[40px] px-3 rounded-[10px] flex items-center justify-between text-[13px] font-inter font-medium text-[#17241D] hover:bg-[rgba(231,238,233,0.9)] text-left cursor-pointer border-0 bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#1B3A2F]" />
                    <span>My purchases</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#1B3A2F] bg-[#E7EEE9] px-2 py-0.5 rounded-full">
                    PDF
                  </span>
                </button>

                {/* Item 4: Manage Wallet Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setWalletDropdownOpen(false);
                    onOpenWalletModal();
                  }}
                  className="w-full h-[40px] px-3 rounded-[10px] flex items-center justify-between text-[13px] font-inter font-medium text-[#17241D] hover:bg-[rgba(231,238,233,0.9)] text-left cursor-pointer border-0 bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                  role="menuitem"
                >
                  <span>Wallet details & airdrop</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 text-[#17241D]" />
                </button>
              </div>
            )}
          </div>

          {/* Compact Menu Button (below 720px): 40px square, 12px radius, glass chip style */}
          <div className="relative min-[720px]:hidden" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="w-[40px] h-[40px] rounded-[12px] bg-[rgba(255,255,255,0.8)] border border-[rgba(27,58,47,0.14)] flex items-center justify-center p-0 text-[#17241D] cursor-pointer hover:bg-[rgba(231,238,233,0.9)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 shrink-0"
              style={{ boxShadow: 'none' }}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-[#17241D]" />
              ) : (
                <Menu className="w-4 h-4 text-[#17241D]" />
              )}
            </button>

            {/* Mobile Glass Dropdown (containing the four nav links) */}
            {mobileMenuOpen && (
              <div
                className="header-glass-dropdown absolute right-0 top-[calc(100%+8px)] w-[240px] z-[150] flex flex-col gap-1"
                role="menu"
              >
                {navItems.map((item) => {
                  const isActive = activeTab === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleNavSelect(item)}
                      className={`h-[40px] w-full text-left px-3.5 rounded-[10px] text-[14px] font-inter font-medium cursor-pointer flex items-center justify-between text-[#17241D] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 ${
                        isActive
                          ? 'bg-[rgba(231,238,233,0.9)] border border-[rgba(27,58,47,0.14)] font-semibold'
                          : 'bg-transparent border border-transparent hover:bg-[rgba(231,238,233,0.9)]'
                      }`}
                      style={{ color: '#17241D' }}
                      role="menuitem"
                    >
                      <span>{item}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--forest)]" />
                      )}
                    </button>
                  );
                })}

                {solUsdRate && solUsdRate > 0 && (
                  <div className="mt-1 pt-2 border-t border-[rgba(27,58,47,0.12)] px-3.5 py-1.5 flex items-center justify-between text-[12px] font-inter font-medium text-[#17241D]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2F7D5B]" />
                      <span>SOL Oracle</span>
                    </div>
                    <span className="font-semibold text-[#17241D] tabular-nums">
                      ${solUsdRate.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
