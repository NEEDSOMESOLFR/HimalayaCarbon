import { PurchaseReceipt } from '../types';

const STORAGE_KEY = 'hc_receipts';
const MAX_SAVED_RECEIPTS = 200;

/**
 * Generate standard receipt number:
 * "HC-" + YYYYMMDD (from blockTime, UTC) + "-" + first 6 characters of signature, uppercased
 */
export function generateReceiptNumber(blockTime: number, signature: string): string {
  const d = new Date(blockTime * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const yyyymmdd = `${year}${month}${day}`;
  const sigPrefix = signature.slice(0, 6).toUpperCase();
  return `HC-${yyyymmdd}-${sigPrefix}`;
}

/**
 * Format unix timestamp in UTC:
 * e.g. "14 Oct 2026, 09:42 UTC"
 */
export function formatUtcDateTime(blockTime: number): string {
  const d = new Date(blockTime * 1000);
  const day = d.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`;
}

/**
 * Format UTC date only:
 * e.g. "14 Oct 2026"
 */
export function formatUtcDate(blockTime: number): string {
  const d = new Date(blockTime * 1000);
  const day = d.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Lamports to formatted SOL string:
 * totals: 4 decimals
 * unit price: 6 decimals
 */
export function lamportsToSol(lamportsStr: string, decimals: number = 4): string {
  try {
    const lamports = BigInt(lamportsStr);
    const whole = lamports / 1000000000n;
    const fraction = lamports % 1000000000n;
    const fractionStr = fraction.toString().padStart(9, '0');
    const fullNum = Number(`${whole}.${fractionStr}`);
    return fullNum.toFixed(decimals);
  } catch {
    const n = Number(lamportsStr) / 1e9;
    return isNaN(n) ? '0.0000' : n.toFixed(decimals);
  }
}

/**
 * Format approximate USD:
 * "approx. $X at demo rate $Y/SOL"
 */
export function formatApproxUsd(totalLamportsStr: string, demoSolUsd: number): string {
  const solNum = Number(lamportsToSol(totalLamportsStr, 6));
  const usd = (solNum * demoSolUsd).toFixed(2);
  return `approx. $${usd} at demo rate $${demoSolUsd.toFixed(2)}/SOL`;
}

/**
 * Save receipt to localStorage (key: "hc_receipts")
 * De-duplicated by signature, keeps newest 200.
 */
export function saveReceipt(receipt: PurchaseReceipt): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: PurchaseReceipt[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      } catch (parseErr) {
        console.warn('[receipts] Failed to parse existing receipts:', parseErr);
        list = [];
      }
    }

    // De-duplicate by signature
    const existingIndex = list.findIndex((r) => r.signature === receipt.signature);
    if (existingIndex >= 0) {
      list[existingIndex] = receipt;
    } else {
      list.unshift(receipt);
    }

    // Keep newest 200
    if (list.length > MAX_SAVED_RECEIPTS) {
      list = list.slice(0, MAX_SAVED_RECEIPTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('[receipts] Failed to save receipt to localStorage:', err);
  }
}

/**
 * Retrieve saved receipts from localStorage
 * Optionally filtered by buyer wallet address, sorted newest first
 */
export function getSavedReceipts(buyerAddress?: string | null): PurchaseReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: PurchaseReceipt[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    let filtered = list;
    if (buyerAddress) {
      const lower = buyerAddress.toLowerCase();
      filtered = list.filter((r) => r.buyer && r.buyer.toLowerCase() === lower);
    }

    // Newest first by blockTime
    return filtered.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));
  } catch (err) {
    console.error('[receipts] Failed to read receipts from localStorage:', err);
    return [];
  }
}
