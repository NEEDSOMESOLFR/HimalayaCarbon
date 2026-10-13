import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectListing } from '../types';
import {
  Search,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  Droplets,
  Trees,
  Flame,
  SearchX,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';

interface TileGProps {
  listings: ProjectListing[];
  onBuyClick: (listing: ProjectListing) => void;
  onOpenGallery?: (listing: ProjectListing) => void;
  solUsdRate?: number;
  walletConnected?: boolean;
}

type CategoryTab = 'all' | 'hydro' | 'forestry' | 'biogas';
type SortField = 'newest' | 'price_asc' | 'price_desc' | 'available_desc' | 'project_asc' | 'project_desc';

export function TileG_LiveListings({
  listings,
  onBuyClick,
  onOpenGallery,
  solUsdRate,
  walletConnected = false,
}: TileGProps) {
  const rate = solUsdRate && solUsdRate > 0 ? solUsdRate : 148.5;

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortOption, setSortOption] = useState<SortField>('newest');

  // Pagination for scalability (>30 items)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 12;

  // Table header direct sort toggles
  const [tableSortField, setTableSortField] = useState<'project' | 'available' | 'price' | null>(null);
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');

  // Animation trigger for progress bars on first render
  const [hasRendered, setHasRendered] = useState<boolean>(false);
  useEffect(() => {
    const timer = setTimeout(() => setHasRendered(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Category counts
  const counts = useMemo(() => {
    return {
      all: listings.length,
      hydro: listings.filter((l) => l.category === 'hydro').length,
      forestry: listings.filter((l) => l.category === 'forestry').length,
      biogas: listings.filter((l) => l.category === 'biogas').length,
    };
  }, [listings]);

  // Unique provinces list
  const availableProvinces = useMemo(() => {
    const set = new Set<string>();
    listings.forEach((l) => {
      if (l.province) set.add(l.province);
    });
    return Array.from(set).sort();
  }, [listings]);

  // Filtered & sorted listings
  const filteredListings = useMemo(() => {
    let result = listings.filter((item) => {
      // Category filter
      if (activeTab !== 'all' && item.category !== activeTab) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesProvince = item.province?.toLowerCase().includes(query);
        if (!matchesName && !matchesProvince) return false;
      }
      // Province filter
      if (selectedProvince !== 'All' && item.province !== selectedProvince) {
        return false;
      }
      // Status filter
      const itemStatus = (item as any).status || 'Verified';
      if (selectedStatus !== 'All' && itemStatus !== selectedStatus) {
        return false;
      }
      return true;
    });

    // Sorting
    if (tableSortField) {
      result.sort((a, b) => {
        if (tableSortField === 'project') {
          return tableSortDirection === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (tableSortField === 'available') {
          return tableSortDirection === 'asc'
            ? a.availableAmount - b.availableAmount
            : b.availableAmount - a.availableAmount;
        }
        if (tableSortField === 'price') {
          return tableSortDirection === 'asc'
            ? a.pricePerTon - b.pricePerTon
            : b.pricePerTon - a.pricePerTon;
        }
        return 0;
      });
    } else {
      result.sort((a, b) => {
        if (sortOption === 'price_asc') {
          return a.pricePerTon - b.pricePerTon;
        }
        if (sortOption === 'price_desc') {
          return b.pricePerTon - a.pricePerTon;
        }
        if (sortOption === 'available_desc') {
          return b.availableAmount - a.availableAmount;
        }
        if (sortOption === 'project_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'project_desc') {
          return b.name.localeCompare(a.name);
        }
        // default newest (by vintage or order)
        return (b.vintage || 2024) - (a.vintage || 2024);
      });
    }

    return result;
  }, [listings, activeTab, searchQuery, selectedProvince, selectedStatus, sortOption, tableSortField, tableSortDirection]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedProvince, selectedStatus, sortOption, tableSortField, tableSortDirection]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE));
  const paginatedListings = useMemo(() => {
    if (listings.length <= 30) return filteredListings;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage, listings.length]);

  // Tab navigation refs
  const tabRefs = useRef<{ [key in CategoryTab]?: HTMLButtonElement | null }>({});
  const tabList: { id: CategoryTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'hydro', label: 'Hydropower', count: counts.hydro },
    { id: 'forestry', label: 'Community forestry', count: counts.forestry },
    { id: 'biogas', label: 'Biogas', count: counts.biogas },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabList.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabList.length) % tabList.length;
      e.preventDefault();
    }
    if (nextIndex !== index) {
      const nextTab = tabList[nextIndex].id;
      setActiveTab(nextTab);
      const btn = tabRefs.current[nextTab];
      btn?.focus();
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  };

  const handleHeaderSort = (field: 'project' | 'available' | 'price') => {
    if (tableSortField === field) {
      if (tableSortDirection === 'asc') {
        setTableSortDirection('desc');
      } else {
        setTableSortField(null);
        setTableSortDirection('asc');
      }
    } else {
      setTableSortField(field);
      setTableSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setSelectedProvince('All');
    setSelectedStatus('All');
    setSortOption('newest');
    setTableSortField(null);
  };

  return (
    <div className="w-full select-none">
      {/* Scoped CSS for Glassmorphism, Fallbacks, and Responsive Modes */}
      <style>{`
        .live-listings-container {
          border-radius: 28px;
          padding: 24px;
          overflow: hidden;
          position: relative;
          background:
            radial-gradient(60% 80% at 8% 0%, rgba(43,108,176,0.16), transparent 70%),
            radial-gradient(55% 70% at 92% 10%, rgba(92,122,74,0.18), transparent 70%),
            radial-gradient(60% 80% at 60% 100%, rgba(200,130,74,0.10), transparent 70%),
            #F1F5F2;
          border: 1px solid rgba(255, 255, 255, 0.7);
        }

        @media (max-width: 600px) {
          .live-listings-container {
            padding: 16px;
          }
        }

        .live-listings-tab {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          color: #17241D;
          border-radius: 999px;
          padding: 8px 18px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          cursor: pointer;
          transition: background 150ms ease;
        }

        .live-listings-tab:hover {
          background: rgba(255, 255, 255, 0.85);
        }

        .live-listings-tab.active {
          background: var(--forest) !important;
          color: #FFFFFF !important;
          border: none !important;
        }

        .live-listings-toolbar {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px) saturate(140%);
          -webkit-backdrop-filter: blur(16px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 16px;
          padding: 10px;
        }

        .live-listings-control {
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(27, 58, 47, 0.14);
          color: #17241D;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
        }

        .live-listings-control:focus-visible {
          outline: 2px solid var(--forest);
          outline-offset: 2px;
        }

        .live-listings-row {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 6px 20px rgba(23, 36, 29, 0.06);
          min-height: 56px;
          transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
        }

        @media (hover: hover) {
          .live-listings-row:hover {
            background: rgba(255, 255, 255, 0.9);
            border-color: rgba(27, 58, 47, 0.22);
            transform: translateY(-1px);
          }
        }

        .live-listings-buy-btn {
          background: var(--forest);
          color: #FFFFFF;
          border-radius: 10px;
          height: 36px;
          padding: 0 18px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 13px;
          border: none;
          box-shadow: 0 1px 0 rgba(23, 36, 29, 0.15);
          cursor: pointer;
          transition: background 150ms ease;
        }

        .live-listings-buy-btn:hover:not(:disabled) {
          background: #234A3C;
        }

        .live-listings-buy-btn:disabled {
          background: rgba(27, 58, 47, 0.12) !important;
          color: #17241D !important;
          cursor: not-allowed !important;
          box-shadow: none !important;
        }

        /* Hide scrollbar for tab row */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Fallbacks when backdrop-filter is unsupported */
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .live-listings-tab,
          .live-listings-toolbar,
          .live-listings-row {
            background: #FFFFFF !important;
          }
        }

        /* Accessibility: prefers-reduced-transparency */
        @media (prefers-reduced-transparency: reduce) {
          .live-listings-tab,
          .live-listings-toolbar,
          .live-listings-row {
            background: #FFFFFF !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }

        /* Accessibility: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .live-listings-row {
            transition: none !important;
            transform: none !important;
          }
          .supply-fill-bar {
            transition: none !important;
          }
        }
      `}</style>

      <section className="live-listings-container">
        {/* ================= SECTION HEADER ================= */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2
              className="font-fraunces text-[24px] font-[500] tracking-[-0.01em] leading-tight"
              style={{ color: '#17241D' }}
            >
              Live listings
            </h2>
            <span
              className="px-2.5 py-0.5 rounded-full text-[12px] font-[500]"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                color: '#17241D',
              }}
            >
              {filteredListings.length} active
            </span>
          </div>

          <div
            className="text-[12px] font-[400]"
            style={{ color: '#17241D' }}
          >
            Updated just now
          </div>
        </div>

        {/* ================= CATEGORY TABS ================= */}
        <div className="mb-4">
          <div
            role="tablist"
            aria-label="Filter listings by project category"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
          >
            {tabList.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[tab.id] = el;
                  }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`live-listings-tab ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  <span
                    className="text-[11px] font-[500] px-1.5 py-0.2 rounded-full"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(27,58,47,0.08)',
                      color: isActive ? '#FFFFFF' : '#17241D',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= TOOLBAR ================= */}
        <div className="live-listings-toolbar mb-5 flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6B61]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects"
              className="live-listings-control w-full pl-9 pr-3 placeholder-[#5B6B61] placeholder:opacity-100"
            />
          </div>

          {/* Provinces Select */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="live-listings-control w-full pl-3 pr-8 appearance-none cursor-pointer"
            >
              <option value="All">All provinces</option>
              {availableProvinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#17241D]" />
          </div>

          {/* Status Select */}
          <div className="relative min-w-[120px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="live-listings-control w-full pl-3 pr-8 appearance-none cursor-pointer"
            >
              <option value="All">All statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#17241D]" />
          </div>

          {/* Sort Select */}
          <div className="relative min-w-[140px]">
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value as SortField);
                setTableSortField(null);
              }}
              className="live-listings-control w-full pl-3 pr-8 appearance-none cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price low to high</option>
              <option value="price_desc">Price high to low</option>
              <option value="available_desc">Most available</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#17241D]" />
          </div>
        </div>

        {/* ================= LISTINGS SECTION ================= */}
        {filteredListings.length === 0 ? (
          /* Empty State */
          <div className="live-listings-row p-8 text-center my-4">
            <SearchX className="w-7 h-7 mx-auto mb-2.5 text-[#17241D]" />
            <h3
              className="text-[15px] font-[500] mb-1"
              style={{ color: '#17241D' }}
            >
              No listings match your filters
            </h3>
            <p className="text-[13px] font-[400] mb-4" style={{ color: '#17241D' }}>
              Try broadening your category or province search criteria.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-[10px] text-[13px] font-[500] border border-[rgba(27,58,47,0.22)] bg-white/70 hover:bg-white text-[#17241D] cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {/* Desktop / Tablet Table View (hidden below 720px) */}
            <div className="hidden min-[721px]:block">
              {/* Header Row (sticky inside container on desktop) */}
              <div
                className="grid items-center px-3.5 py-2 text-[12px] font-[500] text-[#17241D] select-none sticky top-0 z-10"
                style={{
                  gridTemplateColumns: 'minmax(180px, 1.8fr) 110px 95px minmax(80px, 0.9fr) minmax(90px, 1fr) minmax(110px, 1.1fr) minmax(95px, 1fr) minmax(76px, 114px)',
                }}
              >
                {/* 1. Project (sortable) */}
                <button
                  type="button"
                  onClick={() => handleHeaderSort('project')}
                  aria-sort={
                    tableSortField === 'project'
                      ? tableSortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="flex items-center gap-1.5 text-left text-[12px] font-[500] text-[#17241D] cursor-pointer hover:opacity-80"
                >
                  <span>Project</span>
                  {tableSortField === 'project' ? (
                    tableSortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  )}
                </button>

                {/* 2. Type */}
                <div>Type</div>

                {/* 3. Status */}
                <div>Status</div>

                {/* 4. Province (hidden <= 1100px via responsive styling) */}
                <div className="hidden min-[1101px]:block">Province</div>

                {/* 5. Available (sortable) */}
                <button
                  type="button"
                  onClick={() => handleHeaderSort('available')}
                  aria-sort={
                    tableSortField === 'available'
                      ? tableSortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="flex items-center gap-1 text-left text-[12px] font-[500] text-[#17241D] cursor-pointer hover:opacity-80"
                >
                  <span>Available</span>
                  {tableSortField === 'available' ? (
                    tableSortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  )}
                </button>

                {/* 6. Supply (hidden <= 1100px) */}
                <div className="hidden min-[1101px]:block">Supply</div>

                {/* 7. Price (sortable) */}
                <button
                  type="button"
                  onClick={() => handleHeaderSort('price')}
                  aria-sort={
                    tableSortField === 'price'
                      ? tableSortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className="flex items-center gap-1 text-left text-[12px] font-[500] text-[#17241D] cursor-pointer hover:opacity-80"
                >
                  <span>Price</span>
                  {tableSortField === 'price' ? (
                    tableSortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  )}
                </button>

                {/* 8. Action */}
                <div className="text-right sr-only">Action</div>
              </div>

              {/* Floating Rows List */}
              <div className="space-y-2 mt-1">
                {paginatedListings.map((item) => {
                  const solPrice = (item.pricePerTon / rate).toFixed(3);
                  const isSoldOut = item.availableAmount <= 0;
                  const itemStatus = (item as any).status || 'Verified';

                  // Supply math: totalMinted
                  const totalMinted = (item as any).totalMinted || Math.round(item.availableAmount / 0.78);
                  const supplyPct = Math.min(100, Math.max(0, Math.round((item.availableAmount / totalMinted) * 100)));

                  // Category styling
                  let catColor = '#2B6CB0';
                  let catTint = 'var(--hydro-tint)';
                  let catBorder = 'rgba(43,108,176,0.25)';
                  let catLabel = 'Hydropower';
                  let Icon = Droplets;

                  if (item.category === 'forestry') {
                    catColor = '#1B3A2F';
                    catTint = 'var(--forest-tint)';
                    catBorder = 'rgba(27,58,47,0.25)';
                    catLabel = 'Community forestry';
                    Icon = Trees;
                  } else if (item.category === 'biogas') {
                    catColor = '#5C7A4A';
                    catTint = 'var(--moss-tint)';
                    catBorder = 'rgba(92,122,74,0.25)';
                    catLabel = 'Biogas';
                    Icon = Flame;
                  }

                  return (
                    <div
                      key={item.id}
                      className="live-listings-row grid items-center px-3.5 py-2.5 gap-2"
                      style={{
                        gridTemplateColumns: 'minmax(180px, 1.8fr) 110px 95px minmax(80px, 0.9fr) minmax(90px, 1fr) minmax(110px, 1.1fr) minmax(95px, 1fr) minmax(76px, 114px)',
                      }}
                    >
                      {/* 1. Project: 32px rounded-square (10px radius) icon tile + name */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className="w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center"
                          style={{
                            background: catTint,
                            color: catColor,
                          }}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <div
                            title={item.name}
                            className="text-[14px] font-[500] text-[#17241D] truncate leading-tight"
                          >
                            {item.name}
                          </div>
                          {/* Province as small second line under project name at <= 1100px */}
                          <div className="min-[1101px]:hidden text-[11.5px] font-[400] text-[#17241D] mt-0.5 truncate">
                            {item.province}
                          </div>
                        </div>
                      </div>

                      {/* 2. Type: Category Tag Pill with small colored dot */}
                      <div>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-[500] text-[#17241D] whitespace-nowrap"
                          style={{
                            background: catTint,
                            border: `1px solid ${catBorder}`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: catColor }}
                          />
                          <span className="truncate max-w-[75px]">{catLabel}</span>
                        </span>
                      </div>

                      {/* 3. Status Pill */}
                      <div>
                        {itemStatus === 'Verified' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500] whitespace-nowrap"
                            style={{
                              background: 'var(--moss-tint)',
                              color: '#3E5531',
                              border: '1px solid rgba(92, 122, 74, 0.35)',
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500] whitespace-nowrap"
                            style={{
                              background: 'var(--clay-tint)',
                              color: '#8A5327',
                              border: '1px solid rgba(200, 130, 74, 0.35)',
                            }}
                          >
                            <Clock className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      {/* 4. Province (hidden at <= 1100px) */}
                      <div className="hidden min-[1101px]:block text-[13px] font-[400] text-[#17241D] truncate">
                        {item.province}
                      </div>

                      {/* 5. Available */}
                      <div className="text-[14px] font-[500] text-[#17241D] tabular-nums whitespace-nowrap">
                        {item.availableAmount.toLocaleString()} tCO2e
                      </div>

                      {/* 6. Supply Bar (hidden at <= 1100px) */}
                      <div className="hidden min-[1101px]:flex items-center gap-2 pr-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[rgba(27,58,47,0.10)] overflow-hidden">
                          <div
                            className="supply-fill-bar h-full rounded-full transition-all duration-400 ease-out"
                            style={{
                              background: catColor,
                              width: hasRendered ? `${supplyPct}%` : '0%',
                            }}
                          />
                        </div>
                        <span className="text-[12px] font-[400] text-[#17241D] tabular-nums shrink-0">
                          {supplyPct}%
                        </span>
                      </div>

                      {/* 7. Price */}
                      <div>
                        <div className="text-[14px] font-[500] text-[#17241D] tabular-nums leading-tight">
                          {solPrice} SOL
                        </div>
                        <div className="text-[11.5px] font-[400] text-[#17241D] tabular-nums mt-0.5">
                          (${item.pricePerTon.toFixed(2)}) / tCO2e
                        </div>
                      </div>

                      {/* 8. Action Buy & Gallery Buttons */}
                      <div className="text-right flex items-center justify-end gap-1.5">
                        {onOpenGallery && (
                          <button
                            type="button"
                            onClick={() => onOpenGallery(item)}
                            className="w-8 h-8 rounded-[8px] border border-[rgba(27,58,47,0.18)] bg-white/80 hover:bg-[#E7EEE9] text-[#1B3A2F] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title={`View site image gallery for ${item.name}`}
                            aria-label={`View site image gallery for ${item.name}`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => onBuyClick(item)}
                          className="live-listings-buy-btn"
                          aria-label={`Buy credits from ${item.name}`}
                        >
                          {isSoldOut ? 'Sold out' : 'Buy'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Stacked Card View (below 720px) */}
            <div className="min-[721px]:hidden space-y-3">
              {paginatedListings.map((item) => {
                const solPrice = (item.pricePerTon / rate).toFixed(3);
                const isSoldOut = item.availableAmount <= 0;
                const itemStatus = (item as any).status || 'Verified';

                const totalMinted = (item as any).totalMinted || Math.round(item.availableAmount / 0.78);
                const supplyPct = Math.min(100, Math.max(0, Math.round((item.availableAmount / totalMinted) * 100)));

                let catColor = '#2B6CB0';
                let catTint = 'var(--hydro-tint)';
                let catBorder = 'rgba(43,108,176,0.25)';
                let catLabel = 'Hydropower';
                let Icon = Droplets;

                if (item.category === 'forestry') {
                  catColor = '#1B3A2F';
                  catTint = 'var(--forest-tint)';
                  catBorder = 'rgba(27,58,47,0.25)';
                  catLabel = 'Community forestry';
                  Icon = Trees;
                } else if (item.category === 'biogas') {
                  catColor = '#5C7A4A';
                  catTint = 'var(--moss-tint)';
                  catBorder = 'rgba(92,122,74,0.25)';
                  catLabel = 'Biogas';
                  Icon = Flame;
                }

                return (
                  <div
                    key={item.id}
                    className="live-listings-row p-3.5 space-y-3"
                  >
                    {/* Top line = icon tile, project name, status pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center"
                          style={{
                            background: catTint,
                            color: catColor,
                          }}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <div
                          title={item.name}
                          className="text-[14px] font-[500] text-[#17241D] truncate"
                        >
                          {item.name}
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div className="shrink-0">
                        {itemStatus === 'Verified' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500]"
                            style={{
                              background: 'var(--moss-tint)',
                              color: '#3E5531',
                              border: '1px solid rgba(92, 122, 74, 0.35)',
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-[500]"
                            style={{
                              background: 'var(--clay-tint)',
                              color: '#8A5327',
                              border: '1px solid rgba(200, 130, 74, 0.35)',
                            }}
                          >
                            <Clock className="w-3 h-3" strokeWidth={1.75} />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle = type tag, province */}
                    <div className="flex items-center justify-between text-[12px] gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-[500] text-[#17241D]"
                        style={{
                          background: catTint,
                          border: `1px solid ${catBorder}`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: catColor }}
                        />
                        <span>{catLabel}</span>
                      </span>

                      <span className="text-[13px] font-[400] text-[#17241D]">
                        {item.province} Province
                      </span>
                    </div>

                    {/* Two-column mini grid (Available, Price) */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[rgba(27,58,47,0.08)]">
                      <div>
                        <div className="text-[11px] font-[400] text-[#17241D]">
                          Available
                        </div>
                        <div className="text-[14px] font-[500] text-[#17241D] tabular-nums">
                          {item.availableAmount.toLocaleString()} tCO2e
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] font-[400] text-[#17241D]">
                          Unit Price
                        </div>
                        <div className="text-[14px] font-[500] text-[#17241D] tabular-nums">
                          {solPrice} SOL{' '}
                          <span className="text-[11.5px] font-[400]">
                            (${item.pricePerTon.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Supply Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-[400] text-[#17241D]">
                        <span>Minted supply active</span>
                        <span className="tabular-nums font-[500]">{supplyPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(27,58,47,0.10)] overflow-hidden">
                        <div
                          className="supply-fill-bar h-full rounded-full transition-all duration-400 ease-out"
                          style={{
                            background: catColor,
                            width: hasRendered ? `${supplyPct}%` : '0%',
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons (Gallery + Buy) */}
                    <div className="flex items-center gap-2">
                      {onOpenGallery && (
                        <button
                          type="button"
                          onClick={() => onOpenGallery(item)}
                          className="px-3 py-2 rounded-[10px] border border-[rgba(27,58,47,0.18)] bg-white hover:bg-[#E7EEE9] text-[#1B3A2F] text-[12px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer"
                          aria-label={`View site photos for ${item.name}`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photos</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => onBuyClick(item)}
                        className="flex-1 live-listings-buy-btn"
                      >
                        {isSoldOut ? 'Sold out' : 'Buy credits'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= FOOTER & PAGINATION ================= */}
        <div className="mt-4 pt-3 border-t border-[rgba(27,58,47,0.10)] flex items-center justify-between text-[12px] font-[400] text-[#17241D] flex-wrap gap-2">
          <span>
            Showing {filteredListings.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            {' '}-{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)} of {filteredListings.length} listings
          </span>

          {listings.length > 30 && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="w-7 h-7 rounded-[8px] border border-[rgba(27,58,47,0.22)] bg-white/70 flex items-center justify-center disabled:opacity-40 hover:bg-white text-[#17241D] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums px-1.5 font-[500]">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="w-7 h-7 rounded-[8px] border border-[rgba(27,58,47,0.22)] bg-white/70 flex items-center justify-center disabled:opacity-40 hover:bg-white text-[#17241D] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
