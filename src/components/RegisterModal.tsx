import React, { useState } from 'react';
import { CategoryType, VerificationQueueItem } from '../types';
import { X, CheckCircle2 } from 'lucide-react';

interface RegisterModalProps {
  onClose: () => void;
  onSubmit: (newItem: VerificationQueueItem) => void;
}

export function RegisterModal({ onClose, onSubmit }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryType>('hydro');
  const [province, setProvince] = useState('Gandaki');
  const [sizeOrCapacity, setSizeOrCapacity] = useState('');
  const [methodology, setMethodology] = useState('ACM0002 Consolidated hydro methodology');
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sizeOrCapacity.trim()) return;

    const newItem: VerificationQueueItem = {
      id: 'vq-' + Math.random().toString(36).substring(2, 8),
      name: name.trim(),
      category,
      location: province,
      sizeOrCapacity: sizeOrCapacity.trim(),
      status: 'Pending',
      submittedDate: 'Today',
      methodology,
    };

    onSubmit(newItem);
    setIsDone(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-150 motion-reduce:transition-none select-none"
      style={{ backgroundColor: 'rgba(23, 36, 29, 0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[500px] rounded-[20px] p-6 sm:p-7 relative bg-[var(--paper)] border border-[var(--line-strong)]">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close dialog"
          className="w-8 h-8 rounded-[10px] border border-[var(--line-strong)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--ink)] hover:bg-[var(--bg)] absolute top-5 right-5"
        >
          <X className="w-4 h-4" />
        </button>

        {!isDone ? (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--forest)]" />
              <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--ink)]">
                Project Registry Submission
              </span>
            </div>

            <h2 className="font-fraunces text-[24px] font-medium leading-snug text-[var(--ink)]">
              Register a Nepalese Project
            </h2>

            <p className="text-[14px] mt-1 text-[var(--ink)] leading-relaxed">
              Submit environmental sensor metrics and land tenure for on-chain verification and credit issuance.
            </p>

            <div className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[12px] font-semibold mb-1 text-[var(--ink)]">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Upper Trishuli Hydropower or Pokhara User Forest"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[40px] px-3.5 rounded-[10px] text-[14px] bg-[var(--paper)] border border-[var(--line-strong)] focus:outline-none focus:border-[var(--forest)] text-[var(--ink)] placeholder:text-[#5B6B61]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1 text-[var(--ink)]">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const cat = e.target.value as CategoryType;
                      setCategory(cat);
                      if (cat === 'hydro') setMethodology('ACM0002 Consolidated hydro methodology');
                      else if (cat === 'forestry') setMethodology('AR-ACM0003 Community Afforestation');
                      else setMethodology('AMS-I.C. Thermal energy for household digestion');
                    }}
                    className="w-full h-[40px] px-3 rounded-[10px] text-[13px] bg-[var(--paper)] border border-[var(--line-strong)] focus:outline-none focus:border-[var(--forest)] text-[var(--ink)] cursor-pointer"
                  >
                    <option value="hydro">Hydropower</option>
                    <option value="forestry">Community forestry</option>
                    <option value="biogas">Biogas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-1 text-[var(--ink)]">
                    Province
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full h-[40px] px-3 rounded-[10px] text-[13px] bg-[var(--paper)] border border-[var(--line-strong)] focus:outline-none focus:border-[var(--forest)] text-[var(--ink)] cursor-pointer"
                  >
                    <option value="Gandaki">Gandaki</option>
                    <option value="Koshi">Koshi</option>
                    <option value="Bagmati">Bagmati</option>
                    <option value="Lumbini">Lumbini</option>
                    <option value="Karnali">Karnali</option>
                    <option value="Sudurpashchim">Sudurpashchim</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold mb-1 text-[var(--ink)]">
                  Capacity / Physical Footprint
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14.5 MW or 1,800 ha or 150 biodigesters"
                  value={sizeOrCapacity}
                  onChange={(e) => setSizeOrCapacity(e.target.value)}
                  className="w-full h-[40px] px-3.5 rounded-[10px] text-[14px] bg-[var(--paper)] border border-[var(--line-strong)] focus:outline-none focus:border-[var(--forest)] text-[var(--ink)] placeholder:text-[#5B6B61]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold mb-1 text-[var(--ink)]">
                  Methodology Standard
                </label>
                <input
                  type="text"
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="w-full h-[40px] px-3.5 rounded-[10px] text-[13px] bg-[var(--paper)] border border-[var(--line-strong)] focus:outline-none focus:border-[var(--forest)] text-[var(--ink)] placeholder:text-[#5B6B61]"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                className="w-full h-[44px] rounded-[10px] bg-[#C8824A] text-white text-[14px] font-semibold flex items-center justify-center cursor-pointer hover:bg-[#B06F3F] transition-colors"
              >
                Submit for Verification
              </button>
            </div>
          </form>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 text-[#3E5531] bg-[var(--moss-tint)] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-[#3E5531]" />
            </div>
            <h3 className="font-fraunces text-[22px] font-medium text-[var(--ink)]">
              Project Queued for Verification
            </h3>
            <p className="mt-1 text-[14px] text-[var(--ink)]">
              Added to Nepal AEPC verification ledger with Pending status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
