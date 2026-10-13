import React, { useState } from 'react';
import { Radio, ShieldCheck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { VerificationQueueItem } from '../types';
import { Connection } from '@solana/web3.js';
import { RPC_URL, RECIPIENT_ADDRESS } from '../config';

interface VerifyViewProps {
  queueItems: VerificationQueueItem[];
}

export function VerifyView({ queueItems }: VerifyViewProps) {
  // Verify receipt state
  const [verifySigInput, setVerifySigInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<{
    found: boolean;
    sender?: string;
    recipient?: string;
    amountSol?: number;
    memoJson?: string | null;
    matchesRecipient?: boolean;
    error?: string;
  } | null>(null);

  const handleCheckReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const sig = verifySigInput.trim();
    if (!sig) return;

    // Validate input as base58 (87 to 88 characters) before the call
    const isBase58 = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(sig);
    if (!isBase58) {
      setVerifyResult({
        found: false,
        error: 'Transaction not found on devnet.',
      });
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const parsedTx = await connection.getParsedTransaction(sig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!parsedTx) {
        setVerifyResult({
          found: false,
          error: 'Transaction not found on devnet.',
        });
        return;
      }

      let sender = '';
      let recipient = '';
      let amountSol = 0;
      let memoJson: string | null = null;

      if (parsedTx.transaction.message.accountKeys.length > 0) {
        sender = parsedTx.transaction.message.accountKeys[0].pubkey.toString();
      }

      for (const ix of parsedTx.transaction.message.instructions) {
        if ('parsed' in ix && ix.parsed) {
          if (ix.program === 'system' && ix.parsed.type === 'transfer') {
            const info = ix.parsed.info;
            if (info) {
              sender = info.source || sender;
              recipient = info.destination || recipient;
              amountSol = (info.lamports || 0) / 1e9;
            }
          } else if (ix.program === 'spl-memo' || ix.programId.toString().includes('Memo')) {
            memoJson = typeof ix.parsed === 'string' ? ix.parsed : JSON.stringify(ix.parsed);
          }
        }
      }

      if (!recipient && parsedTx.transaction.message.accountKeys.length > 1) {
        recipient = parsedTx.transaction.message.accountKeys[1].pubkey.toString();
      }

      const matchesRecipient = recipient.toLowerCase() === RECIPIENT_ADDRESS.toLowerCase();

      setVerifyResult({
        found: true,
        sender,
        recipient,
        amountSol,
        memoJson,
        matchesRecipient,
      });
    } catch (err) {
      console.error('Error verifying receipt transaction:', err);
      setVerifyResult({
        found: false,
        error: 'Transaction not found on devnet.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 select-none font-inter">
      {/* Top Banner */}
      <div className="bg-[var(--paper)] rounded-[20px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--line)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#8A5327]" />
            <span className="text-[12px] font-semibold tracking-wider uppercase text-[var(--ink)]">
              MRV & Cryptographic Proof
            </span>
          </div>
          <h2 className="font-fraunces text-[28px] font-medium text-[var(--ink)]">
            Digital Verification & Satellite Ground-Truth
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[var(--ink)] max-w-[620px]">
            Every credit is verified via continuous dIoT sensor feeds and European Space Agency multispectral NDVI canopy imagery before on-chain minting on Solana.
          </p>
        </div>

        <div className="px-4 py-2 rounded-full bg-[var(--moss-tint)] border border-[var(--line)] flex items-center gap-2 text-[#3E5531] text-[13px] font-medium self-start md:self-auto shrink-0">
          <Activity className="w-4 h-4 text-[#3E5531]" />
          <span>Solana Oracle Node: Healthy</span>
        </div>
      </div>

      {/* VERIFY A RECEIPT CARD */}
      <div className="bg-[var(--paper)] rounded-[14px] p-6 border border-[var(--line)]">
        <h3 className="font-fraunces text-[20px] font-medium text-[var(--ink)] mb-1">
          Verify a receipt
        </h3>
        <p className="text-[13.5px] text-[#55695E] mb-4">
          Enter any Solana devnet transaction signature to independently audit on-chain recipient settlement and carbon metadata.
        </p>

        <form onSubmit={handleCheckReceipt} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={verifySigInput}
              onChange={(e) => setVerifySigInput(e.target.value)}
              placeholder="Transaction signature (e.g. 87-88 character hash)"
              className="flex-1 h-[42px] px-3.5 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] text-[13px] font-mono text-[var(--ink)] placeholder-[#899C91] focus:outline-none focus:border-[var(--forest)]"
              aria-label="Transaction signature"
            />
            <button
              type="submit"
              disabled={isVerifying || !verifySigInput.trim()}
              className="h-[42px] px-6 rounded-[10px] text-white text-[13.5px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{
                backgroundColor: 'var(--forest)',
              }}
            >
              {isVerifying ? 'Checking...' : 'Check'}
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {verifyResult && (
          <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-3">
            {verifyResult.found ? (
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--moss-tint)',
                      color: '#3E5531',
                    }}
                  >
                    Verified
                  </span>
                  <span className="text-[#55695E] font-medium">On-chain transaction confirmed</span>
                </div>

                <div className="p-3.5 rounded-[10px] bg-[var(--bg)] border border-[var(--line)] space-y-2 font-mono text-[12px]">
                  <div>
                    <span className="text-[#55695E] font-sans block text-[11px] uppercase font-semibold">Sender (Buyer)</span>
                    <span className="text-[var(--ink)] break-all">{verifyResult.sender}</span>
                  </div>
                  <div>
                    <span className="text-[#55695E] font-sans block text-[11px] uppercase font-semibold">Recipient (Payment Destination)</span>
                    <span className="text-[var(--ink)] break-all">{verifyResult.recipient}</span>
                  </div>
                  <div>
                    <span className="text-[#55695E] font-sans block text-[11px] uppercase font-semibold">Amount Transferred</span>
                    <span className="text-[var(--ink)] font-semibold">{verifyResult.amountSol?.toFixed(4)} SOL</span>
                  </div>
                  {verifyResult.memoJson && (
                    <div>
                      <span className="text-[#55695E] font-sans block text-[11px] uppercase font-semibold">Memo Metadata</span>
                      <span className="text-[var(--ink)] break-all bg-white px-2 py-1 rounded border border-[var(--line)] block mt-0.5">
                        {verifyResult.memoJson}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recipient match evaluation */}
                {verifyResult.matchesRecipient ? (
                  <div
                    className="p-3 rounded-[10px] text-[12.5px] font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--moss-tint)',
                      color: '#3E5531',
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Matches the Himalaya Carbon wallet</span>
                  </div>
                ) : (
                  <div
                    className="p-3 rounded-[10px] text-[12.5px] font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--clay-tint)',
                      color: '#8A5327',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Does not match the Himalaya Carbon wallet</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="p-3 rounded-[10px] text-[12.5px] font-medium flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--clay-tint)',
                  color: '#8A5327',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyResult.error || 'Transaction not found on devnet.'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[var(--paper)] rounded-[20px] p-6 border border-[var(--line)]">
          <div className="w-[42px] h-[42px] rounded-full border border-[var(--line)] bg-[var(--paper)] mb-4 flex items-center justify-center text-[#2B6CB0]">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="font-fraunces text-[19px] font-medium text-[var(--ink)]">
            1. River Flow Sensor Feeds
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink)]">
            Ultrasonic stream-flow sensors installed at Gandaki and Koshi river turbines measure real-time MWh generation to calculate exact displacement of coal-fired grid imports.
          </p>
        </div>

        <div className="bg-[var(--paper)] rounded-[20px] p-6 border border-[var(--line)]">
          <div className="w-[42px] h-[42px] rounded-full border border-[var(--line)] bg-[var(--paper)] mb-4 flex items-center justify-center text-[var(--forest)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-fraunces text-[19px] font-medium text-[var(--ink)]">
            2. Satellite Multispectral NDVI Ground Truth
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink)]">
            Spectral satellite analysis monitors 10m-resolution vegetative health and canopy density across 38 community forestry plots in Bagmati and Karnali to prove zero deforestation.
          </p>
        </div>

        <div className="bg-[var(--paper)] rounded-[20px] p-6 border border-[var(--line)]">
          <div className="w-[42px] h-[42px] rounded-full border border-[var(--line)] bg-[var(--paper)] mb-4 flex items-center justify-center text-[#5C7A4A]">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-fraunces text-[19px] font-medium text-[var(--ink)]">
            3. Automated On-Chain Minting
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink)]">
            When sensor data and independent auditor sign-offs match registered baselines, smart contracts automatically mint Solana SPL-20 environmental credit tokens.
          </p>
        </div>
      </div>

      {/* Live Verification Queue List */}
      <div className="bg-[var(--paper)] rounded-[20px] p-6 sm:p-7 border border-[var(--line)]">
        <h3 className="font-fraunces text-[20px] font-medium text-[var(--ink)] mb-4">
          Audit Queue & Verification Status
        </h3>
        <div className="space-y-3">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-[14px] bg-[var(--bg)] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="font-medium text-[15px] text-[var(--ink)]">
                  {item.name}
                </div>
                <div className="text-[13px] text-[var(--ink)] mt-0.5">
                  {item.location} · {item.sizeOrCapacity} · Submitted: {item.submittedDate}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-[var(--ink)]">
                  Standard: {item.methodology}
                </span>
                <span
                  className="px-3 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: item.status === 'Verified' ? 'var(--moss-tint)' : 'var(--clay-tint)',
                    color: item.status === 'Verified' ? '#3E5531' : '#8A5327',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block mr-1.5 align-middle"
                    style={{
                      backgroundColor: item.status === 'Verified' ? '#3E5531' : '#8A5327',
                    }}
                  />
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
