import React from 'react';
import { HydroWaterIcon, ForestryTreeIcon, BiogasFlameIcon } from './CategoryIcons';
import { CategoryType } from '../types';
import { ArrowRight } from 'lucide-react';

interface CategoryTileProps {
  type: CategoryType;
  title: string;
  subtitle: string;
  amount: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function CategoryTile({
  type,
  title,
  subtitle,
  amount,
  onClick,
  isSelected,
}: CategoryTileProps) {
  let iconColor = '#2B6CB0';
  let IconComponent = HydroWaterIcon;

  if (type === 'forestry') {
    iconColor = '#1B3A2F';
    IconComponent = ForestryTreeIcon;
  } else if (type === 'biogas') {
    iconColor = '#5C7A4A';
    IconComponent = BiogasFlameIcon;
  }

  const amountParts = amount.split(' ');
  const numberPart = amountParts[0];
  const unitPart = amountParts.slice(1).join(' ');

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--paper)] rounded-[20px] p-6 sm:p-7 flex flex-col justify-between cursor-pointer select-none group transition-all duration-200 border border-[var(--line)] hover:-translate-y-1 ${
        isSelected ? 'ring-2 ring-[var(--forest)]' : ''
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-pressed={isSelected}
    >
      <div>
        {/* Top: Icon Container */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-[48px] h-[48px] rounded-full border border-[var(--line)] bg-[var(--paper)] flex items-center justify-center p-1.5">
            <IconComponent className="w-[28px] h-[28px]" style={{ color: iconColor }} />
          </div>

          <span className="text-[12px] uppercase tracking-wider font-semibold text-[var(--ink)]">
            Solana SPL
          </span>
        </div>

        {/* Card Title */}
        <h3 className="text-[18px] font-semibold tracking-tight text-[var(--ink)] leading-snug">
          {title}
        </h3>

        {/* Subtitle */}
        <p className="mt-1 text-[14px] font-normal text-[var(--ink)] truncate">
          {subtitle}
        </p>
      </div>

      {/* Bottom: tCO2e in serif + 'View projects' */}
      <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-fraunces text-[30px] sm:text-[32px] font-medium leading-none text-[var(--ink)] tabular-nums">
              {numberPart}
            </span>
            <span className="text-[14px] font-medium text-[var(--ink)]">
              {unitPart}
            </span>
          </div>
          <span className="text-[12px] text-[var(--ink)] block mt-1">
            Audited Nepal Registry
          </span>
        </div>

        {/* Reveal 'View projects ->' */}
        <div className="flex items-center gap-1 text-[13px] font-medium text-[var(--forest)] pb-0.5 group-hover:underline">
          <span>View projects</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
