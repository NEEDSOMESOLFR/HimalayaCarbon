import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createFungible, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, percentAmount, generateSigner, publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config();

const TOKEN_DECIMALS = 0;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  console.info('[init-mints] Starting mint initialization on Solana devnet...');
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load or generate issuer keypair
  const issuerKeyPath = path.join(process.cwd(), 'backend', 'issuer.json');
  let issuerKeypair: Keypair;

  if (process.env.ISSUER_SECRET_KEY) {
    try {
      const secret = JSON.parse(process.env.ISSUER_SECRET_KEY);
      issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
    } catch (e) {
      console.warn('[init-mints] Failed to parse ISSUER_SECRET_KEY from env, checking issuer.json or generating...');
      issuerKeypair = Keypair.generate();
    }
  } else if (fs.existsSync(issuerKeyPath)) {
    const data = JSON.parse(fs.readFileSync(issuerKeyPath, 'utf-8'));
    issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
    console.info('[init-mints] Loaded issuer keypair from backend/issuer.json');
  } else {
    issuerKeypair = Keypair.generate();
    if (!fs.existsSync(path.dirname(issuerKeyPath))) {
      fs.mkdirSync(path.dirname(issuerKeyPath), { recursive: true });
    }
    fs.writeFileSync(issuerKeyPath, JSON.stringify(Array.from(issuerKeypair.secretKey)));
    console.info('[init-mints] Generated new issuer keypair and saved to backend/issuer.json');
  }

  console.info('[init-mints] Issuer public key:', issuerKeypair.publicKey.toBase58());

  // Check issuer balance, airdrop if needed on devnet
  const balance = await connection.getBalance(issuerKeypair.publicKey);
  console.info('[init-mints] Issuer balance:', balance / 1e9, 'SOL');
  if (balance < 0.5 * 1e9) {
    try {
      console.info('[init-mints] Requesting airdrop for issuer...');
      const sig = await connection.requestAirdrop(issuerKeypair.publicKey, 1 * 1e9);
      await connection.confirmTransaction(sig, 'confirmed');
      console.info('[init-mints] Airdrop successful.');
    } catch (err) {
      console.warn('[init-mints] Airdrop failed or rate-limited:', err);
    }
  }

  // Load projects
  const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
  if (!fs.existsSync(projectsPath)) {
    console.error('[init-mints] data/projects.json not found!');
    process.exit(1);
  }
  const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));

  // Initialize Umi for Metaplex Token Metadata
  const umi = createUmi(RPC_URL).use(mplTokenMetadata());
  const umiKeypair = fromWeb3JsKeypair(issuerKeypair);
  umi.use(keypairIdentity(umiKeypair));

  const mintsData: Record<string, { mint: string; vaultAta: string; supply: number }> = {};
  const mintsPath = path.join(process.cwd(), 'data', 'mints.json');

  for (const project of projects) {
    const projectName = project.name.length > 32 ? project.name.slice(0, 32) : project.name;
    console.info(`[init-mints] Processing project: ${project.id} (${projectName})`);

    // 1. Create Mint (classic SPL Token)
    const mintKeypair = generateSigner(umi);
    const mintPubkey = new PublicKey(mintKeypair.publicKey);

    // Create mint using @solana/spl-token
    console.info(`[init-mints] Creating mint ${mintPubkey.toBase58()}...`);
    const mint = await createMint(
      connection,
      issuerKeypair,
      issuerKeypair.publicKey,
      null,
      TOKEN_DECIMALS,
      undefined,
      { commitment: 'confirmed' }
    );

    // 2. Create Metaplex Token Metadata (Fungible)
    console.info(`[init-mints] Creating Metaplex Token Metadata for ${mint.toBase58()}...`);
    try {
      await createFungible(umi, {
        mint: mintKeypair,
        authority: umi.identity,
        name: projectName,
        symbol: 'tCO2e',
        uri: `https://himalaya-carbon.app/metadata/${project.id}.json`,
        sellerFeeBasisPoints: percentAmount(0),
        decimals: TOKEN_DECIMALS,
      }).sendAndConfirm(umi);
      console.info(`[init-mints] Metadata created successfully for ${project.id}`);
    } catch (metaErr) {
      console.warn(`[init-mints] Metadata creation warning for ${project.id}:`, metaErr);
    }

    // 3. Create Issuer ATA (Vault) & Mint Supply
    console.info(`[init-mints] Creating vault ATA for issuer...`);
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      connection,
      issuerKeypair,
      mint,
      issuerKeypair.publicKey,
      false,
      'confirmed'
    );

    const mintSupplyQty = Math.max(project.supply * 2, 100000);
    console.info(`[init-mints] Minting initial supply of ${mintSupplyQty} tCO2e to vault ${vaultAta.address.toBase58()}...`);
    await mintTo(
      connection,
      issuerKeypair,
      mint,
      vaultAta.address,
      issuerKeypair,
      mintSupplyQty,
      [],
      { commitment: 'confirmed' }
    );

    mintsData[project.id] = {
      mint: mint.toBase58(),
      vaultAta: vaultAta.address.toBase58(),
      supply: mintSupplyQty,
    };
  }

  fs.writeFileSync(mintsPath, JSON.stringify(mintsData, null, 2));
  console.info('[init-mints] Completed successfully! Mints saved to data/mints.json');
}

main().catch((err) => {
  console.error('[init-mints] Fatal error:', err);
  process.exit(1);
});
