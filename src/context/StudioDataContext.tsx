import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_BRAND_SETTINGS,
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_PORTFOLIO,
  DEFAULT_PRICING_TIERS,
  DEFAULT_SERVICES,
  DEFAULT_TESTIMONIALS,
} from '../data/defaults';
import {
  AuthAttemptResult,
  OperationType,
  auth,
  clampText,
  db,
  googleProvider,
  handleFirestoreError,
  interpretFirebaseAuthError,
  isValidEmail,
  sanitizeId,
} from '../lib/firebase';
import {
  acquireGmailAccessToken,
  getGmailAccessToken,
  sendAdminPortalAccessEmail,
  setGmailAccessToken,
} from '../lib/gmail';
import { deleteFirestoreVideo, isFirestoreVideoUrl } from '../lib/videoStorage';
import {
  AdminAccessConfig,
  BrandSettings,
  ContactSettings,
  EnquiryItem,
  EnquiryStatus,
  PortfolioItem,
  PricingTier,
  ServiceItem,
  TestimonialItem,
} from '../types';

const BOOTSTRAP_ADMIN_EMAIL = 'smohamedrasith0@gmail.com';

interface StudioDataContextValue {
  brand: BrandSettings;
  contact: ContactSettings;
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  pricingTiers: PricingTier[];
  testimonials: TestimonialItem[];
  enquiries: EnquiryItem[];
  isFirestoreSeeded: boolean;
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminAccess: AdminAccessConfig;
  hasGmailToken: boolean;
  signInAdmin: () => Promise<AuthAttemptResult>;
  switchAdminAccount: () => Promise<AuthAttemptResult>;
  signOutAdmin: () => Promise<void>;
  connectGmailForSending: () => Promise<string>;
  sendAdminAccessEmails: (
    targets: { email: string; roleLabel: string; isTransfer?: boolean }[]
  ) => Promise<{ sent: string[]; failed: { email: string; error: string }[] }>;
  saveAdminAccess: (next: { primaryEmail: string; allowedEmails: string[] }) => Promise<void>;
  submitEnquiry: (payload: {
    name: string;
    businessName: string;
    email: string;
    whatsapp: string;
    serviceRequired: string;
    projectDescription: string;
  }) => Promise<void>;
  saveBrandSettings: (next: BrandSettings) => Promise<void>;
  saveContactSettings: (next: ContactSettings) => Promise<void>;
  saveService: (item: ServiceItem) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  savePortfolioItem: (item: PortfolioItem) => Promise<void>;
  removePortfolioItem: (id: string) => Promise<void>;
  clearSamplePortfolioItems: () => Promise<void>;
  deleteUploadedPortfolioVideo: (projectId: string | null, videoUrl: string) => Promise<void>;
  savePricingTier: (tier: PricingTier) => Promise<void>;
  saveTestimonial: (item: TestimonialItem) => Promise<void>;
  removeTestimonial: (id: string) => Promise<void>;
  updateEnquiryStatus: (id: string, status: EnquiryStatus, adminNotes: string) => Promise<void>;
  removeEnquiry: (id: string) => Promise<void>;
  seedDefaultsInFirestore: () => Promise<void>;
}

interface CatalogState {
  portfolioInitialized: boolean;
  servicesInitialized: boolean;
  pricingInitialized: boolean;
  testimonialsInitialized: boolean;
}

const DEFAULT_CATALOG_STATE: CatalogState = {
  portfolioInitialized: false,
  servicesInitialized: false,
  pricingInitialized: false,
  testimonialsInitialized: false,
};

const StudioDataContext = createContext<StudioDataContextValue | null>(null);

