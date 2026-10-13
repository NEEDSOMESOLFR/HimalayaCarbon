import React from 'react';
import { ArrowRight } from 'lucide-react';
import { NepalGlassMap } from './NepalGlassMap';
import { ProjectListing } from '../types';

interface HeroProps {
  onRegisterClick: () => void;
  onBrowseClick: () => void;
  listings?: ProjectListing[];
  onViewProject?: (listing: ProjectListing) => void;
  solUsdRate?: number;
}

export function Hero({
  onRegisterClick,
  onBrowseClick,
  listings = [],
  onViewProject,
  solUsdRate,
}: HeroProps) {
  return (
    <section className="w-full pt-10 pb-8 sm:pt-14 sm:pb-12 select-none">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 min-[980px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] min-[1180px]:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-6 min-[980px]:gap-[32px] items-center">
        {/* Left Column: Sizing, container query context, and vertical centering */}
        <div
          className="flex flex-col justify-center fade-up-1 min-w-0"
          style={{
            containerType: 'inline-size',
            containerName: 'hero-text',
          }}
        >
          {/* Badge: SOLANA DEVNET · NEPAL CLIMATE REGISTRY */}
          <div
            className="inline-flex items-center rounded-full bg-white/40 border border-white/60 text-[var(--ink-secondary)] w-fit"
            style={{
              padding: '8px 14px',
              marginBottom: '22px',
              gap: '8px',
            }}
          >
            <span
              className="rounded-full bg-[var(--status-verified)] shrink-0"
              style={{ width: '7px', height: '7px' }}
            />
            <span
              className="uppercase font-semibold text-[var(--forest)]"
              style={{ fontSize: '12px', letterSpacing: '0.06em' }}
            >
              SOLANA DEVNET · NEPAL CLIMATE REGISTRY
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-[#17241D]"
            style={{
              fontFamily: 'var(--font-hero)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 8vw, 44px)',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              textWrap: 'balance',
              marginBottom: '22px',
              overflowWrap: 'normal',
              hyphens: 'none',
              fontOpticalSizing: 'auto',
              fontSynthesis: 'none',
              textRendering: 'optimizeLegibility',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            <style>{`
              @media (min-width: 980px) and (max-width: 1100px) {
                h1 {
                  font-size: clamp(34px, 12.2cqw, 60px) !important;
                }
              }
              @media (min-width: 1101px) {
                h1 {
                  font-size: clamp(36px, 12.2cqw, 60px) !important;
                }
              }
            `}</style>
            Nepal's hydropower and forests, turned into verifiable climate assets.
          </h1>

          {/* Paragraph */}
          <p
            className="text-[var(--ink-secondary)]"
            style={{
              fontSize: 'clamp(16px, 4.6cqw, 19px)',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            Verified projects mint credits on-chain. Buyers purchase and retire them with permanent proof of offset — no double-counting, no opaque registries.
          </p>

          {/* Actions: Browse credits & Register a project */}
          <div className="flex items-center gap-[12px] flex-wrap">
            <button
              type="button"
              onClick={onBrowseClick}
              className="btn-copper flex items-center justify-center cursor-pointer focus:outline-none w-full min-[480px]:w-auto h-[48px] px-[22px] min-[980px]:h-[52px] min-[980px]:px-[26px]"
              style={{
                fontSize: '15px',
                fontWeight: 500,
                gap: '12px',
              }}
            >
              <span>Browse credits</span>
              <ArrowRight className="opacity-80 shrink-0" style={{ width: '18px', height: '18px' }} />
            </button>

            <button
              type="button"
              onClick={onRegisterClick}
              className="neu-btn flex items-center justify-center cursor-pointer focus:outline-none w-full min-[480px]:w-auto h-[48px] px-[22px] min-[980px]:h-[52px] min-[980px]:px-[26px]"
              style={{
                fontSize: '15px',
                fontWeight: 500,
                gap: '12px',
              }}
            >
              <span>Register a project</span>
            </button>
          </div>
        </div>

        {/* Right Column: Glassmorphic Nepal Map card vertically centered, fixed sizing */}
        <div
          className="mt-6 min-[980px]:mt-0 flex items-center justify-center fade-up-2 w-full hero-map-col"
          style={{ alignSelf: 'center', height: 'auto' }}
        >
          <NepalGlassMap
            listings={listings}
            onViewProject={onViewProject}
            solUsdRate={solUsdRate}
          />
        </div>
      </div>
    </section>
  );
}
