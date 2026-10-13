import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  createBurnCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config();

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());

// Rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
app.use('/api/', apiLimiter);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const RECIPIENT_ADDRESS = '6cLBRbRW7Rh4HyrKqkZdT48hp13iw1N3yJLoUbjeY1Y';
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const TOKEN_DECIMALS = 0;

// Load or generate Issuer Keypair
const issuerKeyPath = path.join(process.cwd(), 'backend', 'issuer.json');
let issuerKeypair: Keypair;
if (process.env.ISSUER_SECRET_KEY) {
  try {
    const secret = JSON.parse(process.env.ISSUER_SECRET_KEY);
    issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));
  } catch (e) {
    logger.warn('Failed to parse ISSUER_SECRET_KEY, falling back to issuer.json or generating');
    if (fs.existsSync(issuerKeyPath)) {
      const data = JSON.parse(fs.readFileSync(issuerKeyPath, 'utf-8'));
      issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
    } else {
      issuerKeypair = Keypair.generate();
      fs.writeFileSync(issuerKeyPath, JSON.stringify(Array.from(issuerKeypair.secretKey)));
    }
  }
} else if (fs.existsSync(issuerKeyPath)) {
  const data = JSON.parse(fs.readFileSync(issuerKeyPath, 'utf-8'));
  issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
} else {
  issuerKeypair = Keypair.generate();
  if (!fs.existsSync(path.dirname(issuerKeyPath))) {
    fs.mkdirSync(path.dirname(issuerKeyPath), { recursive: true });
  }
  fs.writeFileSync(issuerKeyPath, JSON.stringify(Array.from(issuerKeypair.secretKey)));
}
logger.info(`Issuer public key: ${issuerKeypair.publicKey.toBase58()}`);

// Initialize SQLite database for purchase records / history
const dbPath = path.join(process.cwd(), 'data', 'carbon.db');
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT NOT NULL,
    signature TEXT NOT NULL,
    buyer TEXT NOT NULL,
    project_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    total_lamports TEXT NOT NULL,
    retire INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Zod schemas for validation
const buySchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().optional(),
  qty: z.number().int().positive(),
  retire: z.boolean(),
  buyerWallet: z.string().min(32),
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', issuer: issuerKeypair.publicKey.toBase58() });
});

