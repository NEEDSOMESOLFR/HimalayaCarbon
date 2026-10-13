import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { BentoGrid } from './components/BentoGrid';
import { Footer } from './components/Footer';
import { BackgroundEffect } from './components/BackgroundEffect';
import { BuyModal } from './components/BuyModal';
import { RegisterModal } from './components/RegisterModal';
import { WalletModal } from './components/WalletModal';
import { ProjectsView } from './components/ProjectsView';
import { VerifyView } from './components/VerifyView';
import { DocsView } from './components/DocsView';
import { ProjectGalleryModal } from './components/ProjectGalleryModal';
import { MyPurchasesModal } from './components/MyPurchasesModal';
import {
  INITIAL_LISTINGS,
  INITIAL_QUEUE,
  PROVINCES_DATA,
} from './data/mockData';
import {
  ProjectListing,
  VerificationQueueItem,
  ProvinceStat,
  CategoryType,
  WalletState,
  RetirementCertificate,
} from './types';
import { X, CheckCircle, Info } from 'lucide-react';
import { getSolanaProvider, fetchSolBalance } from './lib/phantom';
import { fetchLiveSolPrice } from './lib/solPrice';
import { REGISTRATION_OPEN } from './config';
import { RegistrationNoticeModal } from './components/RegistrationNoticeModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'Marketplace' | 'Projects' | 'Verify' | 'Docs'>('Marketplace');

  // Live Solana Price State (USD)
  const [solUsdRate, setSolUsdRate] = useState<number>(148.5);
  const [solPriceSource, setSolPriceSource] = useState<string>('Coinbase');

  // Core Data State
  const [listings, setListings] = useState<ProjectListing[]>(INITIAL_LISTINGS);
  const [queueItems, setQueueItems] = useState<VerificationQueueItem[]>(INITIAL_QUEUE);
  const [totalIssued, setTotalIssued] = useState<number>(184620);
  const [retired, setRetired] = useState<number>(61200);
  const [available, setAvailable] = useState<number>(123420);
  const [verifiedCount, setVerifiedCount] = useState<number>(37);

  // Filters & Selection
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<VerificationQueueItem | null>(null);

  // Modals
  const [activeBuyListing, setActiveBuyListing] = useState<ProjectListing | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [targetProjectForModal, setTargetProjectForModal] = useState<ProjectListing | null>(null);
  const [galleryProject, setGalleryProject] = useState<ProjectListing | null>(null);
  const [isPurchasesModalOpen, setIsPurchasesModalOpen] = useState<boolean>(false);

  const handleHeroViewProject = (listing: ProjectListing) => {
    setTargetProjectForModal(listing);
    setActiveTab('Projects');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gated project registration trigger
  const handleRegisterTrigger = () => {
    if (REGISTRATION_OPEN) {
      setIsRegisterModalOpen(true);
    } else {
      setIsNoticeModalOpen(true);
    }
  };

  // Wallet State
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    solBalance: 0,
    usdcBalance: 0,
    walletType: undefined,
  });

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Fetch real-time live Solana price from free public APIs (Coinbase/CoinGecko/Binance)
  useEffect(() => {
    let isMounted = true;
    const updatePrice = async () => {
      try {
        const data = await fetchLiveSolPrice();
        if (isMounted && data.price > 0) {
          setSolUsdRate(data.price);
          setSolPriceSource(data.source);
        }
      } catch (err) {
        console.warn('Failed to refresh live SOL price:', err);
      }
    };

    updatePrice();
    const interval = setInterval(updatePrice, 60000); // refresh every 60 seconds
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real Solana wallet auto-detection & event listeners
  useEffect(() => {
    const provider = getSolanaProvider();
    if (!provider) return;

    // Try eager connect if trusted
    provider
      .connect?.({ onlyIfTrusted: true })
      ?.then(async (resp: any) => {
        const address = resp?.publicKey?.toBase58 ? resp.publicKey.toBase58() : provider.publicKey?.toBase58();
        if (address) {
          const solBalance = await fetchSolBalance(address);
          setWallet({
            connected: true,
            address,
            solBalance,
            usdcBalance: 0,
            walletType: provider.isPhantom ? 'phantom' : 'solflare',
          });
        }
      })
      ?.catch(() => {
        // Not yet trusted, user will connect manually
      });

    const handleConnect = async (pubkey: any) => {
      const address = pubkey?.toBase58 ? pubkey.toBase58() : pubkey?.toString();
      if (address) {
        const solBalance = await fetchSolBalance(address);
        setWallet({
          connected: true,
          address,
          solBalance,
          usdcBalance: 0,
          walletType: provider.isPhantom ? 'phantom' : 'solflare',
        });
      }
    };

    const handleDisconnect = () => {
      setWallet({
        connected: false,
        address: null,
        solBalance: 0,
        usdcBalance: 0,
        walletType: undefined,
      });
    };

    const handleAccountChanged = async (pubkey: any) => {
      if (pubkey) {
        const address = pubkey.toBase58 ? pubkey.toBase58() : pubkey.toString();
        const solBalance = await fetchSolBalance(address);
        setWallet((prev) => ({
          ...prev,
          connected: true,
          address,
          solBalance,
        }));
        showToast(`Wallet account changed to ${address.slice(0, 4)}...${address.slice(-4)}`);
      } else {
        handleDisconnect();
      }
    };

    provider.on?.('connect', handleConnect);
    provider.on?.('disconnect', handleDisconnect);
    provider.on?.('accountChanged', handleAccountChanged);

    return () => {
      provider.removeListener?.('connect', handleConnect);
      provider.removeListener?.('disconnect', handleDisconnect);
      provider.removeListener?.('accountChanged', handleAccountChanged);
    };
  }, [showToast]);

  // Periodic wallet balance refresh every 20 seconds
  useEffect(() => {
    if (!wallet.connected || !wallet.address) return;
    const interval = setInterval(async () => {
      try {
        const solBalance = await fetchSolBalance(wallet.address!);
        setWallet((prev) => (prev.connected && prev.address === wallet.address ? { ...prev, solBalance } : prev));
      } catch (err) {
        console.error('[wallet] 20s balance refresh failed:', err);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address]);

  // Connect real Solana wallet (Phantom or Solflare)
  const handleConnectWallet = async () => {
    const provider = getSolanaProvider();
    if (!provider) {
      setIsWalletModalOpen(true);
      return;
    }

    try {
      const resp = await provider.connect();
      const address = resp?.publicKey?.toBase58 ? resp.publicKey.toBase58() : provider.publicKey?.toBase58();
      if (!address) {
        throw new Error('No public key returned by wallet.');
      }
      const solBalance = await fetchSolBalance(address);
      setWallet({
        connected: true,
        address,
        solBalance,
        usdcBalance: 0,
        walletType: provider.isPhantom ? 'phantom' : 'solflare',
      });
      showToast(`Connected: ${address.slice(0, 4)}...${address.slice(-4)} (Devnet)`);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.toLowerCase().includes('user rejected')) {
        showToast('Connection rejected by user in wallet.');
      } else {
        showToast(err?.message || 'Failed to connect wallet');
      }
      throw err;
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = async () => {
    const provider = getSolanaProvider();
    if (provider) {
      try {
        await provider.disconnect?.();
      } catch (err) {
        console.warn('Disconnect error:', err);
      }
    }
    setWallet({
      connected: false,
      address: null,
      solBalance: 0,
      usdcBalance: 0,
      walletType: undefined,
    });
    showToast('Wallet disconnected');
  };

  // Refresh live Devnet balance
  const handleRefreshBalance = async () => {
    if (wallet.address) {
      const solBalance = await fetchSolBalance(wallet.address);
      setWallet((prev) => ({ ...prev, solBalance }));
      showToast(`Devnet balance updated: ${solBalance} SOL`);
    }
  };

  // Handle successful purchase
  const handlePurchaseSuccess = ({
    listing,
    amount,
    retired: isRetired,
    certificate,
  }: {
    listing: ProjectListing;
    amount: number;
    retired: boolean;
    certificate?: RetirementCertificate;
  }) => {
    // Update live counts
    setAvailable((prev) => Math.max(0, prev - amount));
    if (isRetired) {
      setRetired((prev) => prev + amount);
    }

    // Update listing available amount
    setListings((prevListings) =>
      prevListings.map((l) =>
        l.id === listing.id
          ? { ...l, availableAmount: Math.max(0, l.availableAmount - amount) }
          : l
      )
    );

    if (isRetired && certificate) {
      showToast(
        `Retired ${amount} tCO2e on Solana! Certificate ID: ${certificate.certificateId}`
      );
    } else {
      showToast(`Transferred ${amount} tCO2e SPL tokens to wallet.`);
    }

    // Refresh SOL balance after real transaction confirmation
    if (wallet.address) {
      handleRefreshBalance();
    }
  };

  // Handle project submission
  const handleRegisterProject = (newItem: VerificationQueueItem) => {
    setQueueItems((prev) => [newItem, ...prev]);
    showToast(`"${newItem.name}" queued for verification.`);
  };

  // Filter listings & queue if category or province is selected
  const displayedListings = listings.filter((l) => {
    if (selectedCategory && l.category !== selectedCategory) return false;
    if (selectedProvince && l.province !== selectedProvince) return false;
    return true;
  });

  const displayedQueue = queueItems.filter((q) => {
    if (selectedCategory && q.category !== selectedCategory) return false;
    if (selectedProvince && q.location !== selectedProvince) return false;
    return true;
  });

  const handleProvinceSelect = (prov: ProvinceStat) => {
    if (selectedProvince === prov.name) {
      setSelectedProvince(null);
    } else {
      setSelectedProvince(prov.name);
      showToast(`Filtered by ${prov.name} Province (${prov.projectCount} projects)`);
    }
  };

  const handleScrollToBrowse = () => {
    const el = document.getElementById('marketplace-listings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('Marketplace');
    }
  };

  // Specular pointer highlight tracker (throttled)
  const lastMoveRef = useRef<number>(0);
  const handlePointerMove = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastMoveRef.current < 40) return; // ~25fps throttle
    lastMoveRef.current = now;
    const x = Math.round((e.clientX / window.innerWidth) * 100);
    const y = Math.round((e.clientY / window.innerHeight) * 100);
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div
      onMouseMove={handlePointerMove}
      className="min-h-screen flex flex-col relative text-[var(--ink)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Background Refraction Layer (Orbs + Mountains + Noise) */}
      <BackgroundEffect />

      {/* HEADER */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wallet={wallet}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenPurchasesModal={() => setIsPurchasesModalOpen(true)}
        solUsdRate={solUsdRate}
      />

      {/* TOAST ALERT */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[250] flex items-center gap-3 px-4 py-3 rounded-full bg-[var(--paper)] border border-[var(--line)] text-[13px] font-medium text-[var(--ink)] animate-fade-in shadow-lg">
          <CheckCircle className="w-4 h-4 text-[#3E5531] shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="w-6 h-6 rounded-[6px] border border-[var(--line-strong)] bg-transparent flex items-center justify-center p-0 text-[var(--ink)] hover:bg-[var(--forest-tint)] cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ACTIVE FILTER BAR */}
      {activeTab === 'Marketplace' && (selectedCategory || selectedProvince) && (
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-[var(--paper)] px-5 py-2.5 rounded-full flex items-center justify-between text-[13px] border border-[var(--line)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--forest)]">
                Active Filter:
              </span>
              {selectedCategory && (
                <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-[var(--forest-tint)] text-[var(--forest)] border border-[var(--line)]">
                  Category: {selectedCategory.toUpperCase()}
                </span>
              )}
              {selectedProvince && (
                <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-[var(--forest-tint)] text-[var(--forest)] border border-[var(--line)]">
                  Province: {selectedProvince}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedProvince(null);
              }}
              className="text-[12px] font-medium underline cursor-pointer text-[var(--forest)] hover:text-[var(--forest-hover)]"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* MAIN VIEW SWITCHER */}
      <main className="flex-1">
        {activeTab === 'Marketplace' && (
          <>
            {/* HERO STRIP */}
            <Hero
              onRegisterClick={handleRegisterTrigger}
              onBrowseClick={handleScrollToBrowse}
              listings={listings}
              onViewProject={handleHeroViewProject}
              solUsdRate={solUsdRate}
            />

            {/* BENTO GRID */}
            <div id="marketplace-listings">
              <BentoGrid
                totalIssued={totalIssued}
                retired={retired}
                available={available}
                verifiedCount={verifiedCount}
                listings={displayedListings}
                queueItems={displayedQueue}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedProvince={selectedProvince}
                onSelectProvince={handleProvinceSelect}
                onBuyClick={(listing) => setActiveBuyListing(listing)}
                onOpenGallery={(listing) => setGalleryProject(listing)}
                onSelectQueueItem={(item) => setSelectedQueueItem(item)}
                solUsdRate={solUsdRate}
                walletConnected={wallet.connected}
              />
            </div>
          </>
        )}

        {activeTab === 'Projects' && (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8">
            <ProjectsView
              listings={listings}
              onBuyClick={(listing) => setActiveBuyListing(listing)}
              onRegisterClick={handleRegisterTrigger}
              onOpenGallery={(listing) => setGalleryProject(listing)}
              solUsdRate={solUsdRate}
              initialSelectedProject={targetProjectForModal}
            />
          </div>
        )}

        {activeTab === 'Verify' && (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8">
            <VerifyView queueItems={queueItems} />
          </div>
        )}

        {activeTab === 'Docs' && (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8">
            <DocsView />
          </div>
        )}
      </main>

      {/* FOOTER */}
      <Footer />

      {/* BUY MODAL */}
      {activeBuyListing && (
        <BuyModal
          listing={activeBuyListing}
          onClose={() => setActiveBuyListing(null)}
          onSuccess={handlePurchaseSuccess}
          walletConnected={wallet.connected}
          walletAddress={wallet.address}
          walletBalance={wallet.solBalance}
          onConnectWallet={() => {
            setIsWalletModalOpen(true);
          }}
          solUsdRate={solUsdRate}
        />
      )}

      {/* REGISTRATION NOTICE MODAL (active when REGISTRATION_OPEN is false) */}
      {isNoticeModalOpen && (
        <RegistrationNoticeModal
          onClose={() => setIsNoticeModalOpen(false)}
        />
      )}

      {/* ORIGINAL REGISTER FORM MODAL (retained unchanged, active when REGISTRATION_OPEN is true) */}
      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSubmit={handleRegisterProject}
        />
      )}

      {/* WALLET MODAL */}
      {isWalletModalOpen && (
        <WalletModal
          wallet={wallet}
          onClose={() => setIsWalletModalOpen(false)}
          onConnectWallet={handleConnectWallet}
          onDisconnect={handleDisconnectWallet}
          onRefreshBalance={handleRefreshBalance}
        />
      )}

      {/* QUEUE ITEM DETAIL MODAL */}
      {selectedQueueItem && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-150 motion-reduce:transition-none"
          style={{ backgroundColor: 'rgba(23, 36, 29, 0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedQueueItem(null);
          }}
        >
          <div className="w-full max-w-[460px] rounded-[20px] p-6 sm:p-7 relative bg-[var(--paper)] border border-[var(--line-strong)]">
            <button
              onClick={() => setSelectedQueueItem(null)}
              className="w-8 h-8 rounded-[10px] border border-[var(--line-strong)] bg-transparent flex items-center justify-center cursor-pointer text-[var(--ink)] hover:bg-[var(--bg)] absolute top-5 right-5"
              aria-label="Close audit file"
            >
              <X className="w-4 h-4 text-[var(--ink)]" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{
                  backgroundColor:
                    selectedQueueItem.status === 'Verified' ? '#3E5531' : '#8A5327',
                }}
              />
              <span className="text-[12px] font-semibold tracking-wide uppercase text-[var(--ink)]">
                Project Audit File
              </span>
            </div>

            <h3 className="font-fraunces text-[22px] font-medium text-[var(--ink)]">
              {selectedQueueItem.name}
            </h3>

            <div className="mt-4 p-4 rounded-[14px] text-[13px] space-y-2.5 bg-[var(--bg)] border border-[var(--line)]">
              <div className="flex justify-between">
                <span className="text-[var(--ink)]">Province:</span>
                <span className="font-medium text-[var(--ink)]">{selectedQueueItem.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink)]">Capacity:</span>
                <span className="font-medium text-[var(--ink)]">{selectedQueueItem.sizeOrCapacity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--ink)]">Audit Status:</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor:
                      selectedQueueItem.status === 'Verified' ? 'var(--moss-tint)' : 'var(--clay-tint)',
                    color:
                      selectedQueueItem.status === 'Verified' ? '#3E5531' : '#8A5327',
                  }}
                >
                  {selectedQueueItem.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink)]">Standard:</span>
                <span className="font-medium text-[var(--ink)]">{selectedQueueItem.methodology}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink)]">Submitted:</span>
                <span className="text-[var(--ink)]">{selectedQueueItem.submittedDate}</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedQueueItem(null)}
                className="w-full h-[40px] rounded-[10px] border border-[var(--line-strong)] bg-transparent text-[13.5px] font-medium text-[var(--ink)] hover:bg-[var(--forest-tint)] cursor-pointer"
              >
                Close Audit File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT SITE IMAGE GALLERY MODAL (WITH GRID & LIGHTBOX) */}
      {galleryProject && (
        <ProjectGalleryModal
          listing={galleryProject}
          onClose={() => setGalleryProject(null)}
          onBuyClick={(listing) => {
            setGalleryProject(null);
            setActiveBuyListing(listing);
          }}
        />
      )}

      {/* MY PURCHASES MODAL */}
      {isPurchasesModalOpen && (
        <MyPurchasesModal
          walletAddress={wallet.address}
          onClose={() => setIsPurchasesModalOpen(false)}
        />
      )}
    </div>
  );
}
