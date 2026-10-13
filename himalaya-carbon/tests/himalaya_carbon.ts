import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HimalayaCarbon } from "../target/types/himalaya_carbon";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("himalaya_carbon", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HimalayaCarbon as Program<HimalayaCarbon>;

  const authority = provider.wallet as anchor.Wallet;
  const verifier = Keypair.generate();
  const owner = Keypair.generate();
  const buyer = Keypair.generate();
  const rogueUser = Keypair.generate();

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    program.programId
  );

  before(async () => {
    // Airdrop SOL to test signers
    const airdropSigners = [verifier, owner, buyer, rogueUser];
    for (const signer of airdropSigners) {
      const sig = await provider.connection.requestAirdrop(
        signer.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: sig,
        ...latestBlockhash,
      });
    }
  });

  it("1. Initializes Registry", async () => {
    await program.methods
      .initializeRegistry(verifier.publicKey)
      .accounts({
        registry: registryPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.registry.fetch(registryPda);
    expect(registry.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(registry.verifier.toBase58()).to.equal(verifier.publicKey.toBase58());
    expect(registry.projectCount.toNumber()).to.equal(0);
  });

  let projectId = new anchor.BN(0);
  let projectPda: PublicKey;
  let mintPda: PublicKey;
  let vaultPda: PublicKey;
  const priceLamports = new anchor.BN(0.05 * LAMPORTS_PER_SOL);
  const requestedCapacity = new anchor.BN(1000);
  const dummyHash = new Array(32).fill(7);

  it("2. Registers Project (Happy Path)", async () => {
    const reg = await program.account.registry.fetch(registryPda);
    projectId = reg.projectCount;

    [projectPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("project"), projectId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), projectPda.toBuffer()],
      program.programId
    );

    // Vault token account
    const vaultKeypair = Keypair.generate();
    vaultPda = vaultKeypair.publicKey;

    await program.methods
      .registerProject(
        "Lower Bhotekoshi Hydro",
        0, // Hydropower
        2, // Bagmati
        "https://api.himalayacarbon.np/metadata/bhotekoshi.json",
        dummyHash,
        requestedCapacity,
        priceLamports
      )
      .accounts({
        registry: registryPda,
        project: projectPda,
        creditMint: mintPda,
        vault: vaultPda,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([owner, vaultKeypair])
      .rpc();

    const project = await program.account.project.fetch(projectPda);
    expect(project.id.toNumber()).to.equal(0);
    expect(project.name).to.equal("Lower Bhotekoshi Hydro");
    expect(project.status).to.equal(0); // Pending
    expect(project.requestedCapacity.toNumber()).to.equal(1000);
    expect(project.verifiedCapacity.toNumber()).to.equal(0);
    expect(project.creditsMinted.toNumber()).to.equal(0);
    expect(project.creditsRetired.toNumber()).to.equal(0);
    expect(project.owner.toBase58()).to.equal(owner.publicKey.toBase58());
  });

  it("3. FAILS: Non-verifier attempts to verify project", async () => {
    try {
      await program.methods
        .verifyProject(new anchor.BN(800))
        .accounts({
          registry: registryPda,
          project: projectPda,
          verifier: rogueUser.publicKey,
        })
        .signers([rogueUser])
        .rpc();
      expect.fail("Should have thrown Unauthorized error");
    } catch (err: any) {
      expect(err.toString()).to.include("Unauthorized");
    }
  });

  it("4. FAILS: Mint credits before verification", async () => {
    try {
      await program.methods
        .mintCredits(new anchor.BN(100))
        .accounts({
          project: projectPda,
          creditMint: mintPda,
          vault: vaultPda,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      expect.fail("Should have failed because status is Pending");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidStatus");
    }
  });

  it("5. Verifier verifies project (Happy Path)", async () => {
    const verifiedCapacity = new anchor.BN(800);
    await program.methods
      .verifyProject(verifiedCapacity)
      .accounts({
        registry: registryPda,
        project: projectPda,
        verifier: verifier.publicKey,
      })
      .signers([verifier])
      .rpc();

    const project = await program.account.project.fetch(projectPda);
    expect(project.status).to.equal(1); // Verified
    expect(project.verifiedCapacity.toNumber()).to.equal(800);
    expect(project.verifiedAt.toNumber()).to.be.greaterThan(0);
  });

  it("6. FAILS: Double verify already verified project", async () => {
    try {
      await program.methods
        .verifyProject(new anchor.BN(800))
        .accounts({
          registry: registryPda,
          project: projectPda,
          verifier: verifier.publicKey,
        })
        .signers([verifier])
        .rpc();
      expect.fail("Should have failed double verify");
    } catch (err: any) {
      expect(err.toString()).to.include("InvalidStatus");
    }
  });

  it("7. FAILS: Mint over verified capacity", async () => {
    try {
      await program.methods
        .mintCredits(new anchor.BN(801)) // Capacity is 800
        .accounts({
          project: projectPda,
          creditMint: mintPda,
          vault: vaultPda,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();
      expect.fail("Should have failed with CapacityExceeded");
    } catch (err: any) {
      expect(err.toString()).to.include("CapacityExceeded");
    }
  });

  it("8. Owner mints credits (Happy Path)", async () => {
    const mintAmount = new anchor.BN(500);
    await program.methods
      .mintCredits(mintAmount)
      .accounts({
        project: projectPda,
        creditMint: mintPda,
        vault: vaultPda,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();

    const project = await program.account.project.fetch(projectPda);
    expect(project.creditsMinted.toNumber()).to.equal(500);

    const vaultAccount = await getAccount(provider.connection, vaultPda);
    expect(Number(vaultAccount.amount)).to.equal(500);
  });

  let buyerAta: PublicKey;

  it("9. FAILS: Owner attempts to buy own credits", async () => {
    const ownerAta = getAssociatedTokenAddressSync(mintPda, owner.publicKey);

    // Create ATA for owner if needed
    try {
      const tx = new anchor.web3.Transaction().add(
        createAssociatedTokenAccountInstruction(
          owner.publicKey,
          ownerAta,
          owner.publicKey,
          mintPda
        )
      );
      await provider.sendAndConfirm(tx, [owner]);
    } catch {}

    try {
      await program.methods
        .buyCredits(new anchor.BN(10))
        .accounts({
          project: projectPda,
          vault: vaultPda,
          owner: owner.publicKey,
          buyerTokenAccount: ownerAta,
          buyer: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
      expect.fail("Should not allow owner to buy own credits");
    } catch (err: any) {
      expect(err.toString()).to.include("CannotBuyOwnCredits");
    }
  });

  it("10. FAILS: Buyer buys more than vault inventory", async () => {
    buyerAta = getAssociatedTokenAddressSync(mintPda, buyer.publicKey);
    const createAtaTx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        buyer.publicKey,
        buyerAta,
        buyer.publicKey,
        mintPda
      )
    );
    await provider.sendAndConfirm(createAtaTx, [buyer]);

    try {
      await program.methods
        .buyCredits(new anchor.BN(501)) // Vault only has 500
        .accounts({
          project: projectPda,
          vault: vaultPda,
          owner: owner.publicKey,
          buyerTokenAccount: buyerAta,
          buyer: buyer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should fail with InsufficientCredits");
    } catch (err: any) {
      expect(err.toString()).to.include("InsufficientCredits");
    }
  });

  it("11. Buyer buys credits (Happy Path)", async () => {
    const buyAmount = new anchor.BN(100);
    const ownerInitialBal = await provider.connection.getBalance(owner.publicKey);

    await program.methods
      .buyCredits(buyAmount)
      .accounts({
        project: projectPda,
        vault: vaultPda,
        owner: owner.publicKey,
        buyerTokenAccount: buyerAta,
        buyer: buyer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const vaultAccount = await getAccount(provider.connection, vaultPda);
    expect(Number(vaultAccount.amount)).to.equal(400);

    const buyerAccount = await getAccount(provider.connection, buyerAta);
    expect(Number(buyerAccount.amount)).to.equal(100);

    const ownerAfterBal = await provider.connection.getBalance(owner.publicKey);
    const expectedPayment = 100 * priceLamports.toNumber();
    expect(ownerAfterBal - ownerInitialBal).to.equal(expectedPayment);
  });

  it("12. FAILS: Retire more than balance", async () => {
    const [retPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("retirement"),
        projectPda.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .retireCredits(
          new anchor.BN(101), // Balance is only 100
          "Kathmandu Eco Foundation",
          "Scope 1 & 2 carbon offset for FY2024"
        )
        .accounts({
          project: projectPda,
          creditMint: mintPda,
          holderTokenAccount: buyerAta,
          retirement: retPda,
          retirer: buyer.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      expect.fail("Should fail retiring more than balance");
    } catch (err: any) {
      expect(err.toString()).to.include("InsufficientCredits");
    }
  });

  it("13. Retires credits and issues proof-of-offset (Happy Path)", async () => {
    const [retPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("retirement"),
        projectPda.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const retireAmount = new anchor.BN(40);
    await program.methods
      .retireCredits(
        retireAmount,
        "Kathmandu Eco Foundation",
        "Scope 1 & 2 carbon offset for FY2024"
      )
      .accounts({
        project: projectPda,
        creditMint: mintPda,
        holderTokenAccount: buyerAta,
        retirement: retPda,
        retirer: buyer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const buyerAccount = await getAccount(provider.connection, buyerAta);
    expect(Number(buyerAccount.amount)).to.equal(60);

    const project = await program.account.project.fetch(projectPda);
    expect(project.creditsRetired.toNumber()).to.equal(40);
    expect(project.retirementCount.toNumber()).to.equal(1);

    const retirement = await program.account.retirement.fetch(retPda);
    expect(retirement.amount.toNumber()).to.equal(40);
    expect(retirement.beneficiary).to.equal("Kathmandu Eco Foundation");
    expect(retirement.reason).to.equal("Scope 1 & 2 carbon offset for FY2024");
    expect(retirement.index.toNumber()).to.equal(0);
    expect(retirement.retirer.toBase58()).to.equal(buyer.publicKey.toBase58());
  });

  it("14. FAILS: Oversized strings validation", async () => {
    const oversizedName = "A".repeat(50); // Max is 48
    const tempVault = Keypair.generate();

    try {
      const reg = await program.account.registry.fetch(registryPda);
      const [tempProject] = PublicKey.findProgramAddressSync(
        [Buffer.from("project"), reg.projectCount.toArrayLike(Buffer, "le", 8)],
        program.programId
      );
      const [tempMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), tempProject.toBuffer()],
        program.programId
      );

      await program.methods
        .registerProject(
          oversizedName,
          0,
          0,
          "https://valid.uri",
          dummyHash,
          new anchor.BN(100),
          new anchor.BN(1000)
        )
        .accounts({
          registry: registryPda,
          project: tempProject,
          creditMint: tempMint,
          vault: tempVault.publicKey,
          owner: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([owner, tempVault])
        .rpc();
      expect.fail("Should have failed due to oversized name");
    } catch (err: any) {
      expect(err.toString()).to.include("StringTooLong");
    }
  });
});
