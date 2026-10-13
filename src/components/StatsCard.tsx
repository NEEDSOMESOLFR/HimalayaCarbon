import React, { useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { Info } from 'lucide-react';

interface StatsCardProps {
  totalIssued: number;
  retired: number;
  available: number;
  verifiedCount: number;
  price?: string;
  solUsdRate?: number;
}

export function StatsCard({
  totalIssued = 184620,
  retired = 61200,
  available = 123420,
  verifiedCount = 37,
  price = '$8.40',
  solUsdRate = 148.5,
}: StatsCardProps) {
  const animatedTotal = useCountUp(totalIssued, 900);
  const animatedRetired = useCountUp(retired, 900);
  const animatedAvailable = useCountUp(available, 900);

  const [activeTooltip, setActiveTooltip] = useState<'retired' | 'available' | null>(null);

  const rate = solUsdRate && solUsdRate > 0 ? solUsdRate : 148.5;
  const avgSol = (8.40 / rate).toFixed(3);

  const retiredPercent = Math.min(Math.round((retired / (totalIssued || 1)) * 100), 100);

  // Sparkline data points
  const sparkPoints = [
    { x: 0, y: 46 },
    { x: 35, y: 44 },
    { x: 70, y: 41 },
    { x: 105, y: 38 },
    { x: 140, y: 32 },
    { x: 175, y: 28 },
    { x: 210, y: 22 },
    { x: 245, y: 16 },
    { x: 280, y: 8 },
  ];

  const linePath = sparkPoints.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
    ''
  );
  const endPoint = sparkPoints[sparkPoints.length - 1];

  return (
    <div className="col-span-12 bg-[var(--paper)] rounded-[20px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-[var(--line)] select-none">
      {/* LEFT: Total Credits Issued (7 cols) */}
      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
        <div>
          {/* Top Label */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--forest)] shrink-0" />
            <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--ink)]">
              Total credits issued
            </span>
          </div>

          {/* Serif Count-up */}
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

        {/* Progress Track */}
        <div className="mt-8 pt-2">
          <div className="flex items-center justify-between text-[12px] text-[var(--ink)] mb-2 font-medium">
            <span className="flex items-center gap-1.5">
              <span>Allocation breakdown</span>
              <span>({retiredPercent}% retired)</span>
            </span>
            <span className="tabular-nums font-semibold text-[var(--ink)]">
              {verifiedCount} verified projects
            </span>
          </div>

          {/* Track */}
          <div
            className="h-[14px] w-full p-[2px] rounded-full bg-[var(--bg)] border border-[var(--line)] relative overflow-hidden"
            role="progressbar"
            aria-valuenow={retiredPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Carbon credits retired versus available"
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out bg-[var(--forest)]"
              style={{
                width: `${retiredPercent}%`,
              }}
            />
          </div>

          {/* Labels & Tooltips Beneath Track */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Retired Stat with Tooltip */}
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
                  aria-label="Info about retired credits"
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

              {/* Opaque Tooltip */}
              {activeTooltip === 'retired' && (
                <div className="absolute bottom-full left-0 mb-2 w-[220px] p-2.5 rounded-[12px] bg-[var(--paper)] text-[12px] text-[var(--ink)] z-30 border border-[var(--line-strong)]">
                  Credits taken permanently out of circulation with immutable on-chain proof of offset.
                </div>
              )}
            </div>

            {/* Available Stat with Tooltip */}
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
                  aria-label="Info about available credits"
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

              {/* Opaque Tooltip */}
              {activeTooltip === 'available' && (
                <div className="absolute bottom-full left-0 mb-2 w-[220px] p-2.5 rounded-[12px] bg-[var(--paper)] text-[12px] text-[var(--ink)] z-30 border border-[var(--line-strong)]">
                  Unretired credits currently active and tradable by buyers on Solana devnet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Solid forest panel (5 cols, solid #1B3A2F with 100% white text) */}
      <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[var(--forest)] text-white border-t lg:border-t-0 lg:border-l border-[var(--line)]">
        <div>
          {/* Top Label */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-white">
              Avg. credit price
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--forest-tint)] text-[12px] text-[var(--forest)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E5531]" />
              <span>1 SOL = ${rate.toFixed(2)}</span>
            </div>
          </div>

          {/* Avg Credit Price */}
          <div className="mt-4 flex items-baseline gap-2.5 flex-wrap">
            <span className="font-fraunces text-[42px] sm:text-[54px] lg:text-[62px] font-medium leading-[1.0] tracking-[-0.02em] text-white tabular-nums">
              {avgSol} SOL
            </span>
            <span className="text-[16px] sm:text-[17px] font-medium text-white">
              (${price.replace('$', '')}) / tCO2e
            </span>
          </div>

          <p className="mt-2.5 text-[14px] leading-relaxed text-white">
            Volume-weighted secondary Solana DEX & primary OTC settlement index.
          </p>
        </div>

        {/* Sparkline with clean stroke */}
        <div className="mt-8 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between mb-2 text-[12px] text-white font-medium">
            <span>9-month price trajectory</span>
            <span className="font-semibold text-white">+18.3% YTD</span>
          </div>

          <div className="w-full h-[64px] relative">
            <svg
              viewBox="0 0 280 56"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Thin 2px sparkline path */}
              <path
                d={linePath}
                fill="none"
                stroke="#A7F3D0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* End dot */}
              <circle cx={endPoint.x} cy={endPoint.y} r="4" fill="#A7F3D0" />
              <circle cx={endPoint.x} cy={endPoint.y} r="2" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="mt-2 flex items-center justify-between text-[12px] text-white">
            <span>$7.10 / tCO2e</span>
            <span className="text-white font-semibold">Spot: {avgSol} SOL ($8.40)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
