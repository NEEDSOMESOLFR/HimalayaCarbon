import React from 'react';
import { VerificationQueueItem } from '../types';
import { Clock } from 'lucide-react';

interface TileFProps {
  items: VerificationQueueItem[];
  onSelectProject?: (item: VerificationQueueItem) => void;
}

export function TileF_VerificationQueue({ items, onSelectProject }: TileFProps) {
  return (
    <div className="col-span-12 lg:col-span-5 bg-[var(--paper)] rounded-[20px] p-6 sm:p-7 flex flex-col justify-between border border-[var(--line)] select-none">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8A5327] shrink-0" />
            <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--ink)]">
              Verification queue
            </span>
          </div>
          <span className="text-[12px] font-medium text-[var(--ink)]">
            MRV dIoT / Satellite MRV
          </span>
        </div>

        {/* Rows with hairline dividers */}
        {items.length === 0 ? (
          <div className="py-12 text-center text-[var(--ink)] text-[14px]">
            <Clock className="w-6 h-6 mx-auto mb-2 text-[var(--ink)]" />
            <p>No projects pending audit at this moment.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item, idx) => {
              const isVerified = item.status === 'Verified';
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectProject?.(item)}
                  className={`flex items-center justify-between py-3.5 px-3 -mx-3 rounded-[12px] cursor-pointer group transition-colors duration-150 hover:bg-[var(--bg)] ${
                    idx !== 0 ? 'border-t border-[var(--line)]' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProject?.(item);
                    }
                  }}
                  aria-label={`View audit file for ${item.name}`}
                >
                  {/* Left: Project name & meta */}
                  <div className="pr-3 min-w-0">
                    <div className="text-[14px] font-medium leading-snug text-[var(--ink)] truncate group-hover:text-[var(--forest)] transition-colors">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[var(--ink)] truncate">
                      {item.location} · {item.sizeOrCapacity}
                    </div>
                  </div>

                  {/* Right: Status Pill */}
                  <div className="shrink-0">
                    <div
                      className="px-3 py-1 flex items-center gap-1.5 text-[12px] font-medium rounded-full"
                      style={{
                        backgroundColor: isVerified ? 'var(--moss-tint)' : 'var(--clay-tint)',
                        color: isVerified ? '#3E5531' : '#8A5327',
                      }}
                    >
                      <span
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{
                          backgroundColor: isVerified ? '#3E5531' : '#8A5327',
                        }}
                      />
                      <span>{item.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info line */}
      <div className="mt-4 pt-3 flex items-center justify-between text-[12px] border-t border-[var(--line)] text-[var(--ink)] font-normal">
        <span>Nepal AEPC & Gold Standard</span>
        <span>Auto-syncs to Solana Devnet</span>
      </div>
    </div>
  );
}
