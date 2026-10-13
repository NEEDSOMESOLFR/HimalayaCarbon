import { ProjectListing, VerificationQueueItem, ProvinceStat } from '../types';
import { PROJECT_GALLERIES } from './projectGalleryData';

export const DEMO_SOL_USD = 140;

export function formatSolWithUsd(priceUsd: number, decimals: number = 3): { sol: string; usd: string; full: string } {
  const solVal = priceUsd / DEMO_SOL_USD;
  const sol = `${solVal.toFixed(decimals)} SOL`;
  const usd = `($${priceUsd.toFixed(2)})`;
  return {
    sol,
    usd,
    full: `${sol} ${usd}`,
  };
}

export const INITIAL_LISTINGS: ProjectListing[] = [
  {
    id: 'lst-1',
    name: 'Lower Bhotekoshi Hydro',
    category: 'hydro',
    vintage: 2024,
    availableAmount: 14800,
    pricePerTon: 9.10,
    province: 'Bagmati',
    capacityOrSize: '45 MW run-of-river',
    verifier: 'TÜV SÜD · Gold Standard GS-4GG',
    mintAddress: 'Bhot4xQJ...k99R',
    lat: 27.86,
    lng: 85.92,
    siteImages: PROJECT_GALLERIES['lst-1'],
  },
  {
    id: 'lst-2',
    name: 'Annapurna Buffer Zone Forestry',
    category: 'forestry',
    vintage: 2023,
    availableAmount: 28400,
    pricePerTon: 8.60,
    province: 'Gandaki',
    capacityOrSize: '3,450 hectares native sal & pine',
    verifier: 'Plan Vivo Foundation · FECOFUN Nepal',
    mintAddress: 'Anna7yPL...m23W',
    lat: 28.60,
    lng: 84.00,
    siteImages: PROJECT_GALLERIES['lst-2'],
  },
  {
    id: 'lst-3',
    name: 'Pokhara Organic Waste Biogas',
    category: 'biogas',
    vintage: 2024,
    availableAmount: 4200,
    pricePerTon: 7.80,
    province: 'Gandaki',
    capacityOrSize: '120 m³/day municipal digestion',
    verifier: 'AEPC Nepal · UNFCCC CDM PoA 2431',
    mintAddress: 'Pokh3zMT...v88K',
    lat: 28.21,
    lng: 83.99,
    siteImages: PROJECT_GALLERIES['lst-3'],
  },
  {
    id: 'lst-4',
    name: 'Tamor River Hydro Station',
    category: 'hydro',
    vintage: 2022,
    availableAmount: 32000,
    pricePerTon: 8.20,
    province: 'Koshi',
    capacityOrSize: '24 MW run-of-river',
    verifier: 'SGS United Kingdom · Verra VCS 1892',
    mintAddress: 'Tamo5kPR...w11X',
    lat: 27.25,
    lng: 87.68,
    siteImages: PROJECT_GALLERIES['lst-4'],
  },
  {
    id: 'lst-5',
    name: 'Chure Range Community Forestry',
    category: 'forestry',
    vintage: 2021,
    availableAmount: 19500,
    pricePerTon: 9.40,
    province: 'Lumbini',
    capacityOrSize: '2,100 hectares sal conservation',
    verifier: 'Plan Vivo Foundation · FECOFUN Nepal',
    mintAddress: 'Chur8nLM...y44Z',
    lat: 27.65,
    lng: 83.45,
    siteImages: PROJECT_GALLERIES['lst-5'],
  },
  {
    id: 'lst-6',
    name: 'Upper Karnali Biodigester Network',
    category: 'biogas',
    vintage: 2023,
    availableAmount: 6800,
    pricePerTon: 7.40,
    province: 'Karnali',
    capacityOrSize: '85 m³/day household digestion',
    verifier: 'AEPC Nepal · UNFCCC CDM PoA 2431',
    mintAddress: 'Karn2pTY...z77Q',
    lat: 28.95,
    lng: 81.60,
    siteImages: PROJECT_GALLERIES['lst-6'],
  },
];

export const INITIAL_QUEUE: VerificationQueueItem[] = [
  {
    id: 'vq-1',
    name: 'Mithila community forest',
    category: 'forestry',
    location: 'Koshi',
    sizeOrCapacity: '1,200 ha',
    status: 'Pending',
    submittedDate: 'Oct 3, 2024',
    methodology: 'AR-ACM0003 Community Afforestation',
  },
  {
    id: 'vq-2',
    name: 'Tamor micro-hydro',
    category: 'hydro',
    location: 'Gandaki',
    sizeOrCapacity: '3.2 MW',
    status: 'Verified',
    submittedDate: 'Sep 27, 2024',
    methodology: 'AMS-I.D. Grid connected renewable electricity',
  },
  {
    id: 'vq-3',
    name: 'Sindhuli biogas co-op',
    category: 'biogas',
    location: 'Bagmati',
    sizeOrCapacity: '40 households',
    status: 'Pending',
    submittedDate: 'Oct 6, 2024',
    methodology: 'AMS-I.C. Thermal energy for household digestion',
  },
  {
    id: 'vq-4',
    name: 'Kaligandaki run-of-river',
    category: 'hydro',
    location: 'Gandaki',
    sizeOrCapacity: '8 MW',
    status: 'Verified',
    submittedDate: 'Sep 19, 2024',
    methodology: 'ACM0002 Consolidated hydro methodology',
  },
];

export const PROVINCES_DATA: ProvinceStat[] = [
  {
    name: 'Gandaki',
    projectCount: 14,
    dotColor: 'forest',
    tCO2e: '84,200',
    elevation: 'High Himalayas & Annapurna Basin',
  },
  {
    name: 'Koshi',
    projectCount: 9,
    dotColor: 'hydro',
    tCO2e: '42,100',
    elevation: 'Eastern Watershed & Kanchenjunga',
  },
  {
    name: 'Bagmati',
    projectCount: 7,
    dotColor: 'moss',
    tCO2e: '31,500',
    elevation: 'Central Valleys & Bhotekoshi River',
  },
  {
    name: 'Lumbini',
    projectCount: 4,
    dotColor: 'clay',
    tCO2e: '16,800',
    elevation: 'Terai Lowland & Chure Range',
  },
  {
    name: 'Karnali',
    projectCount: 2,
    dotColor: 'muted',
    tCO2e: '6,400',
    elevation: 'Upper Karnali River Canyon',
  },
  {
    name: 'Sudurpashchim',
    projectCount: 1,
    dotColor: 'muted',
    tCO2e: '3,620',
    elevation: 'Far-Western Mahakali Basin',
  },
];

export const PRICE_SPARKLINE_BARS = [
  { heightPct: 42, label: 'Jan' },
  { heightPct: 48, label: 'Feb' },
  { heightPct: 52, label: 'Mar' },
  { heightPct: 58, label: 'Apr' },
  { heightPct: 63, label: 'May' },
  { heightPct: 70, label: 'Jun' },
  { heightPct: 78, label: 'Jul' },
  { heightPct: 86, label: 'Aug' },
  { heightPct: 100, label: 'Sep' }, // Last bar is solid white
];

