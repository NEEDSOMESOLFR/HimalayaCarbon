import React, { useState, useEffect, useRef } from 'react';
import { X, Layers } from 'lucide-react';
import { HydroWaterIcon, ForestryTreeIcon, BiogasSunIcon } from './CategoryIcons';

interface RegistrationNoticeModalProps {
  onClose: () => void;
}

export function RegistrationNoticeModal({ onClose }: RegistrationNoticeModalProps) {
  const [isComingSoon, setIsComingSoon] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const comingSoonTitleRef = useRef<HTMLHeadingElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap & accessibility management
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock background scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus to the primary Close button on open
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [onClose]);

  useEffect(() => {
    if (isComingSoon && comingSoonTitleRef.current) {
      comingSoonTitleRef.current.focus();
    }
  }, [isComingSoon]);

  const handleRequestPilotAccess = () => {
    setIsComingSoon(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={isComingSoon ? 'coming-soon-title' : 'registration-notice-title'}
      aria-describedby={isComingSoon ? 'coming-soon-body' : 'registration-notice-intro'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[6px] modal-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full relative flex flex-col overflow-hidden glass-strong rounded-[24px] border border-white/80 shadow-2xl"
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
        }}
      >
        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-7">
          {/* Top row: Status pill ("Restricted" or "Coming soon") + Close (X) button */}
          <div className="flex items-center justify-between mb-4">
            <span
              className="neu-inset-pill px-3 py-1 text-[12px] font-medium"
              style={{
                color: '#8A5327',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8742A] inline-block mr-1.5 align-middle" />
              {isComingSoon ? 'Coming soon' : 'Restricted'}
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="neu-btn w-8 h-8 flex items-center justify-center cursor-pointer text-[var(--ink-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isComingSoon ? (
            <div className="modal-fade-in">
              {/* Title (Fraunces, 24px, weight 500, letter-spacing -0.01em) */}
              <h2
                id="registration-notice-title"
                className="font-fraunces text-[24px] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--ink)]"
              >
                Project registration is invite-only
              </h2>

              {/* Intro (Inter 14px, --ink-soft) */}
              <p
                id="registration-notice-intro"
                className="mt-2 text-[14px] leading-relaxed text-[var(--ink-secondary)] font-normal"
              >
                New projects are onboarded through a verified pilot programme. Open public registration is not available.
              </p>

              {/* Section label: WHAT VERIFIED PROJECTS MUST SUBMIT */}
              <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] mt-6 mb-2.5">
                WHAT VERIFIED PROJECTS MUST SUBMIT
              </div>

              {/* Bordered list */}
              <div className="rounded-[16px] overflow-hidden bg-white/40 border border-white/60">
                {/* 1. Hydropower */}
                <div className="p-3.5 flex items-start gap-3 bg-white/50">
                  <div className="neu-icon-circle w-8 h-8 shrink-0 text-[#2B6CB0]">
                    <HydroWaterIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink)]">
                      Hydropower
                    </div>
                    <div className="text-[13px] leading-relaxed text-[var(--ink-secondary)] mt-0.5">
                      Generation licence and survey licence from the Department of Electricity Development, plus approved environmental assessment.
                    </div>
                  </div>
                </div>

                {/* 2. Community forestry */}
                <div className="p-3.5 flex items-start gap-3 border-t border-[rgba(20,50,40,0.08)] bg-white/50">
                  <div className="neu-icon-circle w-8 h-8 shrink-0 text-[var(--forest)]">
                    <ForestryTreeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink)]">
                      Community forestry
                    </div>
                    <div className="text-[13px] leading-relaxed text-[var(--ink-secondary)] mt-0.5">
                      Community Forest User Group registration and an approved operational plan from the District Forest Office.
                    </div>
                  </div>
                </div>

                {/* 3. Biogas */}
                <div className="p-3.5 flex items-start gap-3 border-t border-[rgba(20,50,40,0.08)] bg-white/50">
                  <div className="neu-icon-circle w-8 h-8 shrink-0 text-[#5C7A4A]">
                    <BiogasSunIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink)]">
                      Biogas
                    </div>
                    <div className="text-[13px] leading-relaxed text-[var(--ink-secondary)] mt-0.5">
                      Installation certification and a household or institutional beneficiary register.
                    </div>
                  </div>
                </div>

                {/* 4. All projects */}
                <div className="p-3.5 flex items-start gap-3 border-t border-[rgba(20,50,40,0.08)] bg-white/50">
                  <div className="neu-icon-circle w-8 h-8 shrink-0 text-[var(--ink-tertiary)]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink)]">
                      All projects
                    </div>
                    <div className="text-[13px] leading-relaxed text-[var(--ink-secondary)] mt-0.5">
                      Baseline emissions methodology, monitoring plan, and an independent third-party verification report.
                    </div>
                  </div>
                </div>
              </div>

              {/* Section label: HOW ONBOARDING WORKS */}
              <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] mt-6 mb-2.5">
                HOW ONBOARDING WORKS
              </div>

              {/* Three numbered steps */}
              <div className="flex flex-col min-[560px]:flex-row gap-3 min-[560px]:gap-4">
                <div className="flex items-start gap-2.5 min-[560px]:flex-1">
                  <div className="neu-icon-circle w-6 h-6 text-[12px] font-semibold text-[var(--ink)] shrink-0">
                    1
                  </div>
                  <span className="text-[13px] leading-snug text-[var(--ink)]">
                    Submit an expression of interest
                  </span>
                </div>

                <div className="flex items-start gap-2.5 min-[560px]:flex-1">
                  <div className="neu-icon-circle w-6 h-6 text-[12px] font-semibold text-[var(--ink)] shrink-0">
                    2
                  </div>
                  <span className="text-[13px] leading-snug text-[var(--ink)]">
                    Documents reviewed by the registry verifier
                  </span>
                </div>

                <div className="flex items-start gap-2.5 min-[560px]:flex-1">
                  <div className="neu-icon-circle w-6 h-6 text-[12px] font-semibold text-[var(--ink)] shrink-0">
                    3
                  </div>
                  <span className="text-[13px] leading-snug text-[var(--ink)]">
                    Approved projects can register and mint on-chain
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 sm:py-16 text-center modal-fade-in flex flex-col items-center justify-center">
              <h2
                id="coming-soon-title"
                ref={comingSoonTitleRef}
                tabIndex={-1}
                className="font-fraunces text-[24px] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--ink)] outline-none"
              >
                Pilot access will be live soon
              </h2>

              <p
                id="coming-soon-body"
                className="mt-2.5 text-[14px] leading-relaxed text-[var(--ink-secondary)] max-w-[360px]"
              >
                We are not accepting pilot requests yet. Check back shortly.
              </p>
            </div>
          )}

          {/* Footer inside the modal */}
          <div className="mt-7 pt-5 flex flex-col min-[560px]:flex-row items-start min-[560px]:items-center justify-between gap-4 border-t border-[rgba(20,50,40,0.08)]">
            <div className="text-[12px] leading-relaxed text-[var(--ink-tertiary)] min-[560px]:max-w-[260px]">
              Demo notice: this is a hackathon prototype on Solana devnet. Nothing here is a real registry entry or an endorsement by any agency.
            </div>

            <div className="flex items-center gap-2.5 w-full min-[560px]:w-auto justify-end shrink-0">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="neu-btn h-[40px] px-5 text-[13px] font-medium cursor-pointer"
              >
                Close
              </button>

              {!isComingSoon && (
                <button
                  type="button"
                  onClick={handleRequestPilotAccess}
                  className="btn-copper h-[40px] px-5 text-[13px] font-medium inline-flex items-center justify-center cursor-pointer text-center"
                >
                  Request pilot access
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