export const StudioDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [contact, setContact] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [rawServices, setRawServices] = useState<ServiceItem[] | null>(null);
  const [rawPortfolio, setRawPortfolio] = useState<PortfolioItem[] | null>(null);
  const [rawPricingTiers, setRawPricingTiers] = useState<PricingTier[] | null>(null);
  const [rawTestimonials, setRawTestimonials] = useState<TestimonialItem[] | null>(null);
  const [catalogState, setCatalogState] = useState<CatalogState>(DEFAULT_CATALOG_STATE);
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [hasStoredServices, setHasStoredServices] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasGmailToken, setHasGmailToken] = useState(false);
  const [adminAccess, setAdminAccess] = useState<AdminAccessConfig>({
    primaryEmail: BOOTSTRAP_ADMIN_EMAIL,
    allowedEmails: [BOOTSTRAP_ADMIN_EMAIL],
    updatedBy: BOOTSTRAP_ADMIN_EMAIL,
  });

  const services = useMemo(() => {
    if (rawServices === null) return DEFAULT_SERVICES;
    if (rawServices.length > 0) return rawServices;
    return catalogState.servicesInitialized ? [] : DEFAULT_SERVICES;
  }, [rawServices, catalogState.servicesInitialized]);

  const portfolio = useMemo(() => {
    if (rawPortfolio === null) return DEFAULT_PORTFOLIO;
    if (rawPortfolio.length > 0) return rawPortfolio;
    return catalogState.portfolioInitialized ? [] : DEFAULT_PORTFOLIO;
  }, [rawPortfolio, catalogState.portfolioInitialized]);

  const pricingTiers = useMemo(() => {
    if (rawPricingTiers === null) return DEFAULT_PRICING_TIERS;
    if (rawPricingTiers.length > 0) return rawPricingTiers;
    return catalogState.pricingInitialized ? [] : DEFAULT_PRICING_TIERS;
  }, [rawPricingTiers, catalogState.pricingInitialized]);

  const testimonials = useMemo(() => {
    if (rawTestimonials === null) return DEFAULT_TESTIMONIALS;
    if (rawTestimonials.length > 0) return rawTestimonials;
    return catalogState.testimonialsInitialized ? [] : DEFAULT_TESTIMONIALS;
  }, [rawTestimonials, catalogState.testimonialsInitialized]);

  // Monitor Firebase Authentication and verify server-enforced admin clearance
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser || !currentUser.emailVerified || !currentUser.email) {
        setGmailAccessToken(null);
        setHasGmailToken(false);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      const normalizedEmail = currentUser.email.toLowerCase();

      try {
        // Server rules allow this read ONLY if isAdmin() passes
        const accessSnap = await getDoc(doc(db, 'security', 'adminAccess'));
        if (accessSnap.exists()) {
          const data = accessSnap.data();
          setAdminAccess({
            primaryEmail: String(data.primaryEmail || BOOTSTRAP_ADMIN_EMAIL).toLowerCase(),
            allowedEmails: Array.isArray(data.allowedEmails)
              ? data.allowedEmails.map((e: unknown) => String(e).toLowerCase())
              : [BOOTSTRAP_ADMIN_EMAIL],
            updatedBy: String(data.updatedBy || normalizedEmail),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          });
          setIsAdmin(true);
        } else {
          // Before security/adminAccess doc is initialized, only bootstrap email passes server get()
          setAdminAccess({
            primaryEmail: BOOTSTRAP_ADMIN_EMAIL,
            allowedEmails: [BOOTSTRAP_ADMIN_EMAIL],
            updatedBy: BOOTSTRAP_ADMIN_EMAIL,
          });
          setIsAdmin(normalizedEmail === BOOTSTRAP_ADMIN_EMAIL);
        }
      } catch {
        // Unauthorized user rejected cleanly by Firestore security rules
        try {
          const legacyAdminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdmin(legacyAdminDoc.exists());
        } catch {
          setIsAdmin(false);
        }
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Public Firestore real-time listeners (with clean default fallbacks when collections are empty)
  useEffect(() => {
    const unsubBrand = onSnapshot(
      doc(db, 'siteSettings', 'brand'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setBrand({
            companyName: data.companyName || DEFAULT_BRAND_SETTINGS.companyName,
            tagline: data.tagline || DEFAULT_BRAND_SETTINGS.tagline,
            logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : '',
            aboutHeadline: data.aboutHeadline || DEFAULT_BRAND_SETTINGS.aboutHeadline,
            aboutDescription: data.aboutDescription || DEFAULT_BRAND_SETTINGS.aboutDescription,
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'siteSettings/brand')
    );

    const unsubContact = onSnapshot(
      doc(db, 'siteSettings', 'contact'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setContact({
            whatsappNumber: typeof data.whatsappNumber === 'string' ? data.whatsappNumber : '',
            instagramUrl: typeof data.instagramUrl === 'string' ? data.instagramUrl : '',
            contactEmail: typeof data.contactEmail === 'string' ? data.contactEmail : '',
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'siteSettings/contact')
    );

    const unsubCatalog = onSnapshot(
      doc(db, 'siteSettings', 'catalog'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCatalogState({
            portfolioInitialized: Boolean(data.portfolioInitialized),
            servicesInitialized: Boolean(data.servicesInitialized),
            pricingInitialized: Boolean(data.pricingInitialized),
            testimonialsInitialized: Boolean(data.testimonialsInitialized),
          });
        } else {
          setCatalogState(DEFAULT_CATALOG_STATE);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'siteSettings/catalog')
    );

    const unsubServices = onSnapshot(
      query(collection(db, 'services'), orderBy('order', 'asc')),
      (snap) => {
        setHasStoredServices(!snap.empty);
        setRawServices(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title,
              description: data.description,
              iconName: data.iconName || 'Clapperboard',
              order: typeof data.order === 'number' ? data.order : 0,
              featured: Boolean(data.featured),
              active: data.active !== false,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'services')
    );

    const unsubPortfolio = onSnapshot(
      query(collection(db, 'portfolio'), orderBy('order', 'asc')),
      (snap) => {
        setRawPortfolio(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title,
              category: data.category,
              description: data.description,
              thumbnailUrl: data.thumbnailUrl,
              videoUrl: data.videoUrl || '',
              duration: data.duration || '0:45',
              clientName: data.clientName || '',
              isPlaceholder: Boolean(data.isPlaceholder),
              order: typeof data.order === 'number' ? data.order : 0,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'portfolio')
    );

    const unsubPricing = onSnapshot(
      query(collection(db, 'pricingTiers'), orderBy('order', 'asc')),
      (snap) => {
        setRawPricingTiers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              priceLabel: data.priceLabel || 'Contact for Pricing',
              summary: data.summary,
              features: Array.isArray(data.features) ? data.features : [],
              highlighted: Boolean(data.highlighted),
              order: typeof data.order === 'number' ? data.order : 0,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'pricingTiers')
    );

    const unsubTestimonials = onSnapshot(
      query(collection(db, 'testimonials'), orderBy('order', 'asc')),
      (snap) => {
        setRawTestimonials(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              customerName: data.customerName,
              role: data.role,
              company: data.company,
              quote: data.quote,
              rating: typeof data.rating === 'number' ? data.rating : 5,
              photoUrl: data.photoUrl || '',
              isSample: Boolean(data.isSample),
              order: typeof data.order === 'number' ? data.order : 0,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'testimonials')
    );

    return () => {
      unsubBrand();
      unsubContact();
      unsubCatalog();
      unsubServices();
      unsubPortfolio();
      unsubPricing();
      unsubTestimonials();
    };
  }, []);

  // Admin-only enquiries listener (only attaches when verified admin is logged in)
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setEnquiries([]);
      return;
    }

    const unsubEnquiries = onSnapshot(
      query(collection(db, 'enquiries'), orderBy('createdAt', 'desc')),
      (snap) => {
        setEnquiries(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name,
              businessName: data.businessName,
              email: data.email,
              whatsapp: data.whatsapp,
              serviceRequired: data.serviceRequired,
              projectDescription: data.projectDescription,
              status: data.status || 'new',
              adminNotes: data.adminNotes || '',
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enquiries')
    );

    return () => unsubEnquiries();
  }, [authReady, isAdmin]);

  // Real-time security config sync when authenticated as admin
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsubSecurity = onSnapshot(
      doc(db, 'security', 'adminAccess'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const primaryEmail = String(data.primaryEmail || BOOTSTRAP_ADMIN_EMAIL).toLowerCase();
          const allowedEmails = Array.isArray(data.allowedEmails)
            ? data.allowedEmails.map((e: unknown) => String(e).toLowerCase())
            : [primaryEmail];
          setAdminAccess({
            primaryEmail,
            allowedEmails,
            updatedBy: String(data.updatedBy || ''),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          });
          // Immediately revoke local admin state if current user removed themselves
          const myEmail = auth.currentUser?.email?.toLowerCase() || '';
          if (myEmail && myEmail !== primaryEmail && !allowedEmails.includes(myEmail)) {
            setIsAdmin(false);
          }
        }
      },
      () => {
        setIsAdmin(false);
      }
    );
    return () => unsubSecurity();
  }, [authReady, isAdmin]);

  const signInAdmin = async (): Promise<AuthAttemptResult> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.accessToken) {
        setGmailAccessToken(cred.accessToken);
        setHasGmailToken(true);
      }
      return { ok: true };
    } catch (error) {
      const parsed = interpretFirebaseAuthError(error);
      return {
        ok: false,
        cancelled: parsed.cancelled,
        error: parsed.message,
      };
    }
  };

  const switchAdminAccount = async (): Promise<AuthAttemptResult> => {
    try {
      // Trigger signInWithPopup synchronously with user click (prompt: select_account opens account picker)
      const result = await signInWithPopup(auth, googleProvider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.accessToken) {
        setGmailAccessToken(cred.accessToken);
        setHasGmailToken(true);
      } else {
        setGmailAccessToken(null);
        setHasGmailToken(false);
      }
      return { ok: true };
    } catch (error) {
      const parsed = interpretFirebaseAuthError(error);
      return {
        ok: false,
        cancelled: parsed.cancelled,
        error: parsed.message,
      };
    }
  };

  const signOutAdmin = async () => {
    setGmailAccessToken(null);
    setHasGmailToken(false);
    await signOut(auth);
  };

  const connectGmailForSending = async (): Promise<string> => {
    const token = await acquireGmailAccessToken(auth, googleProvider);
    setHasGmailToken(Boolean(token));
    return token;
  };

  const sendAdminAccessEmails = async (
    targets: { email: string; roleLabel: string; isTransfer?: boolean }[]
  ): Promise<{ sent: string[]; failed: { email: string; error: string }[] }> => {
    let token = getGmailAccessToken();
    if (!token) {
      token = await connectGmailForSending();
    }
    const portalUrl = `${window.location.origin}/#admin`;
    const grantedBy = auth.currentUser?.email || adminAccess.primaryEmail;
    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const target of targets) {
      try {
        await sendAdminPortalAccessEmail({
          accessToken: token,
          recipientEmail: target.email,
          portalUrl,
          roleLabel: target.roleLabel,
          grantedBy,
          isTransfer: target.isTransfer,
        });
        sent.push(target.email);
      } catch (err) {
        if (!getGmailAccessToken()) {
          setHasGmailToken(false);
        }
        failed.push({
          email: target.email,
          error: err instanceof Error ? err.message : 'Failed to send email',
        });
      }
    }

    return { sent, failed };
  };

  const saveAdminAccess = async (next: { primaryEmail: string; allowedEmails: string[] }) => {
    const primary = clampText(next.primaryEmail.toLowerCase(), 160);
    if (!isValidEmail(primary)) {
      throw new Error('Primary admin email must be a valid email address.');
    }
    const normalizedSet = new Set<string>([primary]);
    for (const raw of next.allowedEmails) {
      const cleaned = clampText(raw.toLowerCase(), 160);
      if (cleaned && isValidEmail(cleaned)) {
        normalizedSet.add(cleaned);
      }
    }
    const allowedEmails = Array.from(normalizedSet).slice(0, 15);
    const updatedBy = clampText((auth.currentUser?.email || primary).toLowerCase(), 160);
    const path = 'security/adminAccess';
    try {
      await setDoc(doc(db, 'security', 'adminAccess'), {
        primaryEmail: primary,
        allowedEmails,
        updatedBy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const submitEnquiry = async (payload: {
    name: string;
    businessName: string;
    email: string;
    whatsapp: string;
    serviceRequired: string;
    projectDescription: string;
  }) => {
    const id = `enq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `enquiries/${id}`;
    try {
      await setDoc(doc(db, 'enquiries', id), {
        name: clampText(payload.name, 120),
        businessName: clampText(payload.businessName, 140),
        email: clampText(payload.email, 160),
        whatsapp: clampText(payload.whatsapp, 30),
        serviceRequired: clampText(payload.serviceRequired, 120),
        projectDescription: clampText(payload.projectDescription, 3000),
        status: 'new',
        adminNotes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const saveBrandSettings = async (next: BrandSettings) => {
    const path = 'siteSettings/brand';
    try {
      await setDoc(doc(db, 'siteSettings', 'brand'), {
        companyName: clampText(next.companyName, 80),
        tagline: clampText(next.tagline, 240),
        logoUrl: next.logoUrl.slice(0, 400000),
        aboutHeadline: clampText(next.aboutHeadline, 140),
        aboutDescription: clampText(next.aboutDescription, 1200),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const saveContactSettings = async (next: ContactSettings) => {
    const path = 'siteSettings/contact';
    try {
      await setDoc(doc(db, 'siteSettings', 'contact'), {
        whatsappNumber: clampText(next.whatsappNumber, 30),
        instagramUrl: clampText(next.instagramUrl, 240),
        contactEmail: clampText(next.contactEmail, 160),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addCatalogFlagsToBatch = (batch: WriteBatch, patch: Partial<CatalogState>) => {
    const nextState: CatalogState = { ...catalogState, ...patch };
    batch.set(doc(db, 'siteSettings', 'catalog'), {
      portfolioInitialized: nextState.portfolioInitialized,
      servicesInitialized: nextState.servicesInitialized,
      pricingInitialized: nextState.pricingInitialized,
      testimonialsInitialized: nextState.testimonialsInitialized,
      updatedAt: serverTimestamp(),
    });
  };

  const toServicePayload = (item: ServiceItem) => ({
    title: clampText(item.title, 100),
    description: clampText(item.description, 400),
    iconName: clampText(item.iconName || 'Clapperboard', 40),
    order: Number(item.order) || 0,
    featured: Boolean(item.featured),
    active: Boolean(item.active),
    updatedAt: serverTimestamp(),
  });

  const toPortfolioPayload = (item: PortfolioItem) => ({
    title: clampText(item.title, 120),
    category: item.category,
    description: clampText(item.description, 500),
    thumbnailUrl: item.thumbnailUrl.slice(0, 400000),
    videoUrl: clampText(item.videoUrl, 500),
    duration: clampText(item.duration || '0:45', 20),
    clientName: clampText(item.clientName, 80),
    isPlaceholder: Boolean(item.isPlaceholder),
    order: Number(item.order) || 0,
    updatedAt: serverTimestamp(),
  });

  const toTestimonialPayload = (item: TestimonialItem) => ({
    customerName: clampText(item.customerName, 80),
    role: clampText(item.role, 80),
    company: clampText(item.company, 80),
    quote: clampText(item.quote, 600),
    rating: Math.min(5, Math.max(1, Number(item.rating) || 5)),
    photoUrl: item.photoUrl.slice(0, 400000),
    isSample: Boolean(item.isSample),
    order: Number(item.order) || 0,
    updatedAt: serverTimestamp(),
  });

  const saveService = async (item: ServiceItem) => {
    const id = sanitizeId(item.id || item.title);
    const path = `services/${id}`;
    try {
      const batch = writeBatch(db);
      if (!catalogState.servicesInitialized && (!rawServices || rawServices.length === 0)) {
        DEFAULT_SERVICES.forEach((s) => {
          const sId = sanitizeId(s.id);
          if (sId !== id) {
            batch.set(doc(db, 'services', sId), toServicePayload(s));
          }
        });
      }
      batch.set(doc(db, 'services', id), toServicePayload(item));
      if (!catalogState.servicesInitialized) {
        addCatalogFlagsToBatch(batch, { servicesInitialized: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeService = async (id: string) => {
    const safeId = sanitizeId(id);
    try {
      const batch = writeBatch(db);
      if (!catalogState.servicesInitialized && (!rawServices || rawServices.length === 0)) {
        DEFAULT_SERVICES.forEach((s) => {
          const sId = sanitizeId(s.id);
          if (sId !== safeId) {
            batch.set(doc(db, 'services', sId), toServicePayload(s));
          }
        });
      } else {
        batch.delete(doc(db, 'services', safeId));
      }
      if (!catalogState.servicesInitialized) {
        addCatalogFlagsToBatch(batch, { servicesInitialized: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `services/${safeId}`);
    }
  };

  const savePortfolioItem = async (item: PortfolioItem) => {
    const id = sanitizeId(item.id || item.title);
    const path = `portfolio/${id}`;
    const existingItem = portfolio.find((p) => p.id === id);
    try {
      const batch = writeBatch(db);
      if (!catalogState.portfolioInitialized && (!rawPortfolio || rawPortfolio.length === 0)) {
        DEFAULT_PORTFOLIO.forEach((p) => {
          const pId = sanitizeId(p.id);
          if (pId !== id) {
            batch.set(doc(db, 'portfolio', pId), toPortfolioPayload(p));
          }
        });
      }
      batch.set(doc(db, 'portfolio', id), toPortfolioPayload(item));
      if (!catalogState.portfolioInitialized) {
        addCatalogFlagsToBatch(batch, { portfolioInitialized: true });
      }
      await batch.commit();
      if (
        existingItem &&
        isFirestoreVideoUrl(existingItem.videoUrl) &&
        existingItem.videoUrl !== item.videoUrl
      ) {
        void deleteFirestoreVideo(existingItem.videoUrl);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removePortfolioItem = async (id: string) => {
    const safeId = sanitizeId(id);
    const existingItem = portfolio.find((p) => p.id === safeId);
    try {
      const batch = writeBatch(db);
      if (!catalogState.portfolioInitialized && (!rawPortfolio || rawPortfolio.length === 0)) {
        // Materialize all other default items so the deleted one disappears permanently right now
        DEFAULT_PORTFOLIO.forEach((p) => {
          const pId = sanitizeId(p.id);
          if (pId !== safeId) {
            batch.set(doc(db, 'portfolio', pId), toPortfolioPayload(p));
          }
        });
      } else {
        batch.delete(doc(db, 'portfolio', safeId));
      }
      addCatalogFlagsToBatch(batch, { portfolioInitialized: true });
      await batch.commit();

      if (existingItem && isFirestoreVideoUrl(existingItem.videoUrl)) {
        await deleteFirestoreVideo(existingItem.videoUrl);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `portfolio/${safeId}`);
    }
  };

  const clearSamplePortfolioItems = async () => {
    const sampleItems = portfolio.filter((p) => p.isPlaceholder);
    const nonSampleItems = portfolio.filter((p) => !p.isPlaceholder);
    try {
      const batch = writeBatch(db);
      if (!catalogState.portfolioInitialized && (!rawPortfolio || rawPortfolio.length === 0)) {
        nonSampleItems.forEach((p) => {
          batch.set(doc(db, 'portfolio', sanitizeId(p.id)), toPortfolioPayload(p));
        });
      } else {
        sampleItems.forEach((p) => {
          batch.delete(doc(db, 'portfolio', sanitizeId(p.id)));
        });
      }
      addCatalogFlagsToBatch(batch, { portfolioInitialized: true });
      await batch.commit();

      for (const sample of sampleItems) {
        if (isFirestoreVideoUrl(sample.videoUrl)) {
          await deleteFirestoreVideo(sample.videoUrl);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'portfolio');
    }
  };

  const deleteUploadedPortfolioVideo = async (
    projectId: string | null,
    videoUrl: string
  ) => {
    if (isFirestoreVideoUrl(videoUrl)) {
      await deleteFirestoreVideo(videoUrl);
    }
    if (projectId) {
      const safeId = sanitizeId(projectId);
      const existingItem = portfolio.find((p) => p.id === safeId);
      if (existingItem && existingItem.videoUrl === videoUrl) {
        try {
          await updateDoc(doc(db, 'portfolio', safeId), {
            videoUrl: '',
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `portfolio/${safeId}`);
        }
      }
    }
  };

  const savePricingTier = async (tier: PricingTier) => {
    const id = sanitizeId(tier.id || tier.name);
    const path = `pricingTiers/${id}`;
    const features = tier.features
      .map((f) => clampText(f, 140))
      .filter(Boolean)
      .slice(0, 10);
    if (features.length === 0) features.push('Custom AI video production scope');
    const payload = {
      name: clampText(tier.name, 60),
      priceLabel: clampText(tier.priceLabel || 'Contact for Pricing', 60),
      summary: clampText(tier.summary, 260),
      features,
      highlighted: Boolean(tier.highlighted),
      order: Number(tier.order) || 0,
      updatedAt: serverTimestamp(),
    };
    try {
      const batch = writeBatch(db);
      if (!catalogState.pricingInitialized && (!rawPricingTiers || rawPricingTiers.length === 0)) {
        DEFAULT_PRICING_TIERS.forEach((t) => {
          const tId = sanitizeId(t.id);
          if (tId !== id) {
            batch.set(doc(db, 'pricingTiers', tId), {
              name: t.name,
              priceLabel: t.priceLabel,
              summary: t.summary,
              features: t.features,
              highlighted: t.highlighted,
              order: t.order,
              updatedAt: serverTimestamp(),
            });
          }
        });
      }
      batch.set(doc(db, 'pricingTiers', id), payload);
      if (!catalogState.pricingInitialized) {
        addCatalogFlagsToBatch(batch, { pricingInitialized: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const saveTestimonial = async (item: TestimonialItem) => {
    const id = sanitizeId(item.id || item.customerName);
    const path = `testimonials/${id}`;
    try {
      const batch = writeBatch(db);
      if (
        !catalogState.testimonialsInitialized &&
        (!rawTestimonials || rawTestimonials.length === 0)
      ) {
        DEFAULT_TESTIMONIALS.forEach((tm) => {
          const tmId = sanitizeId(tm.id);
          if (tmId !== id) {
            batch.set(doc(db, 'testimonials', tmId), toTestimonialPayload(tm));
          }
        });
      }
      batch.set(doc(db, 'testimonials', id), toTestimonialPayload(item));
      if (!catalogState.testimonialsInitialized) {
        addCatalogFlagsToBatch(batch, { testimonialsInitialized: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const removeTestimonial = async (id: string) => {
    const safeId = sanitizeId(id);
    try {
      const batch = writeBatch(db);
      if (
        !catalogState.testimonialsInitialized &&
        (!rawTestimonials || rawTestimonials.length === 0)
      ) {
        DEFAULT_TESTIMONIALS.forEach((tm) => {
          const tmId = sanitizeId(tm.id);
          if (tmId !== safeId) {
            batch.set(doc(db, 'testimonials', tmId), toTestimonialPayload(tm));
          }
        });
      } else {
        batch.delete(doc(db, 'testimonials', safeId));
      }
      if (!catalogState.testimonialsInitialized) {
        addCatalogFlagsToBatch(batch, { testimonialsInitialized: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `testimonials/${safeId}`);
    }
  };

  const updateEnquiryStatus = async (id: string, status: EnquiryStatus, adminNotes: string) => {
    const safeId = sanitizeId(id);
    const path = `enquiries/${safeId}`;
    try {
      await updateDoc(doc(db, 'enquiries', safeId), {
        status,
        adminNotes: clampText(adminNotes, 1000),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const removeEnquiry = async (id: string) => {
    const safeId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, 'enquiries', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enquiries/${safeId}`);
    }
  };

  const seedDefaultsInFirestore = async () => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'siteSettings', 'brand'), {
        ...DEFAULT_BRAND_SETTINGS,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'siteSettings', 'contact'), {
        ...DEFAULT_CONTACT_SETTINGS,
        updatedAt: serverTimestamp(),
      });
      addCatalogFlagsToBatch(batch, {
        portfolioInitialized: true,
        servicesInitialized: true,
        pricingInitialized: true,
        testimonialsInitialized: true,
      });
      DEFAULT_SERVICES.forEach((s) => {
        const { id, ...rest } = s;
        batch.set(doc(db, 'services', id), { ...rest, updatedAt: serverTimestamp() });
      });
      DEFAULT_PORTFOLIO.forEach((p) => {
        const { id, ...rest } = p;
        batch.set(doc(db, 'portfolio', id), { ...rest, updatedAt: serverTimestamp() });
      });
      DEFAULT_PRICING_TIERS.forEach((t) => {
        const { id, ...rest } = t;
        batch.set(doc(db, 'pricingTiers', id), { ...rest, updatedAt: serverTimestamp() });
      });
      DEFAULT_TESTIMONIALS.forEach((tm) => {
        const { id, ...rest } = tm;
        batch.set(doc(db, 'testimonials', id), { ...rest, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
    }
  };

  const value = useMemo<StudioDataContextValue>(
    () => ({
      brand,
      contact,
      services,
      portfolio,
      pricingTiers,
      testimonials,
      enquiries,
      isFirestoreSeeded: hasStoredServices,
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
      submitEnquiry,
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
    }),
    [
      brand,
      contact,
      services,
      portfolio,
      pricingTiers,
      testimonials,
      enquiries,
      hasStoredServices,
      user,
      authReady,
      isAdmin,
      adminAccess,
      hasGmailToken,
      catalogState,
      rawServices,
      rawPortfolio,
      rawPricingTiers,
      rawTestimonials,
    ]
  );

  return <StudioDataContext.Provider value={value}>{children}</StudioDataContext.Provider>;
};

export function useStudioData(): StudioDataContextValue {
  const ctx = useContext(StudioDataContext);
  if (!ctx) throw new Error('useStudioData must be used inside StudioDataProvider');
  return ctx;
}
