import React from 'react';

interface TileBProps {
  price?: string;
  solUsdRate?: number;
}

export function TileB_AvgPrice({ price = '$8.40', solUsdRate }: TileBProps) {
  const rate = solUsdRate && solUsdRate > 0 ? solUsdRate : 148.5;
  const avgSol = (8.40 / rate).toFixed(3);

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
    <div className="col-span-12 lg:col-span-5 rounded-[20px] p-6 sm:p-8 flex flex-col justify-between text-white bg-[var(--forest)] select-none border border-[var(--line)]">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-white">
            Avg. credit price
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--forest-tint)] text-[12px] text-[var(--forest)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3E5531]" />
            <span>1 SOL = ${rate.toFixed(2)}</span>
          </div>
        </div>

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
            <path
              d={linePath}
              fill="none"
              stroke="#A7F3D0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
  );
}
