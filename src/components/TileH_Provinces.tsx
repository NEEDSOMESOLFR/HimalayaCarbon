import React from 'react';
import { PROVINCES_DATA } from '../data/mockData';
import { ProvinceStat } from '../types';

interface TileHProps {
  onSelectProvince?: (province: ProvinceStat) => void;
  selectedProvince?: string | null;
}

export function TileH_Provinces({
  onSelectProvince,
  selectedProvince,
}: TileHProps) {
  const getDotColor = (color: ProvinceStat['dotColor'], isSelected: boolean) => {
    if (isSelected) return '#FFFFFF';
    switch (color) {
      case 'forest':
        return '#1B3A2F';
      case 'hydro':
        return '#2B6CB0';
      case 'moss':
        return '#5C7A4A';
      case 'clay':
        return '#C8824A';
      case 'muted':
      default:
        return '#17241D';
    }
  };

  return (
    <div className="col-span-12 bg-[var(--paper)] rounded-[20px] p-5 sm:p-6 border border-[var(--line)] select-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Label Left */}
        <div className="shrink-0">
          <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--ink)]">
            Projects by province
          </div>
          <div className="text-[12px] text-[var(--ink)] mt-0.5">
            Nepal federal administrative distribution
          </div>
        </div>

        {/* Horizontal strip of chips */}
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1 pt-1 scroll-smooth snap-x sm:overflow-x-visible sm:flex-wrap">
          {PROVINCES_DATA.map((prov) => {
            const isSelected = selectedProvince === prov.name;
            return (
              <button
                key={prov.name}
                type="button"
                onClick={() => onSelectProvince?.(prov)}
                className={`shrink-0 snap-start flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer focus:outline-none transition-colors border ${
                  isSelected
                    ? 'bg-[var(--forest)] text-white border-[var(--forest)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line-strong)] hover:bg-[var(--forest-tint)]'
                }`}
                aria-pressed={isSelected}
              >
                {/* Colored dot */}
                <span
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{
                    backgroundColor: getDotColor(prov.dotColor, isSelected),
                  }}
                />

                {/* Province name + count */}
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className={`text-[13px] font-medium ${isSelected ? 'text-white' : 'text-[var(--ink)]'}`}>
                    {prov.name}
                  </span>
                  <span className={`text-[12px] font-normal tabular-nums ${isSelected ? 'text-white' : 'text-[var(--ink)]'}`}>
                    ({prov.projectCount})
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
