import React from 'react';
import { Terminal, FileText } from 'lucide-react';

export function DocsView() {
  return (
    <div className="space-y-6 select-none font-inter">
      {/* Overview Header */}
      <div className="bg-[var(--paper)] rounded-[20px] p-6 sm:p-8 border border-[var(--line)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[var(--forest)]" />
          <span className="text-[12px] font-semibold tracking-wider uppercase text-[var(--ink)]">
            Protocol Architecture
          </span>
        </div>
        <h2 className="font-fraunces text-[28px] font-medium text-[var(--ink)]">
          Himalaya Carbon Protocol Specification
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)] max-w-[720px]">
          Himalaya Carbon tokenizes high-integrity environmental credits from the Federal Democratic Republic of Nepal onto the Solana blockchain, eliminating intermediary broker fees and ensuring permanent proof of retirement without double-counting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solana SPL Token Architecture */}
        <div className="bg-[var(--paper)] rounded-[20px] p-6 sm:p-7 border border-[var(--line)] space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--forest)]" />
            <h3 className="font-fraunces text-[19px] font-medium text-[var(--ink)]">
              1. Token Lifecycle & Minting
            </h3>
          </div>
          <p className="text-[14px] leading-relaxed text-[var(--ink)]">
            Each credit unit represents 1 metric ton of CO2 equivalent (1 tCO2e) permanently abated or sequestered. Tokens are minted via an Anchor program that ties SPL Token metadata extensions to physical GPS coordinates and Nepal AEPC registry records.
          </p>

          <div className="p-3.5 rounded-[12px] bg-[var(--bg)] font-mono text-[12px] space-y-1.5 border border-[var(--line)] text-[var(--ink)]">
            <div className="text-[var(--ink)] font-medium">// Anchor instruction: mint_verified_batch</div>
            <div>program_id: "Hima9XqKmP...sol"</div>
            <div>oracle_pubkey: "AEPC_Oracle_Gandaki_V2"</div>
            <div className="text-[var(--forest)] font-semibold">proof_hash: "0x8f3c...ae41" (Sha256)</div>
          </div>
        </div>

        {/* Retirement & Soulbound Proof */}
        <div className="bg-[var(--paper)] rounded-[20px] p-6 sm:p-7 border border-[var(--line)] space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2B6CB0]" />
            <h3 className="font-fraunces text-[19px] font-medium text-[var(--ink)]">
              2. Permanent On-Chain Retirement
            </h3>
          </div>
          <p className="text-[14px] leading-relaxed text-[var(--ink)]">
            When a buyer retires credits, the SPL token is transferred to an unspendable burn address. An immutable memo instruction emits the certificate ID and beneficiary name directly into the Solana transaction log.
          </p>

          <div className="p-3.5 rounded-[12px] bg-[var(--bg)] font-mono text-[12px] space-y-1.5 border border-[var(--line)] text-[var(--ink)]">
            <div className="text-[var(--ink)] font-medium">// Solana Memo retirement log</div>
            <div>program: "Memo1UhkJRf...1111"</div>
            <div>status: "PERMANENTLY_RETIRED"</div>
            <div className="text-[var(--forest)] font-semibold">cert_id: "HC-NPL-2026-8492"</div>
          </div>
        </div>
      </div>
    </div>
  );
}
