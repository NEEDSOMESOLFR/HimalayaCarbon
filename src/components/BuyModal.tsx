/**
 * PHASE 0: DIAGNOSE REPORT
 * -----------------------------------------------------------------------------
 * 1. Fake or simulated purchase:
 *    - src/components/BuyModal.tsx:204: Fake signature generated via Math.random() ('5x' + Math.random()...).
 *    - src/components/BuyModal.tsx:213-226: Called signMessage (arbitrary text message) instead of a Solana transaction; swallowed errors in catch block.
 *    - src/components/BuyModal.tsx:232: Simulated Devnet confirmation with await new Promise(res => setTimeout(res, 1200)).
 *    - src/components/BuyModal.tsx:260-277: Set completedTx state and called onSuccess without submitting or awaiting an on-chain Solana transaction.
 * 2. Fake wallet:
 *    - src/components/BuyModal.tsx:68: Hardcoded fallback balance of 6.0186 SOL used when no walletBalance was provided.
 *    - src/App.tsx:224-233: handleConnectDemo connecting hardcoded address '7xKZ84mQpN9vLR2vY19qWdE4t4s8pP' with hardcoded 14.8 SOL balance.
 *    - src/components/WalletModal.tsx:280-305: "Devnet Sandbox Keypair" button setting mock demo state without real wallet provider.
 * 3. @solana/web3.js & SystemProgram.transfer:
 *    - @solana/web3.js was imported in src/lib/phantom.ts for getBalance/airdrop, but NOT in BuyModal.tsx.
 *    - SystemProgram.transfer was NEVER called anywhere in the codebase (0 calls).
 * 4. Buy button wiring & error swallowing:
 *    - The Buy button was wired to handlePurchase, but errors were caught and ignored, proceeding to fake success via setTimeout.
 * 5. Iframe/preview environment:
 *    - The application runs inside an iframe (window.self !== window.top) in preview environments where wallet popups may be blocked without a top-level tab.
 * -----------------------------------------------------------------------------
 * REMOVAL: All simulated purchase logic, fake signatures, mock demo wallets, and hardcoded balances have been removed.
 * Real on-chain Solana Devnet transactions via SystemProgram.transfer + Memo instruction are now executed and verified.
 */

import React, { useState, useEffect, useRef, useId } from 'react';
import { ProjectListing, RetirementCertificate, PurchaseReceipt } from '../types';
import { X, ExternalLink, AlertCircle, Download } from 'lucide-react';
import { generateReceiptNumber, saveReceipt } from '../lib/receiptStorage';
import { generatePurchasePdf } from '../lib/pdfGenerator';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  RPC_URL,
  RECIPIENT_ADDRESS,
  TREASURY_ADDRESS,
  MEMO_PROGRAM_ID,
  DEVNET_GENESIS_HASH,
  IS_RECIPIENT_VALID,
  IS_TREASURY_VALID,
} from '../config';
import { getSolanaProvider } from '../lib/phantom';

interface BuyModalProps {
  listing: ProjectListing;
  onClose: () => void;
  onSuccess: (purchase: {
    listing: ProjectListing;
    amount: number;
    retired: boolean;
    certificate?: RetirementCertificate;
  }) => void;
  walletConnected: boolean;
  walletAddress?: string | null;
  onConnectWallet: () => void;
  solUsdRate?: number;
  walletBalance?: number;
}

const DEFAULT_RETIRE = false;
const NETWORK_FEE_LAMPORTS = 10_000; // 0.00001 SOL
const NETWORK_FEE_SOL = 0.00001;
const LAMPORTS_PER_SOL = 1_000_000_000;

