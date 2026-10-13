import React, { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { Info } from 'lucide-react';

interface TileAProps {
  totalIssued: number;
  retired: number;
  available: number;
  verifiedCount: number;
}

export function TileA_TotalCredits({
  totalIssued = 184620,
  retired = 61200,
  available = 123420,
  verifiedCount = 37,
}: TileAProps) {
  const animatedTotal = useCountUp(totalIssued, 900);
  const animatedRetired = useCountUp(retired, 900);
  const animatedAvailable = useCountUp(available, 900);

  const [activeTooltip, setActiveTooltip] = useState<'retired' | 'available' | null>(null);
  const retiredPercent = Math.min(Math.round((retired / (totalIssued || 1)) * 100), 100);

  return (
    <div className="col-span-12 lg:col-span-7 bg-[var(--paper)] rounded-[20px] p-6 sm:p-8 flex flex-col justify-between border border-[var(--line)] select-none">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--forest)] shrink-0" />
          <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--ink)]">
            Total credits issued
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-3 flex-wrap">
          <span className="font-fraunces text-[44px] sm:text-[56px] lg:text-[64px] font-medium leading-[1.0] tracking-[-0.02em] text-[var(--ink)] tabular-nums">
            {animatedTotal.toLocaleString()}
          </span>
          <span className="text-[18px] sm:text-[20px] font-medium text-[var(--ink)]">
            tCO2e
          </span>
        </div>

        <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--ink)] max-w-[500px]">
          Directly minted on Solana from verified Nepalese river run-off, community forestry, and rural biodigesters.
        </p>
      </div>

      <div className="mt-8 pt-2">
        <div className="flex items-center justify-between text-[12px] text-[var(--ink)] mb-2 font-medium">
          <span>Allocation breakdown ({retiredPercent}% retired)</span>
          <span className="tabular-nums font-semibold text-[var(--ink)]">
            {verifiedCount} verified projects
          </span>
        </div>

        <div
          className="h-[14px] w-full p-[2px] rounded-full bg-[var(--bg)] border border-[var(--line)] relative overflow-hidden"
          role="progressbar"
          aria-valuenow={retiredPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-[var(--forest)]"
            style={{
              width: `${retiredPercent}%`,
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--ink)]">
                Retired
              </span>
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip('retired')}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 'retired' ? null : 'retired')}
                className="text-[var(--ink)] cursor-pointer focus:outline-none"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 font-fraunces text-[22px] sm:text-[26px] font-medium text-[var(--ink)] tabular-nums">
              {animatedRetired.toLocaleString()}
              <span className="text-[14px] font-sans font-normal text-[var(--ink)] ml-1">
                tCO2e
              </span>
            </div>

            {activeTooltip === 'retired' && (
              <div className="absolute bottom-full left-0 mb-2 w-[220px] p-2.5 rounded-[12px] bg-[var(--paper)] text-[12px] text-[var(--ink)] z-30 border border-[var(--line-strong)]">
                Credits taken permanently out of circulation with immutable on-chain proof of offset.
              </div>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--ink)]">
                Available
              </span>
              <button
                type="button"
                onMouseEnter={() => setActiveTooltip('available')}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 'available' ? null : 'available')}
                className="text-[var(--ink)] cursor-pointer focus:outline-none"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 font-fraunces text-[22px] sm:text-[26px] font-medium text-[var(--ink)] tabular-nums">
              {animatedAvailable.toLocaleString()}
              <span className="text-[14px] font-sans font-normal text-[var(--ink)] ml-1">
                tCO2e
              </span>
            </div>

            {activeTooltip === 'available' && (
              <div className="absolute bottom-full left-0 mb-2 w-[220px] p-2.5 rounded-[12px] bg-[var(--paper)] text-[12px] text-[var(--ink)] z-30 border border-[var(--line-strong)]">
                Unretired credits currently active and tradable by buyers on Solana devnet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
