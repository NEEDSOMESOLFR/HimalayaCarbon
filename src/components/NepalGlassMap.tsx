import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ProjectListing, CategoryType } from '../types';
import { NEPAL_OUTLINE_PATH } from '../lib/nepalOutline';

interface NepalGlassMapProps {
  listings: ProjectListing[];
  onViewProject?: (listing: ProjectListing) => void;
  solUsdRate?: number;
}

// Projection: equirectangular, latitude-corrected
// x = (lng - 80.0) * 87.95
// y = (30.5 - lat) * 100
// Covers lng 80.0 to 88.2 and lat 26.35 to 30.5 on a 720 x 415 coordinate canvas
function project(lng: number, lat: number): { x: number; y: number } {
  return {
    x: (lng - 80.0) * 87.95,
    y: (30.5 - lat) * 100,
  };
}

// Dotted Graticule lines
const GRATICULE_LNGS = [81, 82, 83, 84, 85, 86, 87, 88];
const GRATICULE_LATS = [27, 28, 29, 30];

interface ProjectedPin {
  item: ProjectListing;
  originalX: number;
  originalY: number;
  x: number;
  y: number;
  pctX: number;
  pctY: number;
}

export function NepalGlassMap({
  listings,
  onViewProject,
  solUsdRate = 148.5,
}: NepalGlassMapProps) {
  // Category visibility toggles (all ON by default)
  const [activeCategories, setActiveCategories] = useState<Set<CategoryType>>(
    new Set(['hydro', 'forestry', 'biogas'])
  );

  // Active pin and animation states
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [displayPinId, setDisplayPinId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isMobileDocked, setIsMobileDocked] = useState<boolean>(false);

  // Refs for timers and elements
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to test if device has fine pointer / hover support
  const isFinePointer = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  const clearAllTimers = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  // Open card for a specific pin
  const openCard = useCallback((pinId: string) => {
    clearAllTimers();
    setIsClosing(false);
    setActivePinId(pinId);
    setDisplayPinId(pinId);
  }, [clearAllTimers]);

  // Close card immediately with fade out
  const closeCardImmediately = useCallback(() => {
    clearAllTimers();

    // Immediately remove active state so pin ring reverts
    setActivePinId(null);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setIsClosing(false);
      setDisplayPinId(null);
    } else {
      setIsClosing(true);
      fadeTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setDisplayPinId(null);
        fadeTimerRef.current = null;
      }, 100);
    }
  }, [clearAllTimers]);

  // Schedule close with 150ms hover-intent delay
  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      closeCardImmediately();
    }, 150);
  }, [closeCardImmediately]);

  // Cancel scheduled close (user hovered back onto pin or card)
  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isClosing && displayPinId) {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      setIsClosing(false);
      setActivePinId(displayPinId);
    }
  }, [isClosing, displayPinId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Detect < 640px viewport for docking info card and close on resize
  useEffect(() => {
    const checkWidth = () => {
      setIsMobileDocked(window.innerWidth < 640);
      closeCardImmediately();
    };
    setIsMobileDocked(window.innerWidth < 640);
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [closeCardImmediately]);

  // Close on page scroll
  useEffect(() => {
    const handleScroll = () => {
      closeCardImmediately();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [closeCardImmediately]);

  // Close on Escape key and return focus to pin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const pinToFocus = activePinId || displayPinId;
        closeCardImmediately();
        if (pinToFocus) {
          pinRefs.current.get(pinToFocus)?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePinId, displayPinId, closeCardImmediately]);

  // Close when clicking outside container
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeCardImmediately();
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [closeCardImmediately]);

  // Toggle Category
  const toggleCategory = useCallback((cat: CategoryType) => {
    closeCardImmediately();
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, [closeCardImmediately]);

  // Filter listings with valid coordinates: lat in [26.3, 30.5], lng in [80.0, 88.3]
  const validListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.lat == null || item.lng == null) return false;
      return (
        item.lat >= 26.3 &&
        item.lat <= 30.5 &&
        item.lng >= 80.0 &&
        item.lng <= 88.3
      );
    });
  }, [listings]);

  // Active listings based on legend category toggles
  const visibleListings = useMemo(() => {
    return validListings.filter((item) => activeCategories.has(item.category));
  }, [validListings, activeCategories]);

  // Compute projected pins with radial collision avoidance (closer than 22px -> nudge apart)
  const projectedPins = useMemo<ProjectedPin[]>(() => {
    const raw = visibleListings.map((item) => {
      const pt = project(item.lng!, item.lat!);
      return {
        item,
        originalX: pt.x,
        originalY: pt.y,
        x: pt.x,
        y: pt.y,
        pctX: ((pt.x + 12) / 744) * 100,
        pctY: ((pt.y + 12) / 439) * 100,
      };
    });

    // Radial nudge if closer than 22px
    const MIN_DIST = 22;
    for (let i = 0; i < raw.length; i++) {
      for (let j = i + 1; j < raw.length; j++) {
        const dx = raw[j].x - raw[i].x;
        const dy = raw[j].y - raw[i].y;
        const dist = Math.hypot(dx, dy);
        if (dist < MIN_DIST && dist > 0) {
          const overlap = (MIN_DIST - dist) / 2;
          const nudge = Math.min(overlap, 10);
          const angle = Math.atan2(dy, dx);
          raw[i].x -= Math.cos(angle) * nudge;
          raw[i].y -= Math.sin(angle) * nudge;
          raw[j].x += Math.cos(angle) * nudge;
          raw[j].y += Math.sin(angle) * nudge;
        } else if (dist === 0) {
          raw[i].x -= 7;
          raw[j].x += 7;
        }
      }
    }

    // Sort left-to-right for accessible keyboard navigation order
    raw.sort((a, b) => a.x - b.x);

    // Recalculate percentages after nudging
    return raw.map((p) => ({
      ...p,
      pctX: ((p.x + 12) / 744) * 100,
      pctY: ((p.y + 12) / 439) * 100,
    }));
  }, [visibleListings]);

  // Currently active pin (retained during fade-out via displayPinId)
  const activePin = useMemo(() => {
    const targetId = activePinId || (isClosing ? displayPinId : null);
    if (!targetId) return null;
    return projectedPins.find((p) => p.item.id === targetId) || null;
  }, [activePinId, displayPinId, isClosing, projectedPins]);

  // Category Color Map
  const getCategoryTheme = (cat: CategoryType) => {
    switch (cat) {
      case 'hydro':
        return {
          label: 'Hydropower',
          color: '#2B6CB0',
          tint: 'var(--hydro-tint, #E8F0F9)',
        };
      case 'forestry':
        return {
          label: 'Community forestry',
          color: '#1B3A2F',
          tint: 'var(--forest-tint, #E7EEE9)',
        };
      case 'biogas':
        return {
          label: 'Biogas',
          color: '#5C7A4A',
          tint: 'var(--moss-tint, #EEF2E7)',
        };
    }
  };

  // Icon inside pin circle (white line icon, scales to 14px on desktop)
  const renderCategoryPinIcon = (cat: CategoryType) => {
    const iconClass =
      'w-[10px] h-[10px] min-[480px]:w-[12px] min-[480px]:h-[12px] sm:w-[14px] sm:h-[14px] text-white';
    switch (cat) {
      case 'hydro':
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12c2.5-3 5-3 7.5 0 2.5 3 5 3 7.5 0 2.5-3 4-3 5 0" />
            <path d="M2 17c2.5-3 5-3 7.5 0 2.5 3 5 3 7.5 0 2.5-3 4-3 5 0" />
          </svg>
        );
      case 'forestry':
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3L4 15h5v5h6v-5h5z" />
          </svg>
        );
      case 'biogas':
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        );
    }
  };

  const isCardAbove = activePin ? activePin.pctY > 44 : false;

  return (
    <div
      ref={containerRef}
      className="hero-glass-map rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 relative overflow-hidden select-none font-inter text-[#17241D] w-full"
      onClick={(e) => {
        // Close info card when clicking blank map background
        if (e.target === e.currentTarget) {
          closeCardImmediately();
        }
      }}
    >
      {/* TOP HEADER BAR (CHIP with 16px bottom margin) */}
      <div className="flex items-center justify-between mb-4 px-1 relative z-20 pointer-events-none">
        {/* Top-left chip: Inter 500 13px, padding 8px 14px */}
        <div className="inline-flex items-center gap-2 px-[14px] py-2 rounded-full bg-white/85 border border-[rgba(27,58,47,0.12)] text-[13px] font-medium text-[#17241D] shadow-sm pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--forest)] shrink-0" />
          <span>{projectedPins.length} projects mapped</span>
        </div>
      </div>

      {/* DRAWING CANVAS (Aspect ratio 744:439, min-height 380px at desktop) */}
      <div
        className="hero-map-drawing-canvas relative w-full overflow-visible"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            closeCardImmediately();
          }
        }}
      >
        {/* INLINE SVG MAP GRAPHIC */}
        <svg
          viewBox="-12 -12 744 439"
          className="w-full h-auto block"
          style={{ width: '100%', height: 'auto', aspectRatio: '744 / 439' }}
          role="group"
          aria-label="Map of project locations in Nepal"
        >
          <defs>
            {/* Landmass clipPath */}
            <clipPath id="nepal-landmass-clip">
              <path d={NEPAL_OUTLINE_PATH} />
            </clipPath>

            {/* Vertical linear gradient: soft blue (Himalaya) to green (Terai) */}
            <linearGradient id="nepal-elevation-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(43, 108, 176, 0.10)" />
              <stop offset="100%" stopColor="rgba(92, 122, 74, 0.12)" />
            </linearGradient>
          </defs>

          {/* DOTTED GRATICULE BEHIND LANDMASS */}
          <g className="graticule" pointerEvents="none">
            {GRATICULE_LNGS.map((lng) => {
              const pt = project(lng, 28);
              return (
                <line
                  key={`lng-${lng}`}
                  x1={pt.x}
                  y1={-12}
                  x2={pt.x}
                  y2={427}
                  stroke="rgba(27, 58, 47, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
              );
            })}
            {GRATICULE_LATS.map((lat) => {
              const pt = project(84, lat);
              return (
                <line
                  key={`lat-${lat}`}
                  x1={-12}
                  y1={pt.y}
                  x2={732}
                  y2={pt.y}
                  stroke="rgba(27, 58, 47, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
              );
            })}
          </g>

          {/* LANDMASS BASE */}
          <path
            d={NEPAL_OUTLINE_PATH}
            fill="rgba(255, 255, 255, 0.78)"
            stroke="rgba(27, 58, 47, 0.40)"
            strokeWidth="1.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* CLIPPED ELEVATION WASH OVERLAY */}
          <rect
            x="-12"
            y="-12"
            width="744"
            height="439"
            fill="url(#nepal-elevation-grad)"
            clipPath="url(#nepal-landmass-clip)"
            pointerEvents="none"
          />
        </svg>

        {/* EMPTY / NO PINS OVERLAY */}
        {projectedPins.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-4 py-2 rounded-full bg-white/90 border border-[rgba(27,58,47,0.12)] text-[14px] font-medium text-[#17241D]">
              {validListings.length === 0
                ? 'No project locations yet'
                : 'No projects visible in active categories'}
            </span>
          </div>
        )}

        {/* PINS LAYER */}
        {projectedPins.map((pin) => {
          // Selected ring shows ONLY while activePinId matches and is not closing
          const isSelected = activePinId === pin.item.id && !isClosing;
          const theme = getCategoryTheme(pin.item.category);
          const ariaLabel = `${pin.item.name}, ${theme.label}, ${pin.item.province} Province, ${pin.item.availableAmount.toLocaleString()} tCO2e available`;

          return (
            <div
              key={pin.item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
              style={{
                left: `${pin.pctX}%`,
                top: `${pin.pctY}%`,
              }}
            >
              <button
                ref={(el) => {
                  if (el) pinRefs.current.set(pin.item.id, el);
                  else pinRefs.current.delete(pin.item.id);
                }}
                type="button"
                data-lat={pin.item.lat}
                data-lng={pin.item.lng}
                aria-label={ariaLabel}
                aria-expanded={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFinePointer()) {
                    // For mouse users, clicking does not toggle/pin the card
                    return;
                  }
                  // Touch devices: tap to toggle
                  if (activePinId === pin.item.id) {
                    closeCardImmediately();
                  } else {
                    openCard(pin.item.id);
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' || isFinePointer()) {
                    openCard(pin.item.id);
                  }
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse' || isFinePointer()) {
                    scheduleClose();
                  }
                }}
                onFocus={() => {
                  openCard(pin.item.id);
                }}
                onBlur={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (cardRef.current && cardRef.current.contains(related)) {
                    // Focus moved into the card (e.g. Tab pressed)
                    return;
                  }
                  if (e.currentTarget.contains(related)) {
                    return;
                  }
                  closeCardImmediately();
                }}
                className="w-[44px] h-[44px] flex items-center justify-center cursor-pointer relative group focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 rounded-full"
              >
                {/* Halo Effect */}
                {isSelected ? (
                  // Static 2px ring at 6px offset for selected pin
                  <span
                    className="absolute inset-[-6px] rounded-full border-2 transition-all"
                    style={{ borderColor: theme.color }}
                  />
                ) : (
                  // Pulsing halo loop
                  <span
                    className="map-pin-pulse absolute w-[20px] h-[20px] min-[480px]:w-[24px] min-[480px]:h-[24px] sm:w-[30px] sm:h-[30px] rounded-full pointer-events-none"
                    style={{ backgroundColor: theme.color }}
                  />
                )}

                {/* Visual Pin Circle (30px on desktop, 24px below 640px, 20px below 480px; 2.5px white ring) */}
                <div
                  className="w-[20px] h-[20px] min-[480px]:w-[24px] min-[480px]:h-[24px] sm:w-[30px] sm:h-[30px] rounded-full flex items-center justify-center shadow-md transition-transform duration-120 group-hover:scale-112 group-focus:scale-112 border-[2.5px] border-white"
                  style={{ backgroundColor: theme.color }}
                >
                  {renderCategoryPinIcon(pin.item.category)}
                </div>
              </button>
            </div>
          );
        })}

        {/* FLOATING INFO CARD (DESKTOP >= 640px) */}
        {!isMobileDocked && activePin && (
          <div
            ref={cardRef}
            role="dialog"
            aria-label={activePin.item.name}
            tabIndex={-1}
            className={`absolute z-30 transition-opacity ${
              isClosing
                ? 'opacity-0 pointer-events-none duration-100 ease-in'
                : 'opacity-100 pointer-events-auto duration-120 ease-out'
            }`}
            style={{
              // Anchor above the pin with a reduced 6px gap; flip below if near the top
              // Clamp inside card with 8px padding: 280px wide (140px half-width + 8px = 148px)
              left: `clamp(148px, ${activePin.pctX}%, calc(100% - 148px))`,
              top: isCardAbove
                ? `calc(${activePin.pctY}% - 16px)`
                : `calc(${activePin.pctY}% + 16px)`,
              transform: isCardAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse' || isFinePointer()) {
                cancelClose();
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse' || isFinePointer()) {
                scheduleClose();
              }
            }}
            onBlur={(e) => {
              const related = e.relatedTarget as Node | null;
              const currentPinBtn = activePinId
                ? pinRefs.current.get(activePinId)
                : null;
              if (currentPinBtn && currentPinBtn.contains(related)) {
                return;
              }
              if (e.currentTarget.contains(related)) {
                return;
              }
              closeCardImmediately();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                const pinIdToFocus = activePinId || displayPinId;
                closeCardImmediately();
                if (pinIdToFocus) {
                  pinRefs.current.get(pinIdToFocus)?.focus();
                }
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Invisible hover-bridge extending toward the pin to prevent gap deadzones */}
            <div
              className={`absolute left-0 right-0 h-[22px] pointer-events-auto ${
                isCardAbove ? 'top-full' : 'bottom-full'
              }`}
              aria-hidden="true"
            />

            <div
              className="w-[280px] rounded-[16px] p-4 text-[#17241D] text-left border relative z-10"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'rgba(255, 255, 255, 0.9)',
                boxShadow: '0 8px 24px rgba(23, 36, 29, 0.12)',
              }}
            >
              {/* Category tag */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
                  style={{
                    backgroundColor: getCategoryTheme(activePin.item.category).tint,
                    color: getCategoryTheme(activePin.item.category).color,
                  }}
                >
                  {getCategoryTheme(activePin.item.category).label}
                </span>
              </div>

              {/* Project Name (Fraunces 500 20px) */}
              <h4 className="font-fraunces font-medium text-[20px] leading-[1.2] text-[#17241D]">
                {activePin.item.name}
              </h4>

              {/* Province */}
              <p className="text-[13px] font-normal text-[#17241D] mt-0.5">
                {activePin.item.province} Province
              </p>

              {/* 1px hairline */}
              <div className="my-2.5 border-t border-[rgba(27,58,47,0.12)]" />

              {/* Two columns: Available & Price */}
              <div className="grid grid-cols-2 gap-2 text-left mb-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#17241D]">
                    AVAILABLE
                  </div>
                  <div className="text-[14px] font-medium text-[#17241D] mt-0.5 truncate">
                    {activePin.item.availableAmount.toLocaleString()} tCO2e
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#17241D]">
                    PRICE
                  </div>
                  <div className="text-[14px] font-medium text-[#17241D] mt-0.5 truncate">
                    {(activePin.item.pricePerTon / solUsdRate).toFixed(3)} SOL
                  </div>
                </div>
              </div>

              {/* "View project" button (40px high) */}
              <button
                type="button"
                onClick={() => {
                  onViewProject?.(activePin.item);
                }}
                className="w-full h-[40px] rounded-[10px] bg-[var(--forest)] text-white hover:bg-[#234A3C] transition-colors flex items-center justify-center text-[13px] font-medium cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--forest)]"
              >
                View project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DOCKED INFO CARD STRIP (MOBILE < 640px) */}
      {isMobileDocked && activePin && (
        <div
          role="dialog"
          aria-label={activePin.item.name}
          className="mt-3 p-3.5 rounded-[16px] text-left border bg-white/95 border-white/90 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="px-2.5 py-0.5 rounded-full text-[12px] font-medium"
              style={{
                backgroundColor: getCategoryTheme(activePin.item.category).tint,
                color: getCategoryTheme(activePin.item.category).color,
              }}
            >
              {getCategoryTheme(activePin.item.category).label}
            </span>
            <button
              type="button"
              onClick={() => closeCardImmediately()}
              className="text-[12px] font-medium text-[var(--forest)] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          <h4 className="font-fraunces font-medium text-[20px] leading-[1.2] text-[#17241D]">
            {activePin.item.name}
          </h4>
          <p className="text-[13px] font-normal text-[#17241D] mt-0.5">
            {activePin.item.province} Province
          </p>

          <div className="my-2 border-t border-[rgba(27,58,47,0.12)]" />

          <div className="grid grid-cols-2 gap-2 text-left mb-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#17241D]">
                AVAILABLE
              </div>
              <div className="text-[14px] font-medium text-[#17241D] mt-0.5">
                {activePin.item.availableAmount.toLocaleString()} tCO2e
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#17241D]">
                PRICE
              </div>
              <div className="text-[14px] font-medium text-[#17241D] mt-0.5">
                {(activePin.item.pricePerTon / solUsdRate).toFixed(3)} SOL
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onViewProject?.(activePin.item);
            }}
            className="w-full h-[40px] rounded-[10px] bg-[var(--forest)] text-white hover:bg-[#234A3C] transition-colors flex items-center justify-center text-[13px] font-medium cursor-pointer"
          >
            View project
          </button>
        </div>
      )}

      {/* BOTTOM FOOTER: LEGEND TOGGLES + CAPTION (16px spacing) */}
      <div className="mt-4 pt-3 border-t border-[rgba(27,58,47,0.08)] flex flex-wrap items-center justify-between gap-3 text-[#17241D] relative z-20">
        {/* Legend buttons: 8px gap */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'hydro', label: 'Hydropower', color: '#2B6CB0' },
              { id: 'forestry', label: 'Community forestry', color: '#1B3A2F' },
              { id: 'biogas', label: 'Biogas', color: '#5C7A4A' },
            ] as const
          ).map((leg) => {
            const isPressed = activeCategories.has(leg.id);
            return (
              <button
                key={leg.id}
                type="button"
                aria-pressed={isPressed}
                onClick={() => toggleCategory(leg.id)}
                className={`inline-flex items-center gap-2 px-[14px] py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer border focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--forest)] focus-visible:outline-offset-2 ${
                  isPressed
                    ? 'bg-white/90 border-[rgba(27,58,47,0.18)] text-[#17241D]'
                    : 'bg-white/40 border-[rgba(27,58,47,0.08)] text-[#17241D]/60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: leg.color,
                    opacity: isPressed ? 1 : 0.4,
                  }}
                />
                <span>{leg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom-right caption: Inter 400 11px */}
        <div className="text-[11px] font-normal text-[#17241D] ml-auto">
          Illustrative boundaries. Demo data.
        </div>
      </div>
    </div>
  );
}
