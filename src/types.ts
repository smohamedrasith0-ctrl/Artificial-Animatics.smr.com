export type PortfolioCategory =
  | 'Advertisements'
  | 'Real Estate'
  | 'Product Videos'
  | 'Business Promotions'
  | 'Creative Animations';

export const PORTFOLIO_CATEGORIES: PortfolioCategory[] = [
  'Advertisements',
  'Real Estate',
  'Product Videos',
  'Business Promotions',
  'Creative Animations',
];

export type EnquiryStatus = 'new' | 'in_review' | 'replied' | 'archived';

export interface BrandSettings {
  companyName: string;
  tagline: string;
  logoUrl: string;
  aboutHeadline: string;
  aboutDescription: string;
}

export interface ContactSettings {
  whatsappNumber: string;
  instagramUrl: string;
  contactEmail: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  order: number;
  featured: boolean;
  active: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: PortfolioCategory;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  clientName: string;
  isPlaceholder: boolean;
  order: number;
}

export interface PricingTier {
  id: string;
  name: string;
  priceLabel: string;
  summary: string;
  features: string[];
  highlighted: boolean;
  order: number;
}

export interface TestimonialItem {
  id: string;
  customerName: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  photoUrl: string;
  isSample: boolean;
  order: number;
}

export interface EnquiryItem {
  id: string;
  name: string;
  businessName: string;
  email: string;
  whatsapp: string;
  serviceRequired: string;
  projectDescription: string;
  status: EnquiryStatus;
  adminNotes: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface AdminAccessConfig {
  primaryEmail: string;
  allowedEmails: string[];
  updatedBy: string;
  updatedAt?: Date | null;
}
