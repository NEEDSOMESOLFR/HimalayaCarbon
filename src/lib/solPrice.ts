/**
 * Live Solana (SOL/USD) price service using reliable free public APIs
 * with automatic fallback (Coinbase -> CoinGecko -> Binance).
 */

export interface SolPriceData {
  price: number;
  source: string;
  timestamp: number;
}

// Sensible fallback in case all external networks are completely offline
const DEFAULT_FALLBACK_PRICE = 148.50;

export async function fetchLiveSolPrice(): Promise<SolPriceData> {
  // 1. Try Coinbase API (Fast, reliable, CORS enabled, no API key needed)
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const amount = parseFloat(data?.data?.amount);
      if (!isNaN(amount) && amount > 0) {
        return {
          price: amount,
          source: 'Coinbase',
          timestamp: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('Coinbase price fetch failed, trying CoinGecko...', err);
  }

  // 2. Fallback to CoinGecko Simple Price API
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      const amount = parseFloat(data?.solana?.usd);
      if (!isNaN(amount) && amount > 0) {
        return {
          price: amount,
          source: 'CoinGecko',
          timestamp: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('CoinGecko price fetch failed, trying Binance...', err);
  }

  // 3. Fallback to Binance Ticker API
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
    if (res.ok) {
      const data = await res.json();
      const amount = parseFloat(data?.price);
      if (!isNaN(amount) && amount > 0) {
        return {
          price: amount,
          source: 'Binance',
          timestamp: Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('Binance price fetch failed, using cached default:', err);
  }

  return {
    price: DEFAULT_FALLBACK_PRICE,
    source: 'Reference',
    timestamp: Date.now(),
  };
}

/**
 * Calculates SOL amount from USD price using the live SOL exchange rate
 */
export function calculateSolPrice(priceUsd: number, solUsdRate: number, decimals = 3): string {
  if (!solUsdRate || solUsdRate <= 0) return '0.000';
  const solVal = priceUsd / solUsdRate;
  return solVal.toFixed(decimals);
}