export function BuyModal({
  listing,
  onClose,
  onSuccess,
  walletConnected,
  walletAddress,
  onConnectWallet,
  solUsdRate,
  walletBalance,
}: BuyModalProps) {
  // Focus return ref and input ref
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const quantityInputRef = useRef<HTMLInputElement | null>(null);

  // Accessible IDs
  const titleId = useId();
  const pricePanelId = useId();
  const errorId = useId();

  // State
  const [quantityInput, setQuantityInput] = useState<string>('1');
  const [retireImmediately, setRetireImmediately] = useState<boolean>(DEFAULT_RETIRE);
  const [txStep, setTxStep] = useState<'idle' | 'awaiting_signature' | 'confirming' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isInsufficientSol, setIsInsufficientSol] = useState<boolean>(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [showNoWalletNotice, setShowNoWalletNotice] = useState<boolean>(false);

  const [completedTx, setCompletedTx] = useState<{
    txHash: string;
    certId?: string;
    amount: number;
    totalSol: string;
    date: string;
  } | null>(null);

  const [currentReceipt, setCurrentReceipt] = useState<PurchaseReceipt | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Rates and Balances
  const rate = solUsdRate && solUsdRate > 0 ? solUsdRate : 148.5;
  const isDemoRate = !solUsdRate || solUsdRate <= 0;

  // Real wallet balance from connection.getBalance via App.tsx (no fake 6.0186 fallback)
  const effectiveBalance = walletConnected && typeof walletBalance === 'number' ? walletBalance : 0;

  // Integer Lamport Calculations
  const priceSol = listing.pricePerTon / rate;
  const priceLamports = Math.round(priceSol * 1e9);
  const unitPriceSol6 = (priceLamports / LAMPORTS_PER_SOL).toFixed(6);
  const unitUsd = listing.pricePerTon.toFixed(2);

  // Parse quantity
  const parsedQty = parseInt(quantityInput.trim(), 10);
  const isQtyValid = !isNaN(parsedQty) && parsedQty > 0 && String(parsedQty) === quantityInput.trim();

  // Current calculations
  const currentQty = isQtyValid ? parsedQty : 0;
  const subtotalLamportsBigInt = BigInt(currentQty) * BigInt(priceLamports);
  const totalLamportsBigInt = subtotalLamportsBigInt + BigInt(NETWORK_FEE_LAMPORTS);

  const isSafeInteger = totalLamportsBigInt <= BigInt(Number.MAX_SAFE_INTEGER);
  const totalLamports = isSafeInteger ? Number(totalLamportsBigInt) : 0;
  const subtotalLamports = isSafeInteger ? Number(subtotalLamportsBigInt) : 0;

  const subtotalSol = (subtotalLamports / LAMPORTS_PER_SOL).toFixed(4);
  const totalSol = (totalLamports / LAMPORTS_PER_SOL).toFixed(4);
  const totalUsd = ((totalLamports / LAMPORTS_PER_SOL) * rate).toFixed(2);

  // Maximum affordable amount
  const walletLamports = Math.round(effectiveBalance * LAMPORTS_PER_SOL);
  const affordableLamports = Math.max(0, walletLamports - NETWORK_FEE_LAMPORTS);
  const affordableQty = priceLamports > 0 ? Math.floor(affordableLamports / priceLamports) : 0;
  const maxAffordableOrAvailable = walletConnected
    ? Math.max(1, Math.min(listing.availableAmount, affordableQty > 0 ? affordableQty : listing.availableAmount))
    : listing.availableAmount;

  // Check if buyer is owner
  const isOwner = Boolean(
    (listing as any).owner &&
    walletAddress &&
    (listing as any).owner.toLowerCase() === walletAddress.toLowerCase()
  );

  // Validation
  let validationError: string | null = null;
  if (!IS_RECIPIENT_VALID) {
    validationError = 'Recipient address is misconfigured.';
  } else if (quantityInput.trim() === '' || isNaN(parsedQty) || parsedQty <= 0 || !Number.isInteger(parsedQty) || String(parsedQty) !== quantityInput.trim()) {
    validationError = 'Enter a whole number of credits.';
  } else if (parsedQty > listing.availableAmount) {
    validationError = `Only ${listing.availableAmount.toLocaleString()} tCO2e available.`;
  } else if (!isSafeInteger) {
    validationError = 'Order amount exceeds maximum safe integer range.';
  } else if (walletConnected && walletAddress && walletAddress.toLowerCase() === RECIPIENT_ADDRESS.toLowerCase()) {
    validationError = 'Connected wallet cannot be the recipient address.';
  } else if (walletConnected && effectiveBalance < (totalLamports / LAMPORTS_PER_SOL)) {
    const shortageLamports = Math.max(0, totalLamports - walletLamports);
    const shortageSol = (shortageLamports / LAMPORTS_PER_SOL).toFixed(4);
    validationError = `Not enough devnet SOL. You need ${shortageSol} more.`;
  }

  // Accessibility: store trigger and focus trap
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    quantityInputRef.current?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      triggerRef.current?.focus();
    };
  }, []);

  // Trap focus and handle escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (txStep === 'awaiting_signature') {
        e.preventDefault();
        return;
      }
      if (txStep === 'confirming') {
        if (!window.confirm('Transaction is confirming on Solana. Are you sure you want to close?')) {
          e.preventDefault();
          return;
        }
      }
      onClose();
    } else if (e.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  };

  const handleSafeClose = () => {
    if (txStep === 'awaiting_signature') {
      return;
    }
    if (txStep === 'confirming') {
      if (!window.confirm('Transaction is confirming on Solana. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  // Quantity helpers
  const handleStep = (delta: number) => {
    const current = isQtyValid ? parsedQty : 1;
    const next = Math.max(1, Math.min(listing.availableAmount, current + delta));
    setQuantityInput(String(next));
  };

  const handleSetPreset = (val: number) => {
    setQuantityInput(String(val));
  };

  // REAL SOLANA DEVNET PURCHASE TRANSACTION VIA BACKEND API
  const handlePurchase = async () => {
    if (!walletConnected) {
      const provider = getSolanaProvider();
      if (!provider) {
        setShowNoWalletNotice(true);
      } else {
        onConnectWallet();
      }
      return;
    }

    const provider = getSolanaProvider();
    if (!provider) {
      setShowNoWalletNotice(true);
      return;
    }

    if (!walletAddress) {
      setErrorMessage('Wallet address is missing. Please reconnect.');
      return;
    }

    if (isOwner || validationError || !isQtyValid || currentQty <= 0) {
      return;
    }

    setErrorMessage(null);
    setErrorDetails(null);
    setIsInsufficientSol(false);
    setLastSignature(null);

    setTxStep('awaiting_signature');

    let connection: Connection;
    let blockhash: string;
    let lastValidBlockHeight: number;
    let signature: string;

    try {
      connection = new Connection(RPC_URL, 'confirmed');

      // 1. Call backend /api/buy to get atomic transaction partially signed by issuer
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: listing.id,
          projectName: listing.name,
          qty: currentQty,
          retire: retireImmediately,
          buyerWallet: walletAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to build purchase transaction');
      }

      const { transaction: txBase64, blockhash: bh, lastValidBlockHeight: lvb } = data;
      blockhash = bh;
      lastValidBlockHeight = lvb;

      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));

      // 2. Request wallet signature and send (prefer signTransaction to preserve multi-signatures)
      if (typeof provider.signTransaction === 'function') {
        const signedTx = await provider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
      } else if (typeof provider.signAndSendTransaction === 'function') {
        const sendResult = await provider.signAndSendTransaction(tx);
        signature = typeof sendResult === 'string' ? sendResult : sendResult.signature;
      } else {
        throw new Error('Wallet provider does not support signing transactions.');
      }

      console.info('[purchase] Signature received:', signature);
      setTxStep('confirming');
      setLastSignature(signature);

      // 3. Confirm transaction
      const confirmResult = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      if (confirmResult.value.err) {
        throw new Error(`Transaction failed during confirmation: ${JSON.stringify(confirmResult.value.err)}`);
      }

      let slot = 0;
      let blockTime = Math.floor(Date.now() / 1000);
      let isApproximateTime = false;
      let feeLamports: string | undefined = undefined;

      try {
        const parsedTx = await connection.getParsedTransaction(signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });
        if (parsedTx) {
          slot = parsedTx.slot;
          if (parsedTx.blockTime) blockTime = parsedTx.blockTime;
          if (parsedTx.meta?.fee !== undefined) feeLamports = parsedTx.meta.fee.toString();
        }
      } catch (txMetaErr) {
        isApproximateTime = true;
      }

      const receiptNo = generateReceiptNumber(blockTime, signature);

      const purchaseReceipt: PurchaseReceipt = {
        receiptNo,
        signature,
        slot,
        blockTime,
        isApproximateTime,
        buyer: walletAddress,
        recipient: RECIPIENT_ADDRESS,
        projectId: listing.id,
        projectName: listing.name,
        category: listing.category,
        province: listing.province,
        qty: currentQty,
        unitPriceLamports: priceLamports.toString(),
        totalLamports: totalLamports.toString(),
        feeLamports,
        demoSolUsd: rate,
        retire: retireImmediately,
        cluster: 'devnet',
      };

      saveReceipt(purchaseReceipt);
      setCurrentReceipt(purchaseReceipt);

      const certId = retireImmediately
        ? 'HC-NPL-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
        : undefined;

      const dateStr = new Date(blockTime * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const certificate: RetirementCertificate | undefined = retireImmediately
        ? {
            certificateId: certId!,
            projectName: listing.name,
            category: listing.category,
            amount: currentQty,
            beneficiary: 'Anonymous Offset',
            reason: 'Tokenized tCO2e offset retirement',
            txSignature: signature,
            timestamp: new Date(blockTime * 1000).toISOString(),
            retiredBy: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
          }
        : undefined;

      setCompletedTx({
        txHash: signature,
        certId,
        amount: currentQty,
        totalSol,
        date: dateStr,
      });

      setTxStep('success');

      onSuccess({
        listing,
        amount: currentQty,
        retired: retireImmediately,
        certificate,
      });
    } catch (err: any) {
      console.error('[purchase] Error:', err);
      setTxStep('idle');
      const msg = err?.message || String(err);
      if (err?.code === 4001 || msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('cancelled')) {
        setErrorMessage('Transaction cancelled in your wallet.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setErrorMessage('Not enough devnet SOL.');
        setIsInsufficientSol(true);
      } else {
        setErrorMessage(msg);
      }
    }
  };

  const handleDownloadReceipt = async () => {
    if (!currentReceipt) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      await generatePurchasePdf(currentReceipt);
    } catch (err: any) {
      console.error('[purchase] PDF generation error:', err);
      setPdfError('Could not create the PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Category Tag Config
  let categoryTagLabel = 'Hydropower';
  let categoryTagBg = 'var(--hydro-tint)';
  let categoryTagText = 'var(--hydro)';
  if (listing.category === 'forestry') {
    categoryTagLabel = 'Community forestry';
    categoryTagBg = 'var(--forest-tint)';
    categoryTagText = 'var(--forest)';
  } else if (listing.category === 'biogas') {
    categoryTagLabel = 'Biogas';
    categoryTagBg = 'var(--moss-tint)';
    categoryTagText = 'var(--moss)';
  }

  const isInputsReadOnly = txStep === 'awaiting_signature' || txStep === 'confirming';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={pricePanelId}
      onKeyDown={handleKeyDown}
      className="buy-modal-overlay fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Scoped CSS for Frosted Glass Morphism, fallbacks and reduced motion */}
      <style>{`
        @keyframes buyModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes buyModalSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .buy-modal-overlay {
          background: rgba(23, 36, 29, 0.35);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: buyModalFadeIn 200ms ease-out forwards;
        }

        .buy-modal-surface {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          border-radius: 20px;
          box-shadow: 0 24px 64px rgba(23, 36, 29, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          animation: buyModalSlideIn 200ms ease-out forwards;
        }

        .buy-modal-footer {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
        }

        .buy-modal-panel {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(27, 58, 47, 0.12);
          box-shadow: none;
        }

        .buy-modal-input {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(27, 58, 47, 0.22);
        }

        .buy-modal-input:focus {
          background: #FFFFFF !important;
          outline: 2px solid var(--forest) !important;
          outline-offset: 2px !important;
        }

        .buy-modal-chip {
          background: transparent;
          border: 1px solid rgba(27, 58, 47, 0.22);
          color: #17241D;
        }

        .buy-modal-chip:hover:not(:disabled) {
          background: rgba(231, 238, 233, 0.9);
        }

        .buy-modal-chip.selected {
          background: var(--forest) !important;
          border-color: var(--forest) !important;
          color: #FFFFFF !important;
        }

        .buy-modal-close-btn {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(27, 58, 47, 0.22);
        }

        .buy-modal-close-btn:hover {
          background: rgba(231, 238, 233, 0.9);
        }

        .buy-modal-primary-btn {
          background: var(--clay) !important;
          color: #FFFFFF !important;
          border-radius: 10px;
          height: 44px;
          width: 100%;
          border: none;
          box-shadow: 0 1px 0 rgba(23, 36, 29, 0.12);
        }

        .buy-modal-error {
          background: rgba(251, 238, 226, 0.9);
          border: 1px solid var(--clay-tint);
          color: #8A5327;
        }

        /* Fallback for browsers without backdrop-filter support */
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .buy-modal-overlay {
            background: rgba(23, 36, 29, 0.6);
          }
          .buy-modal-surface {
            background: #FFFFFF;
          }
          .buy-modal-footer {
            background: #FFFFFF;
          }
        }

        /* Accessibility: prefers-reduced-transparency */
        @media (prefers-reduced-transparency: reduce) {
          .buy-modal-surface,
          .buy-modal-panel,
          .buy-modal-input,
          .buy-modal-footer {
            background: #FFFFFF !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          .buy-modal-overlay {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }

        /* Accessibility: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .buy-modal-overlay,
          .buy-modal-surface {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        ref={modalRef}
        className="buy-modal-surface w-full flex flex-col relative overflow-hidden"
        style={{
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
        }}
      >
        {/* ================= HEADER ZONE ================= */}
        <div className="shrink-0 p-6 max-[480px]:p-4 pb-4 max-[480px]:pb-3 border-b border-[rgba(27,58,47,0.12)] relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-8">
              <div
                className="text-[12px] uppercase font-[500] tracking-[0.04em]"
                style={{ color: '#17241D' }}
              >
                BUY CREDITS
              </div>

              <h2
                id={titleId}
                className="font-fraunces text-[24px] font-[500] tracking-[-0.01em] leading-snug mt-1 truncate"
                style={{ color: '#17241D' }}
              >
                {listing.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[13px]" style={{ color: '#17241D' }}>
                <span className="font-[400]" style={{ color: '#17241D' }}>
                  {listing.province} Province - {listing.capacityOrSize}
                </span>

                <span
                  className="px-2 py-0.5 rounded-[10px] text-[12px] font-[500]"
                  style={{
                    backgroundColor: categoryTagBg,
                    color: categoryTagText,
                  }}
                >
                  {categoryTagLabel}
                </span>

                <span
                  className="px-2 py-0.5 rounded-[10px] text-[12px] font-[500]"
                  style={{
                    backgroundColor: 'var(--moss-tint)',
                    color: '#3E5531',
                  }}
                >
                  Verified
                </span>
              </div>
            </div>

            {/* Close Button top-right */}
            <button
              type="button"
              onClick={handleSafeClose}
              disabled={txStep === 'awaiting_signature'}
              aria-label="Close"
              className="buy-modal-close-btn absolute top-6 right-6 max-[480px]:top-4 max-[480px]:right-4 w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
              style={{ color: '#17241D' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE BODY ZONE ================= */}
        <div className="flex-1 overflow-y-auto p-6 max-[480px]:p-4 space-y-5">
          {/* No Wallet Provider Detected Notice */}
          {showNoWalletNotice && (
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

          {txStep === 'success' && completedTx ? (
            /* SUCCESS STATE (replaces body ONLY after confirmed transaction) */
            <div className="space-y-4 py-2">
              <div>
                <h3
                  className="font-fraunces text-[24px] font-[500] tracking-[-0.01em]"
                  style={{ color: '#17241D' }}
                >
                  Purchase complete
                </h3>
                <p className="text-[13px] mt-1 font-[400]" style={{ color: '#17241D' }}>
                  {completedTx.amount} tCO2e of verified Nepali environmental credits settled for{' '}
                  <span className="font-[600]" style={{ color: '#17241D' }}>
                    {completedTx.totalSol} SOL
                  </span>
                  .
                </p>
              </div>

              {/* Devnet Signature Link */}
              <div
                className="buy-modal-panel p-3.5 rounded-[14px] flex items-center justify-between text-[13px]"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-[12px] font-[400]" style={{ color: '#17241D' }}>
                    Solana Devnet Signature
                  </div>
                  <div className="font-mono text-[12px] truncate font-[500]" style={{ color: '#17241D' }}>
                    {completedTx.txHash}
                  </div>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${completedTx.txHash}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-[rgba(27,58,47,0.22)] text-[12px] font-[500] hover:bg-[rgba(231,238,233,0.9)] focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                  style={{ color: '#17241D' }}
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Retirement Certificate Card (if retired) */}
              {retireImmediately && completedTx.certId && (
                <div
                  className="buy-modal-panel p-4 rounded-[14px] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[12px] uppercase tracking-[0.04em] font-[500]"
                      style={{ color: '#17241D' }}
                    >
                      RETIREMENT RECORD
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-[10px] text-[11px] font-[500]"
                      style={{ backgroundColor: 'var(--moss-tint)', color: '#3E5531' }}
                    >
                      Permanently Burned
                    </span>
                  </div>

                  <div>
                    <div className="text-[12px] font-[400]" style={{ color: '#17241D' }}>
                      Retired Volume
                    </div>
                    <div
                      className="font-fraunces text-[20px] font-[500] tracking-[-0.01em]"
                      style={{ color: '#17241D' }}
                    >
                      {completedTx.amount} tCO2e
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] pt-2 border-t border-[rgba(27,58,47,0.12)]">
                    <div>
                      <span className="text-[12px] block font-[400]" style={{ color: '#17241D' }}>
                        Beneficiary
                      </span>
                      <span className="font-[500]" style={{ color: '#17241D' }}>
                        Anonymous Offset
                      </span>
                    </div>

                    <div>
                      <span className="text-[12px] block font-[400]" style={{ color: '#17241D' }}>
                        Certificate ID
                      </span>
                      <span className="font-mono text-[12px] font-[500]" style={{ color: 'var(--forest)' }}>
                        {completedTx.certId}
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-[12px] block font-[400]" style={{ color: '#17241D' }}>
                        Settlement Date
                      </span>
                      <span className="font-[400]" style={{ color: '#17241D' }}>{completedTx.date}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Download Receipt (PDF) */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  disabled={isGeneratingPdf || !currentReceipt}
                  onClick={handleDownloadReceipt}
                  className="w-full h-[44px] rounded-[10px] text-white flex items-center justify-center gap-2 text-[14px] font-[500] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors hover:brightness-105"
                  style={{
                    backgroundColor: 'var(--forest)',
                  }}
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download receipt (PDF)</span>
                </button>

                {isGeneratingPdf && (
                  <p className="text-center text-[12px] font-[500] animate-pulse" style={{ color: 'var(--forest)' }}>
                    Preparing your document...
                  </p>
                )}

                {pdfError && (
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-[var(--clay-tint)] border border-[rgba(200,130,74,0.3)] text-[12px] text-[#8A5327]">
                    <span>{pdfError}</span>
                    <button
                      type="button"
                      onClick={handleDownloadReceipt}
                      className="underline font-semibold cursor-pointer hover:opacity-80 ml-2 shrink-0"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD PURCHASE FORM - KEPT FILLED AND OPEN ON ERROR */
            <>
              {/* Error Notice Display */}
              {errorMessage && (
                <div
                  className="buy-modal-error p-3.5 rounded-[12px] space-y-2"
                >
                  <div className="text-[12px] leading-relaxed font-[500] flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </span>

                    {isInsufficientSol && (
                      <a
                        href="https://faucet.solana.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-semibold underline text-[var(--forest)] hover:text-[var(--ink)]"
                      >
                        Get devnet SOL
                      </a>
                    )}

                    {lastSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] font-semibold underline text-[var(--forest)] hover:text-[var(--ink)] flex items-center gap-1"
                      >
                        <span>Check Explorer</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {errorDetails && (
                    <details className="mt-1.5 text-[11px]">
                      <summary className="cursor-pointer font-medium underline text-[var(--ink)]">
                        Details
                      </summary>
                      <pre className="mt-1 p-2 rounded bg-white/80 border border-[var(--line)] whitespace-pre-wrap font-mono text-[10px] text-[var(--ink)] max-h-28 overflow-y-auto">
                        {errorDetails}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Price Panel */}
              <div
                id={pricePanelId}
                className="buy-modal-panel rounded-[14px] p-3.5 sm:p-4 grid grid-cols-2 gap-3"
              >
                <div>
                  <div className="text-[12px] font-[400]" style={{ color: '#17241D' }}>
                    Price per tCO2e
                  </div>
                  <div
                    className="font-fraunces text-[20px] font-[500] tracking-[-0.01em] mt-0.5 leading-tight"
                    style={{ color: '#17241D' }}
                  >
                    {unitPriceSol6} SOL
                  </div>
                  <div className="text-[12px] mt-0.5 font-[400]" style={{ color: '#17241D' }}>
                    ~${unitUsd} at current rate
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[12px] font-[400]" style={{ color: '#17241D' }}>
                    Available
                  </div>
                  <div
                    className="text-[16px] font-[500] mt-0.5 leading-tight"
                    style={{ color: '#17241D' }}
                  >
                    {listing.availableAmount.toLocaleString()} tCO2e
                  </div>
                </div>
              </div>

              {/* Quantity Section */}
              <div>
                <label
                  htmlFor="credit-qty-input"
                  className="block text-[13px] font-[500] mb-2"
                  style={{ color: '#17241D' }}
                >
                  Quantity (tCO2e)
                </label>

                {/* Stepper & Preset Chips Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStep(-1)}
                      disabled={isInputsReadOnly || (isQtyValid && parsedQty <= 1)}
                      aria-label="Decrease quantity"
                      className="buy-modal-input w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-[16px] font-[500] cursor-pointer hover:bg-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                      style={{ color: '#17241D' }}
                    >
                      -
                    </button>

                    <input
                      ref={quantityInputRef}
                      id="credit-qty-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      readOnly={isInputsReadOnly}
                      value={quantityInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQuantityInput(val);
                      }}
                      aria-describedby={validationError ? errorId : undefined}
                      className="buy-modal-input w-[84px] h-[40px] px-2 text-center rounded-[10px] text-[14px] font-[500] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                      style={{
                        color: '#17241D',
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleStep(1)}
                      disabled={isInputsReadOnly || (isQtyValid && parsedQty >= listing.availableAmount)}
                      aria-label="Increase quantity"
                      className="buy-modal-input w-[40px] h-[40px] rounded-[10px] flex items-center justify-center text-[16px] font-[500] cursor-pointer hover:bg-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
                      style={{ color: '#17241D' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[25, 100, 250, 500].map((preset) => {
                      const isSelected = isQtyValid && parsedQty === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          disabled={isInputsReadOnly || preset > listing.availableAmount}
                          onClick={() => handleSetPreset(preset)}
                          className={`buy-modal-chip h-[36px] px-3 rounded-full text-[13px] font-[500] cursor-pointer transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 ${
                            isSelected ? 'selected' : ''
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}

                    {/* "Max" preset chip */}
                    <button
                      type="button"
                      disabled={isInputsReadOnly || maxAffordableOrAvailable <= 0}
                      onClick={() => handleSetPreset(maxAffordableOrAvailable)}
                      className={`buy-modal-chip h-[36px] px-3 rounded-full text-[13px] font-[500] cursor-pointer transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 ${
                        isQtyValid && parsedQty === maxAffordableOrAvailable ? 'selected' : ''
                      }`}
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Helper Line */}
                <div className="mt-1.5 text-[12px] font-[400]" style={{ color: '#17241D' }}>
                  Whole credits only. Available: {listing.availableAmount.toLocaleString()} tCO2e.
                </div>
              </div>

              {/* Retire Option Panel */}
              <div
                className="buy-modal-panel rounded-[14px] p-3.5 sm:p-4 space-y-3"
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={isInputsReadOnly}
                    checked={retireImmediately}
                    onChange={(e) => setRetireImmediately(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-[#1B3A2F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--forest)]"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-[500]" style={{ color: '#17241D' }}>
                      Retire these credits now
                    </div>
                    <div className="text-[13px] mt-0.5 leading-relaxed font-[400]" style={{ color: '#17241D' }}>
                      Credits are burned on-chain and a permanent retirement record is stored via Solana memo.
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* ================= STICKY FOOTER ZONE ================= */}
        {txStep !== 'success' && (
          <div className="buy-modal-footer shrink-0 p-6 max-[480px]:p-4 border-t border-[rgba(27,58,47,0.12)] rounded-b-[20px] space-y-3.5">
            {/* Summary Rows in Inter 13px */}
            <div className="space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="font-[400]" style={{ color: '#17241D' }}>Credits</span>
                <span className="font-[500]" style={{ color: '#17241D' }}>{currentQty} tCO2e</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-[400]" style={{ color: '#17241D' }}>Subtotal</span>
                <span className="font-[500]" style={{ color: '#17241D' }}>{subtotalSol} SOL</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-[400]" style={{ color: '#17241D' }}>Network fee</span>
                <span className="font-[500]" style={{ color: '#17241D' }}>0.00001 SOL</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[rgba(27,58,47,0.12)]">
                <span className="font-[400]" style={{ color: '#17241D' }}>Your balance</span>
                <span className="font-[500]" style={{ color: '#17241D' }}>
                  {walletConnected ? `${effectiveBalance.toFixed(4)} SOL` : 'Not connected'}
                </span>
              </div>
            </div>

            {/* Total Row */}
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-[13px] font-[500]" style={{ color: '#17241D' }}>
                  Total
                </span>
                <div className="text-[12px] font-[400]" style={{ color: '#17241D' }}>
                  ~${totalUsd} {isDemoRate ? '(demo rate)' : ''}
                </div>
              </div>

              <div
                className="font-fraunces text-[24px] font-[500] tracking-[-0.01em]"
                style={{ color: '#17241D' }}
              >
                {totalSol} SOL
              </div>
            </div>

            {/* Inline Error Row */}
            {validationError && (
              <div
                id={errorId}
                aria-live="polite"
                className="buy-modal-error p-2.5 rounded-[10px] text-[12px] leading-relaxed font-[500]"
              >
                {validationError}
              </div>
            )}

            {/* Primary Action Button or Owner Notice */}
            {isOwner ? (
              <div
                className="w-full h-[44px] rounded-[10px] border border-[rgba(27,58,47,0.22)] bg-transparent flex items-center justify-center text-[14px] font-[500] select-none"
                style={{ color: '#17241D' }}
              >
                You can't buy your own credits.
              </div>
            ) : !walletConnected ? (
              <button
                type="button"
                onClick={() => {
                  const provider = getSolanaProvider();
                  if (!provider) {
                    setShowNoWalletNotice(true);
                  } else {
                    onConnectWallet();
                  }
                }}
                className="buy-modal-primary-btn font-[500] text-[14px] cursor-pointer transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
              >
                Connect wallet
              </button>
            ) : (
              <button
                type="button"
                disabled={Boolean(validationError) || isInputsReadOnly}
                onClick={handlePurchase}
                className="buy-modal-primary-btn font-[500] text-[14px] cursor-pointer transition-opacity hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2"
              >
                {txStep === 'awaiting_signature'
                  ? 'Awaiting signature'
                  : txStep === 'confirming'
                  ? 'Confirming'
                  : retireImmediately
                  ? `Buy and retire ${currentQty} tCO2e`
                  : `Buy ${currentQty} tCO2e`}
              </button>
            )}

            {/* Settles notice */}
            <div className="text-center text-[12px] font-[400]" style={{ color: '#17241D' }}>
              Settles on Solana devnet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
