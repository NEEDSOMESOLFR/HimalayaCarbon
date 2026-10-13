import React from 'react';
import { StatsCard } from './StatsCard';
import { CategoryTile } from './CategoryTile';
import { TileG_LiveListings } from './TileG_LiveListings';
import { TileH_Provinces } from './TileH_Provinces';
import {
  ProjectListing,
  VerificationQueueItem,
  ProvinceStat,
  CategoryType,
} from '../types';

interface BentoGridProps {
  totalIssued: number;
  retired: number;
  available: number;
  verifiedCount: number;
  listings: ProjectListing[];
  queueItems?: VerificationQueueItem[];
  selectedCategory: CategoryType | null;
  onSelectCategory: (cat: CategoryType | null) => void;
  selectedProvince: string | null;
  onSelectProvince: (prov: ProvinceStat) => void;
  onBuyClick: (listing: ProjectListing) => void;
  onOpenGallery?: (listing: ProjectListing) => void;
  onSelectQueueItem?: (item: VerificationQueueItem) => void;
  solUsdRate?: number;
  walletConnected?: boolean;
}

export function BentoGrid({
  totalIssued,
  retired,
  available,
  verifiedCount,
  listings,
  selectedCategory,
  onSelectCategory,
  selectedProvince,
  onSelectProvince,
  onBuyClick,
  onOpenGallery,
  solUsdRate,
  walletConnected = false,
}: BentoGridProps) {
  return (
    <section className="w-full pb-12 select-none">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-6">
          {/* STATS: ONE wide glass card split in two */}
          <StatsCard
            totalIssued={totalIssued}
            retired={retired}
            available={available}
            verifiedCount={verifiedCount}
            price="$8.40"
            solUsdRate={solUsdRate}
          />

          {/* PROJECT-TYPE CARDS (Hydropower / Forestry / Biogas)
              On mobile (< 640px) snap-scroll carousel, on sm+ 3-column grid */}
          <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto pb-2 sm:pb-0 snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="min-w-[280px] sm:min-w-0 snap-center shrink-0 sm:shrink">
              <CategoryTile
                type="hydro"
                title="Hydropower"
                subtitle="14 run-of-river plants"
                amount="76,300 tCO2e"
                isSelected={selectedCategory === 'hydro'}
                onClick={() =>
                  onSelectCategory(selectedCategory === 'hydro' ? null : 'hydro')
                }
              />
            </div>

            <div className="min-w-[280px] sm:min-w-0 snap-center shrink-0 sm:shrink">
              <CategoryTile
                type="forestry"
                title="Community forestry"
                subtitle="19 forest user groups"
                amount="92,040 tCO2e"
                isSelected={selectedCategory === 'forestry'}
                onClick={() =>
                  onSelectCategory(selectedCategory === 'forestry' ? null : 'forestry')
                }
              />
            </div>

            <div className="min-w-[280px] sm:min-w-0 snap-center shrink-0 sm:shrink">
              <CategoryTile
                type="biogas"
                title="Biogas"
                subtitle="4 rural digesters"
                amount="16,280 tCO2e"
                isSelected={selectedCategory === 'biogas'}
                onClick={() =>
                  onSelectCategory(selectedCategory === 'biogas' ? null : 'biogas')
                }
              />
            </div>
          </div>

          {/* LIVE LISTINGS */}
          <div className="w-full">
            <TileG_LiveListings
              listings={listings}
              onBuyClick={onBuyClick}
              onOpenGallery={onOpenGallery}
              solUsdRate={solUsdRate}
              walletConnected={walletConnected}
            />
          </div>

          {/* PROJECTS BY PROVINCE */}
          <TileH_Provinces
            selectedProvince={selectedProvince}
            onSelectProvince={onSelectProvince}
          />
        </div>
      </div>
    </section>
  );
}
