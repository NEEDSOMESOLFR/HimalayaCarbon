import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectListing, ProjectSiteImage, ImageTagCategory } from '../types';
import { getProjectSiteImages } from '../data/projectGalleryData';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Camera,
  Calendar,
  MapPin,
  Mountain,
  ShieldCheck,
  Expand,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { HydroWaterIcon, ForestryTreeIcon, BiogasSunIcon } from './CategoryIcons';

interface ProjectGalleryModalProps {
  listing: ProjectListing;
  onClose: () => void;
  onBuyClick?: (listing: ProjectListing) => void;
}

export function ProjectGalleryModal({
  listing,
  onClose,
  onBuyClick,
}: ProjectGalleryModalProps) {
  const images = getProjectSiteImages(listing);

  // Active filter state
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Touch tracking for mobile swipe in lightbox
  const touchStartXRef = useRef<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Filtered images list
  const filteredImages = selectedTag === 'All'
    ? images
    : images.filter((img) => img.categoryTag === selectedTag);

  // Category visual metadata
  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'hydro':
        return {
          label: 'Hydropower',
          color: '#2B6CB0',
          tint: 'var(--hydro-tint, #E8F0F9)',
          border: 'rgba(43, 108, 176, 0.25)',
          Icon: HydroWaterIcon,
        };
      case 'forestry':
        return {
          label: 'Community Forestry',
          color: '#1B3A2F',
          tint: 'var(--forest-tint, #E7EEE9)',
          border: 'rgba(27, 58, 47, 0.25)',
          Icon: ForestryTreeIcon,
        };
      case 'biogas':
      default:
        return {
          label: 'Biogas & Clean Energy',
          color: '#5C7A4A',
          tint: 'var(--moss-tint, #EEF2E7)',
          border: 'rgba(92, 122, 74, 0.25)',
          Icon: BiogasSunIcon,
        };
    }
  };

  const meta = getCategoryMeta(listing.category);

  // Available tag filters
  const tagsList = ['All', ...Array.from(new Set(images.map((img) => img.categoryTag)))];

  // Lock body scroll on mount
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          // Close lightbox first
          setLightboxIndex(null);
          setZoomLevel(1);
        } else {
          onClose();
        }
      } else if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : 0));
          setZoomLevel(1);
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : 0));
          setZoomLevel(1);
        }
      }
    },
    [lightboxIndex, images.length, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lightbox navigation helpers
  const handleNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
      setZoomLevel(1);
    }
  };

  const handlePrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
      setZoomLevel(1);
    }
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 1.75 : prev === 1.75 ? 2.5 : 1));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      lightboxRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartXRef.current = null;
  };

  const activeLightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-modal-title"
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-5 md:p-6"
      style={{
        backgroundColor: 'rgba(15, 25, 20, 0.68)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && lightboxIndex === null) {
          onClose();
        }
      }}
    >
      {/* MODAL MAIN DIALOG CONTAINER */}
      <div
        ref={modalContentRef}
        className="relative w-full max-w-[1140px] max-h-[92vh] flex flex-col rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-2xl border transition-all"
        style={{
          background: 'linear-gradient(175deg, #FCFCFA 0%, #F5F7F4 100%)',
          borderColor: 'rgba(27, 58, 47, 0.16)',
          boxShadow: '0 24px 64px -12px rgba(15, 28, 22, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= MODAL HEADER ================= */}
        <header className="px-5 sm:px-7 py-5 border-b border-[rgba(27,58,47,0.10)] bg-white/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            {/* Category Icon */}
            <div
              className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: meta.tint,
                border: `1px solid ${meta.border}`,
              }}
            >
              <meta.Icon className="w-5 h-5" style={{ color: meta.color }} />
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase"
                  style={{
                    backgroundColor: meta.tint,
                    color: meta.color,
                    border: `1px solid ${meta.border}`,
                  }}
                >
                  {meta.label}
                </span>

                <span className="flex items-center gap-1 text-[12px] text-[#55695E] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#1B3A2F]" />
                  <span>{listing.province} Province</span>
                </span>

                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#A8B5AC]" />

                <span className="hidden sm:flex items-center gap-1 text-[12px] text-[#55695E]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#3E5531]" />
                  <span className="truncate max-w-[200px]">{listing.verifier}</span>
                </span>
              </div>

              <h2
                id="gallery-modal-title"
                className="font-fraunces text-[22px] sm:text-[25px] font-[500] text-[#17241D] tracking-[-0.015em] leading-tight truncate"
              >
                {listing.name} · Site Image Gallery
              </h2>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            {onBuyClick && (
              <button
                type="button"
                onClick={() => {
                  onBuyClick(listing);
                  onClose();
                }}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, #C8824A 0%, #A9622D 100%)',
                }}
              >
                <span>Buy Credits</span>
                <span className="text-white/80 font-normal text-[12px]">
                  (${listing.pricePerTon.toFixed(2)}/t)
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-[10px] border border-[rgba(27,58,47,0.18)] bg-white/80 hover:bg-[#E7EEE9] text-[#17241D] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close site gallery modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= STATS & FILTER STRIP ================= */}
        <div className="px-5 sm:px-7 py-3 border-b border-[rgba(27,58,47,0.08)] bg-[#FAFAF8] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tag Filter Pills */}
          <div
            role="tablist"
            aria-label="Filter site photos by tag"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
          >
            {tagsList.map((tag) => {
              const isActive = selectedTag === tag;
              const count = tag === 'All' ? images.length : images.filter((img) => img.categoryTag === tag).length;
              return (
                <button
                  key={tag}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1B3A2F] text-white shadow-xs'
                      : 'bg-white border border-[rgba(27,58,47,0.14)] text-[#2C4135] hover:bg-[#E7EEE9]'
                  }`}
                >
                  <span>{tag}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-[#EBF1ED] text-[#1B3A2F]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick info caption */}
          <div className="text-[12px] text-[#55695E] flex items-center gap-1.5 font-medium ml-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#C8824A]" />
            <span>Click any image to open full-resolution Lightbox viewer</span>
          </div>
        </div>

        {/* ================= GALLERY GRID BODY ================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {filteredImages.length === 0 ? (
            <div className="py-16 text-center text-[#55695E] bg-white rounded-[20px] border border-[rgba(27,58,47,0.10)] p-8">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#1B3A2F]" />
              <p className="font-medium text-[15px]">No photos found under "{selectedTag}".</p>
              <button
                type="button"
                onClick={() => setSelectedTag('All')}
                className="mt-3 text-[13px] font-semibold text-[#1B3A2F] underline cursor-pointer"
              >
                View all site photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredImages.map((image) => {
                // Determine absolute index in images array for lightbox navigation
                const fullIndex = images.findIndex((img) => img.id === image.id);
                const isLoaded = loadedImages[image.id];
                const isFailed = failedImages[image.id];

                return (
                  <div
                    key={image.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open photo: ${image.title}`}
                    onClick={() => {
                      setLightboxIndex(fullIndex);
                      setZoomLevel(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setLightboxIndex(fullIndex);
                        setZoomLevel(1);
                      }
                    }}
                    className="group relative bg-white rounded-[18px] border border-[rgba(27,58,47,0.14)] overflow-hidden shadow-xs hover:shadow-lg hover:border-[rgba(27,58,47,0.35)] transition-all duration-200 cursor-pointer flex flex-col focus-visible:outline-2 focus-visible:outline-[#1B3A2F]"
                  >
                    {/* Image frame */}
                    <div className="relative aspect-[16/10] bg-[#EAF0EB] overflow-hidden">
                      {/* Loading skeleton shimmer */}
                      {!isLoaded && !isFailed && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#EAF0EB] via-[#F4F7F4] to-[#EAF0EB] animate-pulse" />
                      )}

                      {/* Actual Image */}
                      {!isFailed ? (
                        <img
                          src={image.url}
                          alt={image.title}
                          loading="lazy"
                          onLoad={() => setLoadedImages((prev) => ({ ...prev, [image.id]: true }))}
                          onError={() => setFailedImages((prev) => ({ ...prev, [image.id]: true }))}
                          className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
                            isLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                      ) : (
                        /* Graceful fallback */
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#E7EEE9] to-[#D5E2D8]">
                          <Camera className="w-8 h-8 text-[#1B3A2F] opacity-60 mb-1" />
                          <span className="text-[12px] font-semibold text-[#17241D]">{image.title}</span>
                          <span className="text-[11px] text-[#55695E]">Himalaya Site Photography</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-xs"
                          style={{
                            background: 'rgba(23, 36, 29, 0.72)',
                            color: '#FFFFFF',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                          }}
                        >
                          {image.categoryTag}
                        </span>

                        {image.elevation && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10.5px] font-medium backdrop-blur-md shadow-xs flex items-center gap-1"
                            style={{
                              background: 'rgba(255, 255, 255, 0.85)',
                              color: '#17241D',
                              border: '1px solid rgba(27, 58, 47, 0.15)',
                            }}
                          >
                            <Mountain className="w-3 h-3 text-[#1B3A2F]" />
                            <span>{image.elevation}</span>
                          </span>
                        )}
                      </div>

                      {/* Hover Overlay with Lightbox Prompt */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,25,20,0.65)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="px-3.5 py-1.5 rounded-full bg-white/95 text-[#17241D] text-[12px] font-semibold shadow-md flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                          <Expand className="w-3.5 h-3.5 text-[#1B3A2F]" />
                          <span>View in Lightbox</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Description Footer */}
                    <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        <h3 className="font-fraunces text-[16px] font-[500] text-[#17241D] leading-snug line-clamp-1 group-hover:text-[#1B3A2F] transition-colors">
                          {image.title}
                        </h3>
                        <p className="mt-1 text-[12.5px] text-[#4F6357] leading-relaxed line-clamp-2">
                          {image.caption}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[rgba(27,58,47,0.08)] flex items-center justify-between text-[11px] text-[#6D8075]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{image.capturedDate}</span>
                        </span>
                        {image.photographerOrSource && (
                          <span className="truncate max-w-[140px]" title={image.photographerOrSource}>
                            {image.photographerOrSource}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <footer className="px-5 sm:px-7 py-3.5 bg-white border-t border-[rgba(27,58,47,0.10)] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#55695E] shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3E5531]" />
            <span className="font-medium text-[#17241D]">
              {images.length} verified photographic assets on-chain
            </span>
            <span className="text-[#899C91]">· All imagery captured in {listing.province}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] border border-[rgba(27,58,47,0.18)] hover:bg-[#E7EEE9] text-[#17241D] font-medium transition-colors cursor-pointer"
          >
            Close gallery
          </button>
        </footer>
      </div>

      {/* ================= LIGHTBOX OVERLAY EFFECT ================= */}
      {lightboxIndex !== null && activeLightboxImage && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-label="High-resolution image lightbox"
          tabIndex={-1}
          className="fixed inset-0 z-[300] bg-black/92 backdrop-blur-xl flex flex-col justify-between animate-fade-in text-white select-none overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxIndex(null);
              setZoomLevel(1);
            }
          }}
        >
          {/* Lightbox Top Control Bar */}
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent z-10 shrink-0">
            {/* Title & Index */}
            <div className="flex items-center gap-3 min-w-0">
              <span className="px-2.5 py-1 rounded-full bg-white/15 text-white text-[12px] font-mono font-medium">
                {lightboxIndex + 1} / {images.length}
              </span>
              <div className="min-w-0">
                <h4 className="font-fraunces text-[17px] sm:text-[19px] font-[500] text-white truncate">
                  {activeLightboxImage.title}
                </h4>
                <div className="text-[12px] text-white/70 flex items-center gap-2 truncate">
                  <span>{activeLightboxImage.categoryTag}</span>
                  {activeLightboxImage.elevation && (
                    <>
                      <span>·</span>
                      <span>{activeLightboxImage.elevation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lightbox Tools */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Zoom Button */}
              <button
                type="button"
                onClick={toggleZoom}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title={zoomLevel > 1 ? 'Reset zoom' : 'Zoom in'}
                aria-label="Toggle zoom level"
              >
                {zoomLevel > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden sm:flex w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors cursor-pointer"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Open Image Source */}
              <a
                href={activeLightboxImage.url}
                target="_blank"
                rel="noreferrer noopener"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Open high-res image directly"
                aria-label="Open high-res image in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Close Lightbox */}
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(null);
                  setZoomLevel(1);
                }}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                title="Close lightbox (Esc)"
                aria-label="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage (Image + Left/Right chevrons) */}
          <div className="relative flex-1 flex items-center justify-center px-2 sm:px-16 overflow-hidden">
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Previous site photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-6 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Next site photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Large Image Frame */}
            <div
              className="max-w-[90vw] max-h-[72vh] flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
                cursor: zoomLevel > 1 ? 'zoom-out' : 'zoom-in',
              }}
              onClick={toggleZoom}
            >
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.title}
                className="max-w-full max-h-[72vh] object-contain rounded-[14px] shadow-2xl pointer-events-auto"
              />
            </div>
          </div>

          {/* Lightbox Bottom Info & Thumbnail Strip */}
          <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 sm:p-5 flex flex-col gap-3 z-10 shrink-0">
            {/* Caption & Metadata tags */}
            <div className="max-w-[840px] mx-auto text-center px-4">
              <p className="text-[14px] sm:text-[15px] text-white/90 leading-relaxed font-normal">
                {activeLightboxImage.caption}
              </p>

              <div className="mt-2 flex items-center justify-center gap-3 sm:gap-5 text-[12px] text-white/60 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Captured: {activeLightboxImage.capturedDate}</span>
                </span>
                {activeLightboxImage.photographerOrSource && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#97D4A2]" />
                    <span>Source: {activeLightboxImage.photographerOrSource}</span>
                  </span>
                )}
                {activeLightboxImage.coordinates && (
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {activeLightboxImage.coordinates.lat.toFixed(3)}°N, {activeLightboxImage.coordinates.lng.toFixed(3)}°E
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Carousel */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 max-w-[95vw] mx-auto no-scrollbar">
              {images.map((thumb, idx) => {
                const isActive = idx === lightboxIndex;
                return (
                  <button
                    key={thumb.id}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setZoomLevel(1);
                    }}
                    className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-[8px] overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      isActive
                        ? 'border-white scale-105 shadow-md opacity-100 ring-2 ring-white/30'
                        : 'border-transparent opacity-50 hover:opacity-85'
                    }`}
                  >
                    <img
                      src={thumb.url}
                      alt={thumb.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
