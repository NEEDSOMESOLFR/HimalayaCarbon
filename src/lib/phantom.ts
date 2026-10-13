import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RPC_URL } from '../config';

export function getSolanaProvider(): any {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  return win.phantom?.solana ?? win.solflare ?? win.solana ?? null;
}

// Kept for backward compatibility
export function getPhantomProvider(): any {
  return getSolanaProvider();
}

export function getSolanaConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

export async function fetchSolBalance(address: string): Promise<number> {
  try {
    const connection = getSolanaConnection();
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    return Number((lamports / LAMPORTS_PER_SOL).toFixed(4));
  } catch (err) {
    console.error('[wallet] Could not fetch devnet balance from RPC:', err);
    return 0;
  }
}

export async function requestDevnetAirdrop(address: string): Promise<string> {
  const connection = getSolanaConnection();
  const pubkey = new PublicKey(address);
  const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction(
    {
      signature: sig,
      ...latestBlockhash,
    },
    'confirmed'
  );
  return sig;
}

