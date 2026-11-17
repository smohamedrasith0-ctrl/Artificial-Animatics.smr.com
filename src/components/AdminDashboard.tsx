import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Database,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { isValidEmail } from '../lib/firebase';
import {
  extractVideoMetadataAndThumbnail,
  isFirestoreVideoUrl,
  uploadGalleryVideoToFirestore,
} from '../lib/videoStorage';
import {
  EnquiryStatus,
  PORTFOLIO_CATEGORIES,
  PortfolioCategory,
  PortfolioItem,
  PricingTier,
  ServiceItem,
  TestimonialItem,
} from '../types';
import { BrandLogo } from './BrandLogo';

interface AdminDashboardProps {
  onExitAdmin: () => void;
}

type AdminTab =
  | 'enquiries'
  | 'portfolio'
  | 'services'
  | 'pricing'
  | 'testimonials'
  | 'settings'
  | 'security';

function readImageAsDataUrl(file: File, maxDimension = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      // Keep crisp SVG or small PNG/JPG untouched to preserve exact logo fidelity
      if (file.type === 'image/svg+xml' || result.length <= 360000) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/webp', 0.85);
        resolve(compressed.slice(0, 390000));
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin }) => {
  const {
    brand,
    contact,
    services,
    portfolio,
    pricingTiers,
    testimonials,
    enquiries,
    isFirestoreSeeded,
    user,
    authReady,
    isAdmin,
    adminAccess,
    hasGmailToken,
    signInAdmin,
    switchAdminAccount,
    signOutAdmin,
    connectGmailForSending,
    sendAdminAccessEmails,
    saveAdminAccess,
    saveBrandSettings,
    saveContactSettings,
    saveService,
    removeService,
    savePortfolioItem,
    removePortfolioItem,
    clearSamplePortfolioItems,
    deleteUploadedPortfolioVideo,
    savePricingTier,
    saveTestimonial,
    removeTestimonial,
    updateEnquiryStatus,
    removeEnquiry,
    seedDefaultsInFirestore,
  } = useStudioData();

  const [tab, setTab] = useState<AdminTab>('enquiries');
  const [toast, setToast] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [pendingSelfRevoke, setPendingSelfRevoke] = useState(false);
  const [pendingEmailTargets, setPendingEmailTargets] = useState<
    { email: string; roleLabel: string; isTransfer?: boolean }[] | null
  >(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailModalError, setEmailModalError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ text: string; isWarning: boolean } | null>(null);

  // Access Control local state
  const [primaryEmailDraft, setPrimaryEmailDraft] = useState(adminAccess.primaryEmail);
  const [allowedEmailsDraft, setAllowedEmailsDraft] = useState<string[]>(adminAccess.allowedEmails);
  const [newAllowedEmail, setNewAllowedEmail] = useState('');

  useEffect(() => {
    setPrimaryEmailDraft(adminAccess.primaryEmail);
    setAllowedEmailsDraft(adminAccess.allowedEmails);
  }, [adminAccess]);

  // Brand & Contact local state
  const [brandDraft, setBrandDraft] = useState(brand);
  const [contactDraft, setContactDraft] = useState(contact);

  useEffect(() => {
    setBrandDraft(brand);
  }, [brand]);

  useEffect(() => {
    setContactDraft(contact);
  }, [contact]);

  // Portfolio draft
  const [editingProject, setEditingProject] = useState<PortfolioItem | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadError, setVideoUploadError] = useState('');
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [confirmDeleteVideoForProjectId, setConfirmDeleteVideoForProjectId] = useState<
    string | null
  >(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [confirmClearSamples, setConfirmClearSamples] = useState(false);
  const [clearingSamples, setClearingSamples] = useState(false);
  // Service draft
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  // Pricing draft
  const [editingPricing, setEditingPricing] = useState<PricingTier | null>(null);
  const [pricingFeaturesText, setPricingFeaturesText] = useState('');
  // Testimonial draft
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);
  // Enquiry notes map
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#05070d] text-slate-200 flex items-center justify-center px-6">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Lock className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Verifying security clearance...</span>
        </div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setAuthNotice(null);
    setSigningIn(true);
    try {
      const res = await signInAdmin();
      if (!res.ok) {
        setAuthNotice({
          text: res.error || 'Google sign-in did not complete. Please try again.',
          isWarning: Boolean(res.cancelled),
        });
      }
    } catch (err) {
      setAuthNotice({
        text: err instanceof Error ? err.message : 'Unable to sign in with Google.',
        isWarning: false,
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    if (signingIn) return;
    setAuthNotice(null);
    setSigningIn(true);
    try {
      const res = await switchAdminAccount();
      if (!res.ok) {
        setAuthNotice({
          text: res.error || 'Account switch did not complete. Please try again.',
          isWarning: Boolean(res.cancelled),
        });
      }
    } catch (err) {
      setAuthNotice({
        text: err instanceof Error ? err.message : 'Unable to switch Google account.',
        isWarning: false,
      });
    } finally {
      setSigningIn(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#05070d] text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-[#0b101d] p-8 text-center shadow-[0_0_50px_-15px_rgba(6,182,212,0.2)]">
          <div className="flex justify-center mb-6">
            <BrandLogo size="md" />
          </div>
          <div className="w-12 h-12 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            Restricted Security Gate
          </h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Access to the Artificial Animatics Admin Control Portal is strictly restricted to
            authorized administrator Google accounts.
          </p>
          {authNotice && (
            <p
              className={`mb-4 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                authNotice.isWarning
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {authNotice.text}
            </p>
          )}
          <button
            type="button"
            disabled={signingIn}
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer mb-4"
          >
            <LogIn className="w-4 h-4" />
            <span>{signingIn ? 'Opening Google Sign-In...' : 'Authenticate with Google'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthNotice(null);
              onExitAdmin();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Website</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#05070d] text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-[#0b101d] p-8 text-center shadow-[0_0_50px_-15px_rgba(244,63,94,0.25)]">
          <div className="w-12 h-12 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-xs font-mono text-rose-400 mb-2">403 · ACCESS DENIED</p>
          <h1 className="font-display text-xl font-bold text-white mb-2">
            Unauthorized Google Account
          </h1>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            The account <span className="text-slate-200 font-medium">{user.email}</span> does not
            have security clearance to access the Admin Control Portal. All administrative controls
            and database records remain locked.
          </p>
          {authNotice && (
            <p
              className={`mb-4 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                authNotice.isWarning
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {authNotice.text}
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={signingIn}
              onClick={handleSwitchAccount}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${signingIn ? 'animate-spin' : ''}`} />
              <span>{signingIn ? 'Opening Account Picker...' : 'Switch Google Account'}</span>
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={signingIn}
                onClick={() => {
                  setAuthNotice(null);
                  void signOutAdmin();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-200 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthNotice(null);
                  onExitAdmin();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Return to Site
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSeedDatabase = async () => {
    setBusy(true);
    try {
      await seedDefaultsInFirestore();
      notify('Default catalog initialized in Firestore.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#070a12]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/10 rounded-lg px-3 py-2 bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View Site</span>
            </button>
            <span className="font-display text-sm sm:text-base font-bold text-white truncate">
              Artificial Animatics · Admin Studio
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isFirestoreSeeded && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSeedDatabase}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-cyan-200 border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Sync Defaults to DB</span>
              </button>
            )}
            <span className="hidden md:inline text-xs text-slate-400">{user.email}</span>
            <button
              type="button"
              onClick={signOutAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/10 pb-4">
          {(
            [
              { id: 'enquiries', label: `Enquiries (${enquiries.length})` },
              { id: 'portfolio', label: `Portfolio (${portfolio.length})` },
              { id: 'services', label: `Services (${services.length})` },
              { id: 'pricing', label: `Pricing (${pricingTiers.length})` },
              { id: 'testimonials', label: `Testimonials (${testimonials.length})` },
              { id: 'settings', label: 'Brand & Contact' },
              { id: 'security', label: 'Access Control' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white bg-white/[0.03] border border-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 1. ENQUIRIES TAB */}
        {tab === 'enquiries' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-white">Customer Enquiries</h2>
            {enquiries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b101d] p-10 text-center text-sm text-slate-400">
                No enquiries submitted yet. Submissions from the website contact form appear here in
                real time.
              </div>
            ) : (
              enquiries.map((enq) => {
                const noteVal = notesDraft[enq.id] ?? enq.adminNotes;
                return (
                  <div
                    key={enq.id}
                    className="rounded-2xl border border-white/10 bg-[#0b101d] p-6 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                          <span className="text-cyan-400 font-medium">{enq.serviceRequired}</span>
                          <span aria-hidden="true">·</span>
                          <span>{enq.businessName}</span>
                          {enq.createdAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{enq.createdAt.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-semibold text-white">
                          {enq.name}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Email: {enq.email} · WhatsApp: {enq.whatsapp}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Enquiry status"
                          value={enq.status}
                          onChange={async (e) => {
                            await updateEnquiryStatus(
                              enq.id,
                              e.target.value as EnquiryStatus,
                              noteVal
                            );
                            notify('Enquiry status updated.');
                          }}
                          className="rounded-lg border border-white/15 bg-[#060913] px-3 py-2 text-xs text-white"
                        >
                          <option value="new">New</option>
                          <option value="in_review">In Review</option>
                          <option value="replied">Replied</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            await removeEnquiry(enq.id);
                            notify('Enquiry deleted.');
                          }}
                          className="p-2 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          aria-label="Delete enquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed bg-[#060913] border border-white/5 rounded-xl p-4">
                      {enq.projectDescription}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={noteVal}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({ ...prev, [enq.id]: e.target.value }))
                        }
                        placeholder="Internal admin notes..."
                        className="flex-1 rounded-lg border border-white/10 bg-[#060913] px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await updateEnquiryStatus(enq.id, enq.status, noteVal);
                          notify('Admin notes saved.');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. PORTFOLIO TAB */}
        {tab === 'portfolio' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-xl font-bold text-white">Portfolio Videos</h2>
              <div className="flex flex-wrap items-center gap-2.5">
                {portfolio.some((p) => p.isPlaceholder) &&
                  (confirmClearSamples ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs">
                      <span className="text-rose-200">Delete all sample videos permanently?</span>
                      <button
                        type="button"
                        disabled={clearingSamples}
                        onClick={async () => {
                          setClearingSamples(true);
                          try {
                            await clearSamplePortfolioItems();
                            setEditingProject((prev) => (prev?.isPlaceholder ? null : prev));
                            setConfirmClearSamples(false);
                            notify('All sample portfolio videos permanently deleted.');
                          } finally {
                            setClearingSamples(false);
                          }
                        }}
                        className="font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                      >
                        {clearingSamples ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        disabled={clearingSamples}
                        onClick={() => setConfirmClearSamples(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearSamples(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-rose-300 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete All Sample Videos</span>
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() => {
                    setVideoUploadProgress(null);
                    setVideoUploadError('');
                    setConfirmClearSamples(false);
                    setEditingProject({
                      id: `project-${Date.now()}`,
                      title: '',
                      category: 'Advertisements',
                      description: '',
                      thumbnailUrl:
                        '/src/assets/images/portfolio_ad_chronograph_1794897005289.jpg',
                      videoUrl: '',
                      duration: '0:45',
                      clientName: '',
                      isPlaceholder: false,
                      order: portfolio.length + 1,
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Video Project</span>
                </button>
              </div>
            </div>

            {editingProject && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (videoUploadProgress !== null) return;
                  await savePortfolioItem(editingProject);
                  setEditingProject(null);
                  setVideoUploadError('');
                  notify('Portfolio project saved to Firestore.');
                }}
                className="rounded-2xl border border-cyan-400/30 bg-[#0b101d] p-6 space-y-4"
              >
                <h3 className="font-display text-base font-semibold text-white">
                  Edit Portfolio Project
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Project Title"
                    value={editingProject.title}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, title: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <select
                    value={editingProject.category}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        category: e.target.value as PortfolioCategory,
                      })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  >
                    {PORTFOLIO_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Duration (e.g. 0:45)"
                      value={editingProject.duration}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, duration: e.target.value })
                      }
                      className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Client Name"
                      value={editingProject.clientName}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, clientName: e.target.value })
                      }
                      className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                {/* Video Source: Upload from Gallery OR Paste Video URL */}
                <div className="rounded-xl border border-white/10 bg-[#060913]/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-200">
                      Video Source (Upload from Gallery or Paste URL)
                    </p>
                    <span className="text-[11px] text-slate-400">
                      MP4, WebM, MOV supported (up to 20 MB gallery upload)
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    {isFirestoreVideoUrl(editingProject.videoUrl) ? (
                      <div className="flex-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
                        <span className="flex items-center gap-2 min-w-0">
                          <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate">Gallery video uploaded &amp; attached</span>
                        </span>
                        <button
                          type="button"
                          disabled={deletingVideoId === editingProject.id}
                          onClick={async () => {
                            const urlToDelete = editingProject.videoUrl;
                            setVideoUploadError('');
                            setDeletingVideoId(editingProject.id);
                            try {
                              await deleteUploadedPortfolioVideo(editingProject.id, urlToDelete);
                              setEditingProject((prev) =>
                                prev ? { ...prev, videoUrl: '' } : prev
                              );
                              notify('Uploaded gallery video deleted.');
                            } catch (err) {
                              setVideoUploadError(
                                err instanceof Error
                                  ? err.message
                                  : 'Unable to delete uploaded video.'
                              );
                            } finally {
                              setDeletingVideoId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 disabled:opacity-60 font-medium shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>
                            {deletingVideoId === editingProject.id
                              ? 'Deleting...'
                              : 'Delete Uploaded Video'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <input
                        type="url"
                        placeholder="Video URL (YouTube, Vimeo, or direct MP4 URL)"
                        value={editingProject.videoUrl}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, videoUrl: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                      />
                    )}

                    <label
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-semibold text-cyan-200 shrink-0 ${
                        videoUploadProgress !== null || deletingVideoId !== null
                          ? 'opacity-60 pointer-events-none'
                          : 'cursor-pointer'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>
                        {videoUploadProgress !== null
                          ? `Uploading ${videoUploadProgress}%`
                          : 'Upload Video from Gallery'}
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        className="hidden"
                        disabled={videoUploadProgress !== null || deletingVideoId !== null}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          setVideoUploadError('');
                          setVideoUploadProgress(1);
                          const previousUrl = editingProject.videoUrl;
                          try {
                            const { durationLabel, thumbnailDataUrl } =
                              await extractVideoMetadataAndThumbnail(file);
                            const uploadedUri = await uploadGalleryVideoToFirestore(
                              file,
                              (pct) => setVideoUploadProgress(pct)
                            );
                            // Clean up an unsaved temporary gallery video if replacing mid-edit
                            const savedProject = portfolio.find((p) => p.id === editingProject.id);
                            if (
                              isFirestoreVideoUrl(previousUrl) &&
                              (!savedProject || savedProject.videoUrl !== previousUrl)
                            ) {
                              void deleteUploadedPortfolioVideo(null, previousUrl);
                            }
                            setEditingProject((prev) => {
                              if (!prev) return prev;
                              const isDefaultThumb =
                                !prev.thumbnailUrl ||
                                prev.thumbnailUrl.startsWith('/src/assets/images/portfolio_');
                              return {
                                ...prev,
                                videoUrl: uploadedUri,
                                duration: durationLabel || prev.duration,
                                thumbnailUrl:
                                  thumbnailDataUrl && isDefaultThumb
                                    ? thumbnailDataUrl
                                    : prev.thumbnailUrl,
                                isPlaceholder: false,
                              };
                            });
                            notify('Gallery video uploaded. Click Save Project to publish.');
                          } catch (err) {
                            setVideoUploadError(
                              err instanceof Error
                                ? err.message
                                : 'Failed to upload video from gallery.'
                            );
                          } finally {
                            setVideoUploadProgress(null);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {videoUploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-200"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-cyan-300">
                        Uploading gallery video ({videoUploadProgress}%)...
                      </p>
                    </div>
                  )}

                  {videoUploadError && (
                    <p className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                      {videoUploadError}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    required
                    placeholder="Thumbnail Image URL"
                    value={editingProject.thumbnailUrl}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, thumbnailUrl: e.target.value })
                    }
                    className="flex-1 w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-white cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Thumbnail</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readImageAsDataUrl(file, 1000);
                        setEditingProject({ ...editingProject, thumbnailUrl: dataUrl });
                      }}
                    />
                  </label>
                </div>

                <textarea
                  required
                  rows={3}
                  placeholder="Project Description (min 10 chars)"
                  value={editingProject.description}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />

                <div className="flex items-center justify-between pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProject.isPlaceholder}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          isPlaceholder: e.target.checked,
                        })
                      }
                    />
                    <span>Mark as placeholder sample</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const saved = portfolio.find((p) => p.id === editingProject.id);
                        if (
                          isFirestoreVideoUrl(editingProject.videoUrl) &&
                          (!saved || saved.videoUrl !== editingProject.videoUrl)
                        ) {
                          void deleteUploadedPortfolioVideo(null, editingProject.videoUrl);
                        }
                        setEditingProject(null);
                        setVideoUploadProgress(null);
                        setVideoUploadError('');
                      }}
                      className="px-4 py-2 rounded-lg text-xs text-slate-300 border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={videoUploadProgress !== null}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white cursor-pointer"
                    >
                      Save Project
                    </button>
                  </div>
                </div>
              </form>
            )}

            {portfolio.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b101d] p-10 text-center text-sm text-slate-400">
                No portfolio videos published on the website. Click &ldquo;Add Video Project&rdquo;
                above to upload a video from your gallery or link an external video.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#0b101d] overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="p-4">
                        <p className="text-xs text-cyan-400 mb-1">
                          {item.category} · {item.duration}
                          {isFirestoreVideoUrl(item.videoUrl)
                            ? ' · Uploaded Video'
                            : item.videoUrl
                              ? ' · Linked Video'
                              : item.isPlaceholder
                                ? ' · Sample Preview'
                                : ''}
                        </p>
                        <h3 className="font-display text-base font-semibold text-white mb-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3 border-t border-white/10 space-y-2.5">
                      {confirmDeleteVideoForProjectId === item.id ? (
                        <div className="flex items-center justify-between gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2">
                          <span className="text-amber-200">Clear uploaded video file only?</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={deletingVideoId === item.id}
                              onClick={async () => {
                                setDeletingVideoId(item.id);
                                try {
                                  await deleteUploadedPortfolioVideo(item.id, item.videoUrl);
                                  if (editingProject?.id === item.id) {
                                    setEditingProject((prev) =>
                                      prev ? { ...prev, videoUrl: '' } : prev
                                    );
                                  }
                                  notify('Uploaded video file removed.');
                                } finally {
                                  setDeletingVideoId(null);
                                  setConfirmDeleteVideoForProjectId(null);
                                }
                              }}
                              className="font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                            >
                              {deletingVideoId === item.id ? 'Removing...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVideoForProjectId(null)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : confirmDeleteProjectId === item.id ? (
                        <div className="flex items-center justify-between gap-2 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-2.5 py-2">
                          <span className="text-rose-200">Delete permanently from website?</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                await removePortfolioItem(item.id);
                                if (editingProject?.id === item.id) {
                                  setEditingProject(null);
                                }
                                setConfirmDeleteProjectId(null);
                                notify('Portfolio video permanently deleted from website.');
                              }}
                              className="font-semibold text-rose-300 hover:text-rose-200 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProjectId(null)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setVideoUploadProgress(null);
                              setVideoUploadError('');
                              setConfirmDeleteVideoForProjectId(null);
                              setConfirmDeleteProjectId(null);
                              setEditingProject(item);
                            }}
                            className="text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
                          >
                            Edit
                          </button>
                          <div className="flex items-center gap-3">
                            {isFirestoreVideoUrl(item.videoUrl) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteProjectId(null);
                                  setConfirmDeleteVideoForProjectId(item.id);
                                }}
                                className="text-xs text-amber-300 hover:text-amber-200 cursor-pointer"
                              >
                                Clear File
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteVideoForProjectId(null);
                                setConfirmDeleteProjectId(item.id);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SERVICES TAB */}
        {tab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Services Catalog</h2>
              <button
                type="button"
                onClick={() =>
                  setEditingService({
                    id: `service-${Date.now()}`,
                    title: '',
                    description: '',
                    iconName: 'Clapperboard',
                    order: services.length + 1,
                    featured: false,
                    active: true,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </button>
            </div>

            {editingService && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveService(editingService);
                  setEditingService(null);
                  notify('Service saved.');
                }}
                className="rounded-2xl border border-cyan-400/30 bg-[#0b101d] p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Service Title"
                    value={editingService.title}
                    onChange={(e) =>
                      setEditingService({ ...editingService, title: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <select
                    value={editingService.iconName}
                    onChange={(e) =>
                      setEditingService({ ...editingService, iconName: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  >
                    {[
                      'Clapperboard',
                      'Box',
                      'Building2',
                      'Film',
                      'Layers',
                      'Smartphone',
                      'Briefcase',
                      'Wand2',
                    ].map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Order"
                    value={editingService.order}
                    onChange={(e) =>
                      setEditingService({ ...editingService, order: Number(e.target.value) })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="Service Description"
                  value={editingService.description}
                  onChange={(e) =>
                    setEditingService({ ...editingService, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingService.active}
                      onChange={(e) =>
                        setEditingService({ ...editingService, active: e.target.checked })
                      }
                    />
                    <span>Visible on website</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingService(null)}
                      className="px-4 py-2 rounded-lg text-xs text-slate-300 border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white cursor-pointer"
                    >
                      Save Service
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="rounded-xl border border-white/10 bg-[#0b101d] p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-mono text-cyan-400 mb-1">
                      Order {srv.order} · {srv.active ? 'Active' : 'Hidden'}
                    </p>
                    <h3 className="font-display text-base font-semibold text-white mb-1">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-slate-400">{srv.description}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingService(srv)}
                      className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeService(srv.id);
                        notify('Service deleted.');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. PRICING TAB */}
        {tab === 'pricing' && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-white">Pricing Tiers</h2>

            {editingPricing && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const features = pricingFeaturesText
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                  await savePricingTier({ ...editingPricing, features });
                  setEditingPricing(null);
                  notify('Pricing tier saved.');
                }}
                className="rounded-2xl border border-cyan-400/30 bg-[#0b101d] p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={editingPricing.name}
                    onChange={(e) =>
                      setEditingPricing({ ...editingPricing, name: e.target.value })
                    }
                    placeholder="Tier Name"
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    required
                    value={editingPricing.priceLabel}
                    onChange={(e) =>
                      setEditingPricing({ ...editingPricing, priceLabel: e.target.value })
                    }
                    placeholder="Price Display (e.g. Contact for Pricing)"
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={editingPricing.summary}
                  onChange={(e) =>
                    setEditingPricing({ ...editingPricing, summary: e.target.value })
                  }
                  placeholder="Summary"
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Deliverables (one per line, max 10)
                  </label>
                  <textarea
                    rows={5}
                    value={pricingFeaturesText}
                    onChange={(e) => setPricingFeaturesText(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPricing(null)}
                    className="px-4 py-2 rounded-lg text-xs text-slate-300 border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white cursor-pointer"
                  >
                    Save Tier
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="rounded-2xl border border-white/10 bg-[#0b101d] p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold text-white mb-1">{tier.name}</h3>
                    <p className="text-xl font-semibold text-cyan-300 mb-2">{tier.priceLabel}</p>
                    <p className="text-xs text-slate-400 mb-4">{tier.summary}</p>
                    <ul className="space-y-1.5 text-xs text-slate-300 mb-6">
                      {tier.features.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPricing(tier);
                      setPricingFeaturesText(tier.features.join('\n'));
                    }}
                    className="w-full py-2 rounded-lg text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    Edit Tier
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. TESTIMONIALS TAB */}
        {tab === 'testimonials' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Client Testimonials</h2>
              <button
                type="button"
                onClick={() =>
                  setEditingTestimonial({
                    id: `testimonial-${Date.now()}`,
                    customerName: '',
                    role: '',
                    company: '',
                    quote: '',
                    rating: 5,
                    photoUrl: '',
                    isSample: false,
                    order: testimonials.length + 1,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Testimonial</span>
              </button>
            </div>

            {editingTestimonial && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveTestimonial(editingTestimonial);
                  setEditingTestimonial(null);
                  notify('Testimonial saved.');
                }}
                className="rounded-2xl border border-cyan-400/30 bg-[#0b101d] p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Customer Name"
                    value={editingTestimonial.customerName}
                    onChange={(e) =>
                      setEditingTestimonial({
                        ...editingTestimonial,
                        customerName: e.target.value,
                      })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Role / Title"
                    value={editingTestimonial.role}
                    onChange={(e) =>
                      setEditingTestimonial({ ...editingTestimonial, role: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Company"
                    value={editingTestimonial.company}
                    onChange={(e) =>
                      setEditingTestimonial({ ...editingTestimonial, company: e.target.value })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editingTestimonial.rating}
                    onChange={(e) =>
                      setEditingTestimonial({
                        ...editingTestimonial,
                        rating: Number(e.target.value),
                      })
                    }
                    className="rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    placeholder="Customer Photo URL (optional)"
                    value={editingTestimonial.photoUrl}
                    onChange={(e) =>
                      setEditingTestimonial({ ...editingTestimonial, photoUrl: e.target.value })
                    }
                    className="flex-1 w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 text-xs text-white cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readImageAsDataUrl(file, 400);
                        setEditingTestimonial({ ...editingTestimonial, photoUrl: dataUrl });
                      }}
                    />
                  </label>
                </div>

                <textarea
                  required
                  rows={3}
                  placeholder="Client Feedback Quote"
                  value={editingTestimonial.quote}
                  onChange={(e) =>
                    setEditingTestimonial({ ...editingTestimonial, quote: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />

                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTestimonial.isSample}
                      onChange={(e) =>
                        setEditingTestimonial({
                          ...editingTestimonial,
                          isSample: e.target.checked,
                        })
                      }
                    />
                    <span>Show "Sample Review" label</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTestimonial(null)}
                      className="px-4 py-2 rounded-lg text-xs text-slate-300 border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white cursor-pointer"
                    >
                      Save Testimonial
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-[#0b101d] p-5 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs text-orange-400 mb-2">
                      {'★'.repeat(t.rating)} {t.isSample ? '· Sample' : ''}
                    </p>
                    <p className="text-xs text-slate-300 mb-4">"{t.quote}"</p>
                    <p className="text-sm font-semibold text-white">{t.customerName}</p>
                    <p className="text-xs text-slate-400">
                      {t.role} · {t.company}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/10 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setEditingTestimonial(t)}
                      className="text-xs text-cyan-300 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeTestimonial(t.id);
                        notify('Testimonial deleted.');
                      }}
                      className="text-xs text-rose-400 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. BRAND & CONTACT SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveBrandSettings(brandDraft);
                notify('Brand settings & official logo updated.');
              }}
              className="rounded-2xl border border-white/10 bg-[#0b101d] p-6 space-y-5"
            >
              <h2 className="font-display text-lg font-bold text-white">
                Brand Identity & Official Logo
              </h2>

              <div className="rounded-xl border border-white/10 bg-[#060913] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-2">Active Brand Logo Preview</p>
                  {brandDraft.logoUrl ? (
                    <img
                      src={brandDraft.logoUrl}
                      alt="Official Artificial Animatics Logo"
                      className="h-12 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">
                      Using default vector lockup — upload official logo file below
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/15 text-xs font-semibold text-cyan-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readImageAsDataUrl(file, 900);
                        setBrandDraft({ ...brandDraft, logoUrl: dataUrl });
                      }}
                    />
                  </label>
                  {brandDraft.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBrandDraft({ ...brandDraft, logoUrl: '' })}
                      className="px-3 py-2 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Logo Image URL</label>
                <input
                  type="text"
                  value={brandDraft.logoUrl}
                  onChange={(e) => setBrandDraft({ ...brandDraft, logoUrl: e.target.value })}
                  placeholder="https://... or upload PNG/SVG above"
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Company Name</label>
                <input
                  type="text"
                  required
                  value={brandDraft.companyName}
                  onChange={(e) => setBrandDraft({ ...brandDraft, companyName: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">About Headline</label>
                <input
                  type="text"
                  required
                  value={brandDraft.aboutHeadline}
                  onChange={(e) =>
                    setBrandDraft({ ...brandDraft, aboutHeadline: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">About Description</label>
                <textarea
                  rows={4}
                  required
                  value={brandDraft.aboutDescription}
                  onChange={(e) =>
                    setBrandDraft({ ...brandDraft, aboutDescription: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Brand Settings</span>
              </button>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveContactSettings(contactDraft);
                notify('Contact links saved.');
              }}
              className="rounded-2xl border border-white/10 bg-[#0b101d] p-6 space-y-5 h-fit"
            >
              <h2 className="font-display text-lg font-bold text-white">Studio Contact Channels</h2>
              <p className="text-xs text-slate-400">
                Leave fields empty to keep placeholder state, or enter your official studio
                channels to activate direct WhatsApp, Instagram, and Email buttons.
              </p>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  WhatsApp Number (with country code)
                </label>
                <input
                  type="text"
                  value={contactDraft.whatsappNumber}
                  onChange={(e) =>
                    setContactDraft({ ...contactDraft, whatsappNumber: e.target.value })
                  }
                  placeholder="+1 555 0100"
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Instagram Profile URL</label>
                <input
                  type="url"
                  value={contactDraft.instagramUrl}
                  onChange={(e) =>
                    setContactDraft({ ...contactDraft, instagramUrl: e.target.value })
                  }
                  placeholder="https://instagram.com/artificialanimatics"
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Business Contact Email
                </label>
                <input
                  type="email"
                  value={contactDraft.contactEmail}
                  onChange={(e) =>
                    setContactDraft({ ...contactDraft, contactEmail: e.target.value })
                  }
                  placeholder="studio@yourdomain.com"
                  className="w-full rounded-lg border border-white/10 bg-[#060913] px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Contact Channels</span>
              </button>
            </form>
          </div>
        )}

        {/* 7. ACCESS CONTROL & SECURITY TAB */}
        {tab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6 h-fit">
              <div className="rounded-2xl border border-emerald-500/25 bg-[#0b101d] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">Security System</h2>
                    <p className="text-xs text-emerald-300">Server-Enforced Firestore RBAC Active</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#060913] p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Active Session</span>
                    <span className="text-white font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Email Verification</span>
                    <span className="text-emerald-400 font-medium">
                      {user.emailVerified ? 'Verified Google Account' : 'Unverified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Primary Admin Account</span>
                    <span className="text-cyan-300 font-medium">{adminAccess.primaryEmail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Public Portal Visibility</span>
                    <span className="text-slate-200 font-medium">Hidden (Authorized Only)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Any Google account not listed in the Primary Admin or Authorized Allowlist is
                  blocked at both the portal UI and the Firestore database rules layer. You can
                  transfer primary ownership or grant/revoke access for other Google accounts on the
                  right.
                </p>
              </div>

              {/* Gmail Access Dispatch Card */}
              <div className="rounded-2xl border border-cyan-500/25 bg-[#0b101d] p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        Portal Email Dispatch (Gmail)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Send direct Admin Control Portal links to authorized admins.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#060913] px-4 py-3 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400">Gmail Send Authorization</span>
                  {hasGmailToken ? (
                    <span className="text-emerald-400 font-semibold">Connected & Ready</span>
                  ) : (
                    <span className="text-amber-300 font-medium">Sign-In Required</span>
                  )}
                </div>

                {!hasGmailToken && (
                  <button
                    type="button"
                    onClick={async () => {
                      setSecurityError('');
                      try {
                        await connectGmailForSending();
                        notify('Google Gmail send permission connected.');
                      } catch (err) {
                        setSecurityError(
                          err instanceof Error ? err.message : 'Unable to authorize Gmail.'
                        );
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>Authorize Gmail Sending</span>
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalError('');
                      setPendingEmailTargets([
                        {
                          email: adminAccess.primaryEmail,
                          roleLabel: 'Primary Owner',
                          isTransfer: false,
                        },
                      ]);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-cyan-200 border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Email Primary Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalError('');
                      const uniqueTargets = Array.from(
                        new Set([adminAccess.primaryEmail, ...adminAccess.allowedEmails])
                      ).map((em) => ({
                        email: em,
                        roleLabel:
                          em === adminAccess.primaryEmail
                            ? 'Primary Owner'
                            : 'Authorized Administrator',
                        isTransfer: false,
                      }));
                      setPendingEmailTargets(uniqueTargets);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Email All Admins ({adminAccess.allowedEmails.length})</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Emails include a private access button to open the Admin Control Portal without
                  displaying the portal URL. When you change the Primary Admin email or add a new
                  account, you will be prompted to send the access email automatically.
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSecurityError('');
                const nextPrimary = primaryEmailDraft.trim().toLowerCase();
                if (!isValidEmail(nextPrimary)) {
                  setSecurityError('Please enter a valid Primary Admin Google email address.');
                  return;
                }
                const currentUserEmail = user.email?.toLowerCase() || '';
                const nextList = Array.from(
                  new Set([
                    nextPrimary,
                    ...allowedEmailsDraft.map((em) => em.trim().toLowerCase()).filter(isValidEmail),
                  ])
                );

                // Compute newly assigned/changed admin recipients
                const newlyChangedTargets: {
                  email: string;
                  roleLabel: string;
                  isTransfer?: boolean;
                }[] = [];

                if (nextPrimary !== adminAccess.primaryEmail) {
                  newlyChangedTargets.push({
                    email: nextPrimary,
                    roleLabel: 'Primary Owner',
                    isTransfer: true,
                  });
                }

                for (const em of nextList) {
                  if (em !== nextPrimary && !adminAccess.allowedEmails.includes(em)) {
                    newlyChangedTargets.push({
                      email: em,
                      roleLabel: 'Authorized Administrator',
                      isTransfer: false,
                    });
                  }
                }

                if (
                  currentUserEmail &&
                  currentUserEmail !== nextPrimary &&
                  !nextList.includes(currentUserEmail) &&
                  !pendingSelfRevoke
                ) {
                  setPendingSelfRevoke(true);
                  return;
                }

                try {
                  setPendingSelfRevoke(false);
                  await saveAdminAccess({
                    primaryEmail: nextPrimary,
                    allowedEmails: nextList,
                  });
                  notify('Admin security allowlist updated and enforced.');
                  if (newlyChangedTargets.length > 0) {
                    setEmailModalError('');
                    setPendingEmailTargets(newlyChangedTargets);
                  }
                } catch (err) {
                  setSecurityError(
                    err instanceof Error ? err.message : 'Unable to update access control.'
                  );
                }
              }}
              className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#0b101d] p-6 space-y-6 h-fit"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-white mb-1">
                  Authorized Google Accounts
                </h2>
                <p className="text-xs text-slate-400">
                  Change which Google account owns the Admin Control Portal or authorize additional
                  team Google accounts (maximum 15).
                </p>
              </div>

              <div>
                <label
                  htmlFor="primary-admin-email"
                  className="block text-xs font-medium text-slate-300 mb-2"
                >
                  Primary Admin Google Account (Owner)
                </label>
                <input
                  id="primary-admin-email"
                  type="email"
                  required
                  value={primaryEmailDraft}
                  onChange={(e) => setPrimaryEmailDraft(e.target.value)}
                  placeholder="owner@gmail.com"
                  className="w-full rounded-xl border border-white/15 bg-[#060913] px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Changing this transfers primary ownership to the new Google email once saved and
                  prompts sending the portal link to the new owner.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Authorized Admin Allowlist ({allowedEmailsDraft.length} / 15)
                </label>

                <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
                  <input
                    type="email"
                    value={newAllowedEmail}
                    onChange={(e) => setNewAllowedEmail(e.target.value)}
                    placeholder="Add Google email (e.g. director@gmail.com)"
                    className="flex-1 rounded-xl border border-white/10 bg-[#060913] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSecurityError('');
                      const candidate = newAllowedEmail.trim().toLowerCase();
                      if (!isValidEmail(candidate)) {
                        setSecurityError('Enter a valid Google email address to authorize.');
                        return;
                      }
                      if (allowedEmailsDraft.length >= 15) {
                        setSecurityError('Maximum of 15 authorized admin accounts reached.');
                        return;
                      }
                      if (!allowedEmailsDraft.includes(candidate)) {
                        setAllowedEmailsDraft((prev) => [...prev, candidate]);
                      }
                      setNewAllowedEmail('');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white border border-cyan-400/40 bg-cyan-500/15 hover:bg-cyan-500/25 cursor-pointer shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Account</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {allowedEmailsDraft.map((emailItem) => {
                    const isPrimary = emailItem === primaryEmailDraft.trim().toLowerCase();
                    const isSavedInDb =
                      emailItem === adminAccess.primaryEmail ||
                      adminAccess.allowedEmails.includes(emailItem);
                    return (
                      <div
                        key={emailItem}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#060913] px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{emailItem}</p>
                          <p className="text-[11px] text-slate-400">
                            {isPrimary ? 'Primary Owner' : 'Authorized Administrator'}
                            {!isSavedInDb && ' · Unsaved change'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSavedInDb && (
                            <button
                              type="button"
                              onClick={() => {
                                setEmailModalError('');
                                setPendingEmailTargets([
                                  {
                                    email: emailItem,
                                    roleLabel: isPrimary
                                      ? 'Primary Owner'
                                      : 'Authorized Administrator',
                                    isTransfer: false,
                                  },
                                ]);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/10 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send Link</span>
                            </button>
                          )}
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() =>
                                setAllowedEmailsDraft((prev) => prev.filter((em) => em !== emailItem))
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-300 border border-rose-500/25 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {pendingSelfRevoke && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Confirm transfer: Saving this change removes your current account (
                    <span className="font-semibold">{user.email}</span>) from the admin allowlist
                    and immediately revokes your access. To ensure the new admin receives the portal
                    link before your access closes, send the Gmail notification first and transfer:
                  </p>
                  <div className="rounded-lg border border-amber-400/20 bg-[#060913]/80 px-3 py-2 text-[11px] text-slate-300">
                    <p>
                      <span className="text-slate-400">New Primary Recipient:</span>{' '}
                      <span className="text-cyan-300 font-medium">
                        {primaryEmailDraft.trim().toLowerCase()}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Subject:</span> Artificial Animatics —
                      Primary Admin Control Access Transferred to You
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={sendingEmails}
                      onClick={async () => {
                        setSecurityError('');
                        setSendingEmails(true);
                        try {
                          const nextPrimary = primaryEmailDraft.trim().toLowerCase();
                          const nextList = Array.from(
                            new Set([
                              nextPrimary,
                              ...allowedEmailsDraft
                                .map((em) => em.trim().toLowerCase())
                                .filter(isValidEmail),
                            ])
                          );
                          const targets = nextList.map((em) => ({
                            email: em,
                            roleLabel:
                              em === nextPrimary ? 'Primary Owner' : 'Authorized Administrator',
                            isTransfer: em === nextPrimary,
                          }));
                          const result = await sendAdminAccessEmails(targets);
                          if (result.failed.length > 0) {
                            setSecurityError(
                              `Email failed for ${result.failed[0].email}: ${result.failed[0].error}`
                            );
                            return;
                          }
                          setPendingSelfRevoke(false);
                          await saveAdminAccess({
                            primaryEmail: nextPrimary,
                            allowedEmails: nextList,
                          });
                        } catch (err) {
                          setSecurityError(
                            err instanceof Error
                              ? err.message
                              : 'Unable to send access email and transfer.'
                          );
                        } finally {
                          setSendingEmails(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {sendingEmails
                          ? 'Sending Email & Transferring...'
                          : 'Send Access Email & Transfer Ownership'}
                      </span>
                    </button>
                    <button
                      type="submit"
                      disabled={sendingEmails}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium text-amber-200 border border-amber-400/35 hover:bg-amber-500/15 cursor-pointer"
                    >
                      Transfer Without Email
                    </button>
                    <button
                      type="button"
                      disabled={sendingEmails}
                      onClick={() => setPendingSelfRevoke(false)}
                      className="px-3.5 py-2 rounded-lg text-xs text-slate-300 border border-white/15 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {securityError && (
                <p className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5">
                  {securityError}
                </p>
              )}

              {!pendingSelfRevoke && (
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 text-white cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Security Access Rules</span>
                </button>
              )}
            </form>
          </div>
        )}
      </main>

      {/* Explicit Gmail Dispatch Confirmation Modal */}
      {pendingEmailTargets && pendingEmailTargets.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gmail-confirm-title"
        >
          <div className="max-w-lg w-full rounded-2xl border border-cyan-500/30 bg-[#0b101d] p-6 shadow-[0_0_60px_-15px_rgba(6,182,212,0.35)] space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="gmail-confirm-title" className="font-display text-lg font-bold text-white">
                    Confirm Admin Access Email
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review recipients and portal link before sending via Gmail.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={sendingEmails}
                onClick={() => {
                  setPendingEmailTargets(null);
                  setEmailModalError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close email confirmation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#060913] p-4 space-y-3 text-xs">
              <div>
                <p className="text-slate-400 mb-1.5">Recipients ({pendingEmailTargets.length})</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {pendingEmailTargets.map((target) => (
                    <div
                      key={target.email}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 border border-white/5"
                    >
                      <span className="text-white font-medium truncate">{target.email}</span>
                      <span className="text-[11px] text-cyan-300 shrink-0">
                        {target.roleLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-slate-400 mb-0.5">Subject</p>
                <p className="text-slate-200 font-medium">
                  {pendingEmailTargets.some((t) => t.isTransfer)
                    ? 'Artificial Animatics — Primary Admin Control Access Transferred to You'
                    : 'Artificial Animatics — Admin Control Portal Access Link'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 mb-0.5">Access Method</p>
                <p className="text-cyan-300 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Private &ldquo;Open Admin Control Portal&rdquo; button (URL hidden)</span>
                </p>
              </div>
            </div>

            {!hasGmailToken && (
              <p className="text-xs text-amber-200 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 leading-relaxed">
                Clicking Send below will open Google sign-in to grant Gmail send permission (
                <span className="font-mono">gmail.send</span>) and immediately dispatch the email.
              </p>
            )}

            {emailModalError && (
              <p className="text-xs text-rose-300 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5">
                {emailModalError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={sendingEmails}
                onClick={() => {
                  setPendingEmailTargets(null);
                  setEmailModalError('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/15 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingEmails}
                onClick={async () => {
                  setEmailModalError('');
                  setSendingEmails(true);
                  try {
                    const result = await sendAdminAccessEmails(pendingEmailTargets);
                    if (result.failed.length > 0 && result.sent.length === 0) {
                      setEmailModalError(
                        `Failed to send to ${result.failed[0].email}: ${result.failed[0].error}`
                      );
                      return;
                    }
                    if (result.failed.length > 0) {
                      notify(
                        `Sent to ${result.sent.join(', ')}. Failed: ${result.failed
                          .map((f) => f.email)
                          .join(', ')}`
                      );
                    } else {
                      notify(`Admin portal access email sent to ${result.sent.join(', ')}.`);
                    }
                    setPendingEmailTargets(null);
                  } catch (err) {
                    setEmailModalError(
                      err instanceof Error ? err.message : 'Unable to send Gmail notification.'
                    );
                  } finally {
                    setSendingEmails(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:brightness-110 text-white disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {sendingEmails
                    ? 'Sending via Gmail...'
                    : hasGmailToken
                      ? 'Confirm & Send Email'
                      : 'Authorize Google & Send Email'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
