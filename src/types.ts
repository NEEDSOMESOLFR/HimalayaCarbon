export type CategoryType = 'hydro' | 'forestry' | 'biogas';

export type ImageTagCategory =
  | 'Aerial & Satellite'
  | 'Facility & Plant'
  | 'Ecosystem & Canopy'
  | 'Community & Field'
  | 'Audit & Sensor';

export interface ProjectSiteImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  caption: string;
  categoryTag: ImageTagCategory;
  capturedDate: string;
  photographerOrSource?: string;
  elevation?: string;
  coordinates?: { lat: number; lng: number };
}

export interface ProjectListing {
  id: string;
  name: string;
  category: CategoryType;
  vintage: number;
  availableAmount: number;
  pricePerTon: number;
  province: string;
  capacityOrSize: string;
  verifier: string;
  mintAddress: string;
  lat?: number;
  lng?: number;
  siteImages?: ProjectSiteImage[];
}

export interface VerificationQueueItem {
  id: string;
  name: string;
  category: CategoryType;
  location: string;
  sizeOrCapacity: string;
  status: 'Pending' | 'Verified';
  submittedDate: string;
  methodology: string;
}

export interface ProvinceStat {
  name: string;
  projectCount: number;
  dotColor: 'forest' | 'hydro' | 'moss' | 'clay' | 'muted';
  tCO2e: string;
  elevation: string;
}

export interface RetirementCertificate {
  certificateId: string;
  projectName: string;
  category: CategoryType;
  amount: number;
  beneficiary: string;
  reason: string;
  txSignature: string;
  timestamp: string;
  retiredBy: string;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  solBalance: number;
  usdcBalance: number;
  walletType?: 'phantom' | 'solflare';
}

export interface PurchaseReceipt {
  receiptNo: string;
  signature: string;
  slot: number;
  blockTime: number; // unix seconds
  isApproximateTime?: boolean;
  buyer: string;
  recipient: string;
  projectId: string;
  projectName: string;
  category: CategoryType | 'hydropower' | 'forestry' | 'biogas';
  province: string;
  qty: number;
  unitPriceLamports: string;
  totalLamports: string;
  feeLamports?: string;
  demoSolUsd: number;
  retire: boolean;
  beneficiary?: string;
  purpose?: string;
  cluster: 'devnet';
}
