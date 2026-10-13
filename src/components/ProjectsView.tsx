import React, { useState, useEffect } from 'react';
import { ProjectListing, CategoryType } from '../types';
import { HydroWaterIcon, ForestryTreeIcon, BiogasSunIcon } from './CategoryIcons';
import { X, Search, ArrowRight, Camera } from 'lucide-react';

interface ProjectsViewProps {
  listings: ProjectListing[];
  onBuyClick: (listing: ProjectListing) => void;
  onRegisterClick: () => void;
  onOpenGallery?: (listing: ProjectListing) => void;
  solUsdRate?: number;
  initialSelectedProject?: ProjectListing | null;
}

export type SortOption = 'newest' | 'lowest_price' | 'highest_volume';

export function ProjectsView({
  listings,
  onBuyClick,
  onRegisterClick,
  onOpenGallery,
  solUsdRate,
  initialSelectedProject,
}: ProjectsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedProject, setSelectedProject] = useState<ProjectListing | null>(
    initialSelectedProject || null
  );

  useEffect(() => {
    if (initialSelectedProject) {
      setSelectedProject(initialSelectedProject);
    }
  }, [initialSelectedProject]);

  const rate = solUsdRate && solUsdRate > 0 ? solUsdRate : 148.5;

  useEffect(() => {
    const origBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'var(--bg, #FAFAF7)';

    if (typeof window !== 'undefined') {
      (window as any).__checkCardLayoutGlithces = () => {
        const cards = Array.from(document.querySelectorAll<HTMLElement>('.project-card'));
        if (!cards.length) return { offenders: [], maxPanelTopDiff: 0 };
        const offenders: Array<{ cardId: string; element: string; diff: number }> = [];
        cards.forEach((card, idx) => {
          const cardRect = card.getBoundingClientRect();
          const descendants = Array.from(card.querySelectorAll<HTMLElement>('*'));
          descendants.forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.right > cardRect.right + 0.5) {
              offenders.push({
                cardId: card.getAttribute('data-project-id') || `card-${idx}`,
                element: el.className || el.tagName,
                diff: r.right - cardRect.right,
              });
            }
            if (r.left < cardRect.left - 0.5) {
              offenders.push({
                cardId: card.getAttribute('data-project-id') || `card-${idx}`,
                element: el.className || el.tagName,
                diff: cardRect.left - r.left,
              });
            }
          });
        });

        const panels = Array.from(document.querySelectorAll<HTMLElement>('.project-card-panel'));
        const rows: Record<number, HTMLElement[]> = {};
        panels.forEach((p) => {
          const top = Math.round(p.getBoundingClientRect().top);
          const key = Object.keys(rows).find((k) => Math.abs(Number(k) - top) < 4);
          if (key) {
            rows[Number(key)].push(p);
          } else {
            rows[top] = [p];
          }
        });

        let maxDiff = 0;
        Object.values(rows).forEach((rowPanels) => {
          if (rowPanels.length > 1) {
            const tops = rowPanels.map((p) => p.getBoundingClientRect().top);
            const diff = Math.max(...tops) - Math.min(...tops);
            if (diff > maxDiff) maxDiff = diff;
          }
        });

        console.log(`[Card Layout Check] Offenders found: ${offenders.length}`);
        console.log(`[Card Layout Check] Metadata panel top diff within rows: ${maxDiff}px`);
        return { offenders, maxPanelTopDiff: maxDiff };
      };
    }

    return () => {
      document.body.style.backgroundColor = origBg;
    };
  }, []);

  const filtered = listings.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchProv = selectedProvince === 'all' || item.province === selectedProvince;
    const query = searchQuery.trim().toLowerCase();
    const matchSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.province.toLowerCase().includes(query) ||
      item.verifier.toLowerCase().includes(query) ||
      (item.capacityOrSize && item.capacityOrSize.toLowerCase().includes(query));
    return matchCat && matchProv && matchSearch;
  });

  const sortedProjects = [...filtered].sort((a, b) => {
    if (sortBy === 'lowest_price') {
      return a.pricePerTon - b.pricePerTon;
    }
    if (sortBy === 'highest_volume') {
      return b.availableAmount - a.availableAmount;
    }
    // Default 'newest': sort by vintage year descending
    if (b.vintage !== a.vintage) {
      return b.vintage - a.vintage;
    }
    return a.id.localeCompare(b.id);
  });

  const getStandard = (item: ProjectListing): string => {
    if (item.verifier.includes('Gold Standard')) return 'Gold Standard';
    if (item.verifier.includes('Plan Vivo')) return 'Plan Vivo';
    if (item.verifier.includes('UNFCCC') || item.verifier.includes('CDM')) return 'UNFCCC CDM';
    if (item.verifier.includes('Verra') || item.verifier.includes('VCS')) return 'Verra VCS';
    return 'GoN / AEPC';
  };

  const getDescription = (item: ProjectListing): string => {
    if (item.category === 'hydro') {
      return 'Run-of-river clean hydroelectricity generation displacing fossil fuel grid power in the Himalayan river basin.';
    }
    if (item.category === 'forestry') {
      return 'Community Forest User Group native sal and rhododendron conservation with biodiversity and soil protection.';
    }
    return 'High-efficiency anaerobic digestion of organic matter generating clean biogas fuel and nutrient-rich biofertilizer.';
  };

  const getCategoryMeta = (cat: CategoryType) => {
    switch (cat) {
      case 'hydro':
        return {
          label: 'Hydropower',
          color: '#2B6CB0',
          accent: 'var(--accent-hydro)',
          tint: 'var(--hydro-tint)',
          Icon: HydroWaterIcon,
        };
      case 'forestry':
        return {
          label: 'Community forestry',
          color: '#1B3A2F',
          accent: 'var(--accent-forestry)',
          tint: 'var(--forest-tint)',
          Icon: ForestryTreeIcon,
        };
      case 'biogas':
        return {
          label: 'Biogas',
          color: '#5C7A4A',
          accent: 'var(--accent-biogas)',
          tint: 'var(--moss-tint)',
          Icon: BiogasSunIcon,
        };
    }
  };

  const formatCapacityDisplay = (item: ProjectListing): string => {
    const raw = item.capacityOrSize || '';
    if (item.category === 'forestry') {
      return raw.replace(/hectares?/gi, 'ha').trim();
    }
    if (item.category === 'hydro') {
      return raw.replace(/run-of-river/gi, '').replace(/hydro/gi, '').trim();
    }
    if (item.category === 'biogas') {
      return raw.replace(/anaerobic/gi, '').trim();
    }
    return raw;
  };

  return (
    <div
      className="relative z-10 w-full space-y-6 select-none font-inter pb-16"
      style={
        {
          '--bg': '#FAFAF7',
          '--paper': '#FFFFFF',
          '--line': 'rgba(27,58,47,0.12)',
          '--line-strong': 'rgba(27,58,47,0.22)',
          '--ink': '#17241D',
          '--ink-soft': '#17241D',
          '--ink-faint': '#17241D',
          '--forest': '#1B3A2F',
          '--forest-tint': '#E7EEE9',
          '--hydro': '#2B6CB0',
          '--hydro-tint': '#E8F0F9',
          '--moss': '#5C7A4A',
          '--moss-tint': '#EEF2E7',
          '--clay': '#C8824A',
          '--clay-tint': '#FBEEE2',
        } as React.CSSProperties
      }
    >
      {/* PAGE HEADER */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[20px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--forest)] shrink-0" />
            <span className="text-[12px] font-semibold tracking-[0.04em] uppercase text-[var(--ink)]">
              REGISTRY DIRECTORY
            </span>
          </div>
          <h1 className="font-fraunces text-[28px] font-[500] tracking-[-0.01em] text-[var(--ink)] leading-tight">
            Verified Nepalese Environmental Assets
          </h1>
          <p className="mt-2 text-[15px] font-[400] text-[var(--ink)] leading-relaxed max-w-[620px]">
            Browse accredited run-of-river hydro stations, community forestry user groups (CFUGs), and high-altitude biodigestion programs.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegisterClick}
          className="border border-[var(--line-strong)] bg-transparent text-[var(--ink)] rounded-[10px] px-4 py-2.5 text-[14px] font-medium hover:bg-[var(--forest-tint)] transition-colors cursor-pointer shrink-0 self-start md:self-auto"
        >
          Register a project
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[16px] p-4 sm:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 md:gap-y-0">
          {/* 1. Total Projects */}
          <div className="flex flex-col justify-center py-2 px-3 sm:px-4 md:px-5">
            <div className="font-fraunces text-[24px] font-[500] tracking-[-0.01em] text-[var(--ink)] tabular-nums leading-tight">
              37
            </div>
            <div className="text-[12px] font-normal text-[var(--ink)] mt-1">
              Registered
            </div>
          </div>

          {/* 2. Total Credits */}
          <div className="flex flex-col justify-center py-2 px-3 sm:px-4 md:px-5 border-l border-[var(--line)]">
            <div className="flex items-baseline gap-1 font-fraunces text-[24px] font-[500] tracking-[-0.01em] text-[var(--ink)] tabular-nums leading-tight">
              184,620
              <span className="font-inter text-[12px] font-normal text-[var(--ink)]">
                tCO2e
              </span>
            </div>
            <div className="text-[12px] font-normal text-[var(--ink)] mt-1">
              Issued to date
            </div>
          </div>

          {/* 3. Verified Share */}
          <div className="flex flex-col justify-center py-2 px-3 sm:px-4 md:px-5 border-t border-[var(--line)] md:border-t-0 md:border-l pt-3 md:pt-2">
            <div className="font-fraunces text-[24px] font-[500] tracking-[-0.01em] text-[var(--ink)] tabular-nums leading-tight">
              100%
            </div>
            <div className="text-[12px] font-normal text-[var(--ink)] mt-1">
              Third-party verified
            </div>
          </div>

          {/* 4. Active Provinces */}
          <div className="flex flex-col justify-center py-2 px-3 sm:px-4 md:px-5 border-t border-l border-[var(--line)] md:border-t-0 pt-3 md:pt-2">
            <div className="font-fraunces text-[24px] font-[500] tracking-[-0.01em] text-[var(--ink)] tabular-nums leading-tight">
              6
            </div>
            <div className="text-[12px] font-normal text-[var(--ink)] mt-1">
              Across Nepal
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[16px] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--ink)] mr-1">
            Category
          </span>
          {[
            { id: 'all', label: 'All projects' },
            { id: 'hydro', label: 'Hydropower' },
            { id: 'forestry', label: 'Community forestry' },
            { id: 'biogas', label: 'Biogas' },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={isSelected}
                className={`border border-[var(--line-strong)] text-[13px] font-medium rounded-full px-[14px] py-[8px] transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--forest)] text-white border-[var(--forest)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--forest-tint)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Right: Search + Province + Sort */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="w-full border border-[var(--line)] rounded-[10px] bg-[var(--paper)] pl-9 pr-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[#5B6B61] focus:outline-none focus:border-[var(--line-strong)]"
            />
          </div>

          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="border border-[var(--line)] rounded-[10px] bg-[var(--paper)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--line-strong)] cursor-pointer"
            aria-label="Filter by province"
          >
            <option value="all">All Provinces</option>
            <option value="Gandaki">Gandaki</option>
            <option value="Koshi">Koshi</option>
            <option value="Bagmati">Bagmati</option>
            <option value="Lumbini">Lumbini</option>
            <option value="Karnali">Karnali</option>
            <option value="Sudurpashchim">Sudurpashchim</option>
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <label
              htmlFor="sort-projects-select"
              className="text-[13px] font-medium text-[var(--ink)] sr-only sm:not-sr-only"
            >
              Sort:
            </label>
            <select
              id="sort-projects-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border border-[var(--line)] rounded-[10px] bg-[var(--paper)] px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--line-strong)] cursor-pointer"
              aria-label="Sort projects"
            >
              <option value="newest">Newest</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_volume">Highest Volume</option>
            </select>
          </div>
        </div>
      </div>

      {/* PROJECT CARDS / EMPTY STATE */}
      {sortedProjects.length === 0 ? (
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-[20px] p-12 text-center">
          <p className="text-[15px] font-normal text-[var(--ink)]">
            No projects found matching these filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedProvince('all');
              setSearchQuery('');
              setSortBy('newest');
            }}
            className="mt-3 text-[13px] font-medium text-[var(--forest)] underline hover:text-[var(--forest-hover)] cursor-pointer bg-transparent border-0"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {sortedProjects.map((item) => {
            const meta = getCategoryMeta(item.category);
            const standard = getStandard(item);
            const description = getDescription(item);
            const capacityLabel = item.category === 'forestry' ? 'Area' : 'Capacity';
            const capacityDisplay = formatCapacityDisplay(item);

            return (
              <div
                key={item.id}
                className="project-card-cell"
                style={
                  {
                    minWidth: 0,
                    containerType: 'inline-size',
                    containerName: 'card',
                  } as React.CSSProperties
                }
              >
                <div
                  data-category={item.category === 'hydro' ? 'hydropower' : item.category}
                  data-project-id={item.id}
                  className="card project-card group relative"
                  style={
                    {
                      '--accent': meta.accent,
                      '--accent-tint': meta.tint,
                    } as React.CSSProperties
                  }
                >
                  {/* Upper card section */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* 1. Top row */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* 36px rounded-square (10px radius) icon tile */}
                        <div
                          className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.tint }}
                        >
                          <meta.Icon className="w-[20px] h-[20px]" style={{ color: 'var(--accent)' }} />
                        </div>

                        {/* Category label */}
                        <div className="text-[12px] font-inter font-semibold leading-none truncate text-[var(--accent)]">
                          <span>{meta.label}</span>
                        </div>
                      </div>

                      {/* "Verified" status pill */}
                      <div className="shrink-0 flex items-center gap-1.5 px-[10px] py-[4px] rounded-full bg-[var(--moss-tint)] border border-[rgba(92,122,74,0.35)] text-[#3E5531] text-[12px] font-inter font-medium leading-none">
                        <span className="w-[6px] h-[6px] rounded-full bg-[#3E5531] shrink-0" />
                        <span>Verified</span>
                      </div>
                    </div>

                    {/* 2. Project name (reserve exactly 2 lines: min-height: calc(2 * 1.2em), stretch accent bar) */}
                    <div className="project-card-name-row">
                      <span
                        className="project-card-accent-bar"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden="true"
                      />
                      <h3
                        className="project-card-title font-fraunces font-medium text-[22px] min-[600px]:text-[24px] text-[#17241D] tracking-[-0.015em] transition-all group-hover:underline"
                        style={{
                          textDecorationColor: meta.color,
                          textDecorationThickness: '1px',
                          textUnderlineOffset: '4px',
                        }}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* 3. Description (line-clamp 2 lines with min-height: calc(2 * 1.5em)) */}
                    <p className="project-card-desc">
                      {description}
                    </p>

                    {/* 4. Metadata panel: margin-top 16px; flex: 1 1 auto; align-content: start */}
                    <div className="project-card-panel">
                      {/* Row 1: First field (Capacity / Area) spans full panel width */}
                      <div className="project-card-panel-row1">
                        <div className="flex items-center gap-[6px] text-[11px] font-inter font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                          <span
                            className="w-[5px] h-[5px] rounded-full shrink-0 bg-[var(--accent)]"
                            aria-hidden="true"
                          />
                          <span>{capacityLabel}</span>
                        </div>
                        <div
                          className="mt-1 project-card-panel-val"
                          title={item.capacityOrSize}
                        >
                          {capacityDisplay}
                        </div>
                      </div>

                      {/* Row 2: Two columns ("Estd." & "Standard") separated by vertical hairline */}
                      <div className="project-card-panel-row2">
                        {/* Col 1: Estd. */}
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-[6px] text-[11px] font-inter font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                            <span
                              className="w-[5px] h-[5px] rounded-full shrink-0 bg-[var(--accent)]"
                              aria-hidden="true"
                            />
                            <span>Estd.</span>
                          </div>
                          <div className="mt-1 project-card-panel-val">
                            {item.vintage}
                          </div>
                        </div>

                        {/* Col 2: Standard */}
                        <div className="min-w-0 pl-3 border-l border-[var(--line)] project-card-divider">
                          <div className="flex items-center gap-[6px] text-[11px] font-inter font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                            <span
                              className="w-[5px] h-[5px] rounded-full shrink-0 bg-[var(--accent)]"
                              aria-hidden="true"
                            />
                            <span>Standard</span>
                          </div>
                          <div
                            className="mt-1 project-card-panel-val"
                            title={standard}
                          >
                            {standard}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Footer row (baseline aligned across row) */}
                  <div className="project-card-footer">
                    {/* Left block (credits) */}
                    <div className="project-card-footer-credits">
                      <div className="flex items-center gap-[6px] text-[11px] font-inter font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                        <span
                          className="w-[5px] h-[5px] rounded-full shrink-0 bg-[var(--accent)]"
                          aria-hidden="true"
                        />
                        <span>CREDITS</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-fraunces font-medium text-[22px] leading-none text-[#17241D] tabular-nums whitespace-nowrap">
                          {item.availableAmount.toLocaleString()}
                        </span>
                        <span className="font-inter font-medium text-[13px] text-[var(--accent)] whitespace-nowrap">
                          tCO2e
                        </span>
                      </div>
                    </div>

                    {/* Right block (actions) */}
                    <div className="project-card-footer-actions relative z-20">
                      {onOpenGallery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenGallery(item);
                          }}
                          className="btn-card-gallery"
                          title="Gallery"
                          aria-label="Gallery"
                        >
                          <Camera className="w-4 h-4 shrink-0 text-[var(--forest)]" />
                          <span>Gallery</span>
                        </button>
                      )}

                      {/* "View project" button */}
                      <button
                        type="button"
                        onClick={() => setSelectedProject(item)}
                        className="btn-card-view"
                      >
                        <span>View project</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-[2px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-150 motion-reduce:transition-none"
          style={{ backgroundColor: 'rgba(23, 36, 29, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedProject(null);
          }}
        >
          <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-[20px] p-6 sm:p-7 max-w-[540px] w-full relative max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--line)]">
              <div className="flex items-center gap-3">
                <div
                  className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: getCategoryMeta(selectedProject.category).tint }}
                >
                  {React.createElement(getCategoryMeta(selectedProject.category).Icon, {
                    className: 'w-[24px] h-[24px]',
                  })}
                </div>
                <div>
                  <div className="text-[12px] font-medium" style={{ color: getCategoryMeta(selectedProject.category).color }}>
                    {getCategoryMeta(selectedProject.category).label}
                  </div>
                  <h3 className="font-fraunces text-[22px] font-[500] tracking-[-0.01em] text-[var(--ink)] leading-snug">
                    {selectedProject.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="w-8 h-8 rounded-[10px] border border-[var(--line-strong)] bg-transparent flex items-center justify-center text-[var(--ink)] hover:bg-[var(--forest-tint)] transition-colors cursor-pointer shrink-0"
                aria-label="Close project detail"
              >
                <X className="w-4 h-4 text-[var(--ink)]" />
              </button>
            </div>

            {/* Modal body */}
            <div className="py-5 space-y-5 text-[13px]">
              <div>
                <span className="inline-flex items-center gap-1.5 px-[10px] py-[4px] rounded-full bg-[var(--moss-tint)] text-[#3E5531] text-[12px] font-[500] mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3E5531]" />
                  Verified Registry Asset
                </span>
                <p className="text-[14px] text-[var(--ink)] leading-relaxed">
                  {getDescription(selectedProject)}
                </p>
              </div>

              {/* Dossier specs */}
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-[14px] p-4 grid grid-cols-2 gap-y-3.5 gap-x-4">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    Specification
                  </div>
                  <div className="font-medium text-[var(--ink)] mt-0.5">
                    {selectedProject.capacityOrSize}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    ESTD.
                  </div>
                  <div className="font-medium text-[var(--ink)] mt-0.5">
                    {selectedProject.vintage}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    Standard & Verifier
                  </div>
                  <div className="font-medium text-[var(--ink)] mt-0.5 truncate" title={selectedProject.verifier}>
                    {selectedProject.verifier}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    Solana Mint
                  </div>
                  <div className="font-mono text-[12px] text-[var(--ink)] mt-0.5">
                    {selectedProject.mintAddress}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    Available Credits
                  </div>
                  <div className="font-medium text-[var(--ink)] mt-0.5">
                    {selectedProject.availableAmount.toLocaleString()} tCO2e
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                    Credit Price
                  </div>
                  <div className="font-medium text-[var(--ink)] mt-0.5">
                    ${selectedProject.pricePerTon.toFixed(2)} ({(selectedProject.pricePerTon / rate).toFixed(3)} SOL)
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
              {onOpenGallery && (
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedProject;
                    if (p) onOpenGallery(p);
                  }}
                  className="border border-[rgba(27,58,47,0.22)] bg-white hover:bg-[var(--forest-tint)] text-[var(--forest)] rounded-[10px] px-3.5 py-2 text-[13.5px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4 text-[var(--forest)]" />
                  <span>View site photos</span>
                </button>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="border border-[var(--line-strong)] rounded-[10px] px-4 py-2.5 text-[14px] font-medium text-[var(--ink)] hover:bg-[var(--forest-tint)] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedProject;
                    setSelectedProject(null);
                    onBuyClick(p);
                  }}
                  className="bg-[var(--clay)] hover:bg-[#B06F3F] text-white rounded-[10px] px-5 py-2.5 text-[14px] font-semibold transition-colors cursor-pointer"
                >
                  Buy credits
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
