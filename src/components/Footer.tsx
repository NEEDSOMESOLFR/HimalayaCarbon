import React from 'react';

export function Footer() {
  return (
    <footer className="w-full mt-auto py-8 px-4 sm:px-6 max-w-[1200px] mx-auto select-none font-inter">
      <div className="bg-[var(--paper)] h-[56px] rounded-full px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] border border-[var(--line)]">
        <div className="flex items-center gap-2 text-[var(--ink)] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#3E5531] shrink-0" />
          <span>Settlement via Solana Devnet</span>
        </div>

        <div className="text-[var(--ink)] flex items-center gap-3 font-normal">
          <span>Himalaya Carbon · Nepal Climate Registry</span>
          <span className="hidden md:inline">·</span>
          <span className="hidden md:inline text-[12px]">Colosseum Hackathon Demo</span>
        </div>
      </div>
    </footer>
  );
}
