import React, { useState, useEffect } from 'react';
import { PurchaseReceipt } from '../types';
import { getSavedReceipts, formatUtcDate, lamportsToSol } from '../lib/receiptStorage';
import { generatePurchasePdf } from '../lib/pdfGenerator';
import { X, ExternalLink, Download, FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface MyPurchasesModalProps {
  walletAddress: string | null;
  onClose: () => void;
}

export function MyPurchasesModal({ walletAddress, onClose }: MyPurchasesModalProps) {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [generatingReceiptNo, setGeneratingReceiptNo] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ receiptNo: string; message: string } | null>(null);

  useEffect(() => {
    const list = getSavedReceipts(walletAddress);
    setReceipts(list);
  }, [walletAddress]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async (receipt: PurchaseReceipt) => {
    setDownloadError(null);
    setGeneratingReceiptNo(receipt.receiptNo);
    try {
      await generatePurchasePdf(receipt);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setDownloadError({
        receiptNo: receipt.receiptNo,
        message: 'Could not create the PDF. Please try again.',
      });
    } finally {
      setGeneratingReceiptNo(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-purchases-title"
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(23, 36, 29, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[680px] max-h-[85vh] rounded-[20px] bg-white border border-[rgba(27,58,47,0.16)] shadow-2xl flex flex-col overflow-hidden font-inter select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[rgba(27,58,47,0.12)] flex items-center justify-between gap-4 shrink-0 bg-white">
          <div>
            <h2
              id="my-purchases-title"
              className="font-fraunces text-[22px] sm:text-[24px] font-[500] text-[#17241D] leading-tight"
            >
              My Purchases
            </h2>
            <p className="text-[12.5px] text-[#55695E] mt-0.5">
              Saved purchase receipts and certificates for{' '}
              <span className="font-mono text-[11.5px] text-[#17241D]">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}` : 'connected wallet'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[10px] border border-[rgba(27,58,47,0.18)] bg-white hover:bg-[#E7EEE9] text-[#17241D] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close my purchases modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Small Notice Banner */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#F5F8F6] border-b border-[rgba(27,58,47,0.08)] flex items-center gap-2 text-[12px] text-[#4A5E52] shrink-0">
          <Info className="w-3.5 h-3.5 text-[#1B3A2F] shrink-0" />
          <span>Receipts are saved in this browser. Download your PDFs to keep them.</span>
        </div>

        {/* Body list */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {receipts.length === 0 ? (
            <div className="py-14 text-center">
              <FileText className="w-9 h-9 mx-auto text-[#1B3A2F] opacity-35 mb-2" />
              <p className="text-[15px] font-[500] text-[#17241D]">No purchases yet.</p>
              <p className="text-[13px] text-[#55695E] mt-1 max-w-[340px] mx-auto">
                Completed purchases on Solana devnet will automatically appear here with downloadable paperwork.
              </p>
            </div>
          ) : (
            receipts.map((receipt) => {
              const dateStr = formatUtcDate(receipt.blockTime);
              const solTotal = lamportsToSol(receipt.totalLamports, 4);
              const isGenerating = generatingReceiptNo === receipt.receiptNo;
              const hasError = downloadError?.receiptNo === receipt.receiptNo;

              return (
                <div
                  key={receipt.receiptNo}
                  className="p-4 rounded-[14px] bg-white border border-[rgba(27,58,47,0.12)] hover:border-[rgba(27,58,47,0.25)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs"
                >
                  {/* Left Column: Project name, qty, total, date, receipt no */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[14.5px] text-[#17241D] truncate">
                        {receipt.projectName}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7EEE9] text-[#1B3A2F]">
                        {receipt.qty.toLocaleString()} tCO2e
                      </span>
                      {receipt.retire && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EEF2E7] text-[#3E5531]">
                          Retired
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-[12px] text-[#55695E] flex-wrap">
                      <span className="font-semibold text-[#17241D] tabular-nums">
                        {solTotal} SOL
                      </span>
                      <span>·</span>
                      <span>{dateStr}</span>
                      <span>·</span>
                      <span className="font-mono text-[11px] text-[#6D8075]">
                        {receipt.receiptNo}
                      </span>
                    </div>

                    {/* Status/Error under row */}
                    {isGenerating && (
                      <p className="mt-1.5 text-[11.5px] text-[#1B3A2F] font-medium animate-pulse">
                        Preparing your document...
                      </p>
                    )}
                    {hasError && (
                      <p className="mt-1.5 text-[11.5px] text-[#8A5327] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{downloadError.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <a
                      href={`https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-[8px] border border-[rgba(27,58,47,0.18)] hover:bg-[#E7EEE9] text-[12px] font-medium text-[#17241D] flex items-center gap-1 transition-colors"
                      title="View transaction on Solana Explorer"
                    >
                      <span>Explorer</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>

                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleDownload(receipt)}
                      className="px-3 py-1.5 rounded-[8px] bg-[var(--forest)] text-white hover:bg-[#234A3C] disabled:opacity-50 text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(27,58,47,0.12)] bg-white flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[10px] border border-[rgba(27,58,47,0.18)] hover:bg-[#E7EEE9] text-[13px] font-medium text-[#17241D] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
