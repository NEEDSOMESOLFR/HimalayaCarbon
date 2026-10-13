import React, { useState, useEffect } from 'react';
import { WalletState } from '../types';
import {
  X,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Coins,
  Wallet,
} from 'lucide-react';
import {
  getSolanaProvider,
  requestDevnetAirdrop,
} from '../lib/phantom';

interface WalletModalProps {
  wallet: WalletState;
  onClose: () => void;
  onConnectWallet: () => Promise<void>;
  onDisconnect: () => void;
  onRefreshBalance?: () => Promise<void>;
}

export function WalletModal({
  wallet,
  onClose,
  onConnectWallet,
  onDisconnect,
  onRefreshBalance,
}: WalletModalProps) {
  const [isWalletAvailable, setIsWalletAvailable] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isAirdropping, setIsAirdropping] = useState<boolean>(false);
  const [airdropMsg, setAirdropMsg] = useState<string | null>(null);

  useEffect(() => {
    const provider = getSolanaProvider();
    setIsWalletAvailable(!!provider);
  }, []);

  const handleCopy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectClick = async () => {
    if (!isWalletAvailable) {
      return;
    }

    try {
      setIsConnecting(true);
      await onConnectWallet();
      onClose();
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAirdrop = async () => {
    if (!wallet.address) return;
    try {
      setIsAirdropping(true);
      setAirdropMsg(null);
      await requestDevnetAirdrop(wallet.address);
      setAirdropMsg('Airdropped 1 SOL on Devnet!');
      if (onRefreshBalance) {
        await onRefreshBalance();
      }
    } catch (err: any) {
      setAirdropMsg('Airdrop rate limit reached. Try via faucet.solana.com');
    } finally {
      setIsAirdropping(false);
      setTimeout(() => setAirdropMsg(null), 4000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-150 motion-reduce:transition-none"
      style={{ backgroundColor: 'rgba(23, 36, 29, 0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[440px] rounded-[20px] p-6 sm:p-7 relative bg-[var(--paper)] border border-[var(--line-strong)]">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-5 right-5 w-8 h-8 rounded-[10px] border border-[var(--line-strong)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--ink)] hover:bg-[var(--bg)]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{
              backgroundColor: wallet.connected ? '#3E5531' : '#8A5327',
            }}
          />
          <span className="text-[12px] font-medium tracking-wide uppercase text-[var(--ink)]">
            Solana Devnet
          </span>
        </div>

        <h2 className="font-fraunces text-[22px] font-medium leading-snug text-[var(--ink)]">
          {wallet.connected ? 'Connected Account' : 'Connect Solana Wallet'}
        </h2>

        {wallet.connected ? (
          <div className="mt-4">
            <div className="p-4 rounded-[14px] space-y-3 bg-[var(--bg)] border border-[var(--line)]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase tracking-wider block font-semibold text-[var(--ink)]">
                  Solana Wallet
                </span>
                <span className="px-2 py-0.5 rounded-[10px] text-[12px] font-medium bg-[var(--moss-tint)] text-[#3E5531]">
                  Active
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] font-medium text-[var(--ink)] break-all select-all">
                    {wallet.address}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 ml-2 hover:bg-[var(--paper)] rounded-[6px] text-[var(--ink)] cursor-pointer border border-[var(--line)]"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[#3E5531]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[var(--line)]">
                <div>
                  <span className="text-[12px] block text-[var(--ink)]">
                    SOL Balance
                  </span>
                  <span className="font-fraunces text-[18px] font-medium text-[var(--ink)] flex items-center gap-1.5">
                    {wallet.solBalance} SOL
                    {onRefreshBalance && (
                      <button
                        type="button"
                        onClick={onRefreshBalance}
                        className="text-[var(--ink)] cursor-pointer"
                        title="Refresh Devnet Balance"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[12px] block text-[var(--ink)]">
                    Cluster
                  </span>
                  <span className="font-medium text-[13px] text-[var(--forest)] block mt-0.5">
                    Devnet
                  </span>
                </div>
              </div>
            </div>

            {/* Airdrop feedback */}
            {airdropMsg && (
              <div className="mt-3 p-2.5 rounded-[10px] bg-[var(--moss-tint)] text-[#3E5531] text-[12px] font-medium flex items-center gap-2 border border-[var(--line)]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{airdropMsg}</span>
              </div>
            )}

            {/* Explorer & Action Links */}
            <div className="mt-4 flex items-center justify-between text-[12px] px-1">
              <a
                href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--forest)] underline hover:text-[var(--ink)] font-medium"
              >
                <span>View on Solana Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={handleAirdrop}
                disabled={isAirdropping}
                className="inline-flex items-center gap-1 text-[var(--forest)] font-medium underline cursor-pointer disabled:opacity-100"
              >
                <Coins className="w-3 h-3" />
                <span>{isAirdropping ? 'Requesting...' : 'Request Devnet SOL'}</span>
              </button>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  onDisconnect();
                  onClose();
                }}
                className="w-full h-[40px] rounded-[10px] text-[13px] font-medium transition-colors hover:bg-[var(--forest-tint)] cursor-pointer text-[var(--ink)] border border-[var(--line)]"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {isWalletAvailable ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-relaxed text-[var(--ink)]">
                  Connect your browser wallet to interact with verified Nepal carbon assets on Solana Devnet.
                </p>

                <button
                  type="button"
                  onClick={handleConnectClick}
                  disabled={isConnecting}
                  className="w-full h-[52px] px-4 rounded-[12px] flex items-center justify-between transition-colors hover:bg-[var(--bg)] cursor-pointer text-left border border-[var(--line-strong)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--forest-tint)] text-[var(--forest)] flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-[var(--forest)]" />
                    </div>
                    <div>
                      <span className="text-[14px] font-medium block text-[var(--ink)]">
                        Browser Wallet
                      </span>
                      <span className="text-[12px] block text-[var(--ink)]">
                        Phantom / Solflare detected
                      </span>
                    </div>
                  </div>

                  <span className="text-[12px] font-medium px-3 py-1 rounded-[10px] bg-[var(--moss-tint)] text-[#3E5531]">
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-[14px] border border-[var(--line-strong)] bg-[var(--bg)] text-[14px] leading-relaxed text-[var(--ink)] space-y-3">
                <p className="font-medium">
                  No Solana wallet found. Install Phantom or Solflare, then open this app in a normal browser tab.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href="https://phantom.app"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[var(--forest)] text-white text-[13px] font-medium hover:bg-[#234A3C]"
                  >
                    <span>Phantom</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://solflare.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[var(--line-strong)] text-[var(--ink)] text-[13px] font-medium hover:bg-[var(--paper)]"
                  >
                    <span>Solflare</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
