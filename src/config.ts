import { PublicKey } from '@solana/web3.js';

export const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const RECIPIENT_ADDRESS = "6cLBRbRW7Rh4HyrKqkZdT48hp13iw1N3yJLoUbjeY1Y";
export const TREASURY_ADDRESS = RECIPIENT_ADDRESS;
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

// Validate RECIPIENT_ADDRESS with new PublicKey(...) in try/catch at startup
let isRecipientValid = false;
try {
  new PublicKey(RECIPIENT_ADDRESS);
  isRecipientValid = true;
} catch (e) {
  console.error('[config] Recipient address is misconfigured:', e);
  isRecipientValid = false;
}
export const IS_RECIPIENT_VALID = isRecipientValid;
export const IS_TREASURY_VALID = isRecipientValid;

// Feature flag for project registration flow
// When false, clicking "Register a project" opens the Registration Notice modal.
// When true, the full project registration form runs.
export const REGISTRATION_OPEN = false;

// Feature flag for on-chain burn
export const ONCHAIN_BURN_ENABLED = false;