app.get('/api/projects', (req, res) => {
  try {
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    if (!fs.existsSync(projectsPath)) {
      return res.status(404).json({ error: 'projects.json not found' });
    }
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    res.json(projects);
  } catch (err: any) {
    logger.error({ err }, 'Error reading projects');
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mints', (req, res) => {
  try {
    const mintsPath = path.join(process.cwd(), 'data', 'mints.json');
    if (!fs.existsSync(mintsPath)) {
      return res.json({});
    }
    const mints = JSON.parse(fs.readFileSync(mintsPath, 'utf-8'));
    res.json(mints);
  } catch (err: any) {
    logger.error({ err }, 'Error reading mints');
    res.status(500).json({ error: err.message });
  }
});

// Alias mapping between frontend card IDs (lst-1..6) and canonical project IDs
const PROJECT_ALIASES: Record<string, string> = {
  'lst-1': 'lower-bhotekoshi-hydro',
  'lst-2': 'annapurna-buffer-zone-forestry',
  'lst-3': 'pokhara-organic-waste-biogas',
  'lst-4': 'tamor-river-hydro-station',
  'lst-5': 'chure-range-community-forestry',
  'lst-6': 'upper-karnali-biodigester',
  'lower-bhotekoshi-hydro': 'lst-1',
  'annapurna-buffer-zone-forestry': 'lst-2',
  'pokhara-organic-waste-biogas': 'lst-3',
  'tamor-river-hydro-station': 'lst-4',
  'chure-range-community-forestry': 'lst-5',
  'upper-karnali-biodigester': 'lst-6',
};

// POST /api/buy: Builds atomic transaction partially signed by issuer
app.post('/api/buy', async (req, res) => {
  try {
    const validation = buySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: validation.error.format() });
    }

    const { projectId, projectName, qty, retire, buyerWallet } = validation.data;

    // Load projects and mints
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const mintsPath = path.join(process.cwd(), 'data', 'mints.json');

    if (!fs.existsSync(projectsPath)) {
      return res.status(500).json({ error: 'Projects data not found on server.' });
    }

    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    let mintsData: Record<string, any> = {};
    if (fs.existsSync(mintsPath)) {
      try {
        mintsData = JSON.parse(fs.readFileSync(mintsPath, 'utf-8'));
      } catch (parseErr) {
        mintsData = {};
      }
    }

    // Resolve project via canonical ID, alias, or name
    const canonicalId = PROJECT_ALIASES[projectId] || projectId;
    let project = projects.find((p: any) => 
      p.id === projectId || 
      p.id === canonicalId || 
      p.alias === projectId || 
      p.alias === canonicalId ||
      (projectName && p.name && p.name.toLowerCase() === projectName.toLowerCase())
    );

    if (!project) {
      const numMatch = projectId.match(/(\d+)/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < projects.length) {
          project = projects[idx];
        }
      }
    }

    if (!project) {
      logger.error({ projectId, projectName }, 'Project not found in registry');
      return res.status(404).json({ error: 'Project not found' });
    }

    // Deterministic mint keypair and addresses derived from issuer keypair + canonical project id
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(issuerKeypair.publicKey.toBase58() + ':' + project.id).digest();
    const mintKp = Keypair.fromSeed(hash);
    const mintPubkey = mintKp.publicKey;
    const vaultAtaPubkey = await getAssociatedTokenAddress(mintPubkey, issuerKeypair.publicKey);

    const mintInfo = {
      mint: mintPubkey.toBase58(),
      vaultAta: vaultAtaPubkey.toBase58(),
      supply: project.supply || 100000,
      name: project.name,
      symbol: 'tCO2e',
      decimals: TOKEN_DECIMALS,
    };
    mintsData[project.id] = mintInfo;
    if (project.alias) {
      mintsData[project.alias] = mintInfo;
    }
    mintsData[projectId] = mintInfo;
    try {
      fs.writeFileSync(mintsPath, JSON.stringify(mintsData, null, 2));
    } catch (err) {
      logger.warn({ err }, 'Failed to persist mints.json');
    }

    if (qty > project.supply) {
      return res.status(400).json({ error: `Requested quantity exceeds available supply (${project.supply})` });
    }

    const priceLamportsBigInt = BigInt(project.priceLamports);
    const subtotalLamportsBigInt = BigInt(qty) * priceLamportsBigInt;

    const connection = new Connection(RPC_URL, 'confirmed');
    const buyerPubkey = new PublicKey(buyerWallet);
    const recipientPubkey = new PublicKey(RECIPIENT_ADDRESS);

    // Get buyer ATA for this mint
    const buyerAtaPubkey = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');

    // Build atomic transaction
    const tx = new Transaction({
      feePayer: buyerPubkey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    // Compute unit limit for safe execution
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }));

    // Check if the mint account exists on devnet
    const mintAccount = await connection.getAccountInfo(mintPubkey);
    let isNewMint = false;

    if (!mintAccount) {
      isNewMint = true;
      const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

      // 1. Create mint account
      tx.add(
        SystemProgram.createAccount({
          fromPubkey: buyerPubkey,
          newAccountPubkey: mintPubkey,
          lamports: mintRent,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      // 2. Initialize mint
      tx.add(
        createInitializeMintInstruction(
          mintPubkey,
          TOKEN_DECIMALS,
          issuerKeypair.publicKey,
          null
        )
      );

      // 3. Create Vault ATA for issuer
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          buyerPubkey,
          vaultAtaPubkey,
          issuerKeypair.publicKey,
          mintPubkey
        )
      );

      // 4. Mint initial supply to vault
      tx.add(
        createMintToInstruction(
          mintPubkey,
          vaultAtaPubkey,
          issuerKeypair.publicKey,
          Math.max(project.supply * 2, 100000)
        )
      );
    } else {
      // Check if vault ATA exists on devnet
      const vaultAccount = await connection.getAccountInfo(vaultAtaPubkey);
      if (!vaultAccount) {
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            buyerPubkey,
            vaultAtaPubkey,
            issuerKeypair.publicKey,
            mintPubkey
          )
        );
        tx.add(
          createMintToInstruction(
            mintPubkey,
            vaultAtaPubkey,
            issuerKeypair.publicKey,
            Math.max(project.supply * 2, 100000)
          )
        );
      }
    }

    // 1. SystemProgram.transfer: buyer -> RECIPIENT_ADDRESS
    tx.add(
      SystemProgram.transfer({
        fromPubkey: buyerPubkey,
        toPubkey: recipientPubkey,
        lamports: Number(subtotalLamportsBigInt),
      })
    );

    // 2. createAssociatedTokenAccountIdempotent for buyer ATA
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        buyerPubkey,
        buyerAtaPubkey,
        buyerPubkey,
        mintPubkey
      )
    );

    // 3. transferChecked: vault ATA -> buyer ATA, authority = issuer
    tx.add(
      createTransferCheckedInstruction(
        vaultAtaPubkey,
        mintPubkey,
        buyerAtaPubkey,
        issuerKeypair.publicKey,
        BigInt(qty),
        TOKEN_DECIMALS
      )
    );

    // 4. (only if retire is true) burnChecked from buyer ATA, authority = buyer
    if (retire) {
      tx.add(
        createBurnCheckedInstruction(
          buyerAtaPubkey,
          mintPubkey,
          buyerPubkey,
          BigInt(qty),
          TOKEN_DECIMALS
        )
      );
    }

    // 5. Memo instruction with compact JSON
    const memoPayload = JSON.stringify({
      app: 'himalaya-carbon',
      v: 1,
      project: project.id,
      qty,
      retire,
    });
    tx.add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        keys: [],
        data: Buffer.from(memoPayload),
      })
    );

    // Partially sign: mintKp (if mint created in this tx) + issuerKeypair
    if (isNewMint) {
      tx.partialSign(mintKp, issuerKeypair);
    } else {
      tx.partialSign(issuerKeypair);
    }

    // Serialize transaction to base64
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    logger.info({ projectId, qty, retire, buyer: buyerWallet }, 'Built atomic purchase transaction successfully');

    res.json({
      transaction: serializedTx.toString('base64'),
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  } catch (err: any) {
    logger.error({ err }, 'Error building purchase transaction');
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Setup Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
