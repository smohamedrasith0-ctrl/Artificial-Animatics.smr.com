import {
  BrandSettings,
  ContactSettings,
  PortfolioItem,
  PricingTier,
  ServiceItem,
  TestimonialItem,
} from '../types';

export const HERO_BACKDROP_IMAGE = '/src/assets/images/hero_ai_cinema_stage_1794897005500.jpg';
export const ABOUT_STUDIO_IMAGE = '/src/assets/images/about_studio_suite_1794897008041.jpg';

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  companyName: 'ARTIFICIAL ANIMATICS',
  tagline:
    'Next-generation AI video production and creative advertising solutions that bring brands, products and ideas to life.',
  logoUrl: '',
  aboutHeadline: 'CREATIVITY MEETS ARTIFICIAL INTELLIGENCE.',
  aboutDescription:
    'Artificial Animatics is a creative AI video production company focused on transforming ideas into visually engaging advertisements and digital experiences. We combine artificial intelligence, creativity and storytelling to help businesses communicate their brand more effectively.',
};

// Empty strings signify editable placeholders until the administrator sets live details.
export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  whatsappNumber: '',
  instagramUrl: '',
  contactEmail: '',
};

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'ai-advertisement-videos',
    title: 'AI Advertisement Videos',
    description:
      'High-converting brand commercials engineered with generative cinema, sharp pacing, and persuasive narrative hooks for multi-channel campaigns.',
    iconName: 'Clapperboard',
    order: 1,
    featured: true,
    active: true,
  },
  {
    id: 'product-promotional-videos',
    title: 'Product Promotional Videos',
    description:
      'Studio-lit product reveals, macro material detail, and dynamic feature storytelling designed to elevate launches and e-commerce conversion.',
    iconName: 'Box',
    order: 2,
    featured: true,
    active: true,
  },
  {
    id: 'real-estate-promotional-videos',
    title: 'Real Estate Promotional Videos',
    description:
      'Architectural flythroughs, twilight atmosphere enhancements, and lifestyle property films that showcase developments before or after completion.',
    iconName: 'Building2',
    order: 3,
    featured: false,
    active: true,
  },
  {
    id: 'cinematic-ai-videos',
    title: 'Cinematic AI Videos',
    description:
      'Film-grade brand manifestos, atmospheric visual worlds, and emotionally resonant storytelling produced with precision art direction.',
    iconName: 'Film',
    order: 4,
    featured: false,
    active: true,
  },
  {
    id: '3d-animation-motion-graphics',
    title: '3D Animation and Motion Graphics',
    description:
      'Sculptural 3D sequences, kinetic typography, and sleek visual systems tailored for product explainers, title sequences, and digital displays.',
    iconName: 'Layers',
    order: 5,
    featured: false,
    active: true,
  },
  {
    id: 'social-media-reels-shorts',
    title: 'Social Media Reels and Shorts',
    description:
      'Thumb-stopping vertical campaigns calibrated for Instagram Reels, YouTube Shorts, and TikTok with rapid creative iteration.',
    iconName: 'Smartphone',
    order: 6,
    featured: false,
    active: true,
  },
  {
    id: 'business-promotional-videos',
    title: 'Business Promotional Videos',
    description:
      'Executive brand overviews, company culture films, and B2B pitch assets that communicate credibility and clear value propositions.',
    iconName: 'Briefcase',
    order: 7,
    featured: false,
    active: true,
  },
  {
    id: 'custom-ai-video-production',
    title: 'Custom AI Video Production',
    description:
      'Bespoke hybrid workflows combining custom visual styles, voiceover direction, sound design, and tailored creative pipelines for unique briefs.',
    iconName: 'Wand2',
    order: 8,
    featured: false,
    active: true,
  },
];

export const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'chronograph-launch-spot',
    title: 'Chronograph Horizon — Flagship Commercial',
    category: 'Advertisements',
    description:
      'High-contrast macro commercial sequence blending photorealistic titanium lighting with rapid editorial cuts for a luxury timepiece campaign.',
    thumbnailUrl: '/src/assets/images/portfolio_ad_chronograph_1794897005289.jpg',
    videoUrl: '',
    duration: '0:45',
    clientName: 'Sample Commercial Reel',
    isPlaceholder: true,
    order: 1,
  },
  {
    id: 'cliffside-villa-twilight',
    title: 'Cliffside Sanctuary — Architectural Tour',
    category: 'Real Estate',
    description:
      'Twilight architectural showcase capturing panoramic coastal reflections, warm interior lighting, and seamless aerial transitions.',
    thumbnailUrl: '/src/assets/images/portfolio_real_estate_villa_1794897005386.jpg',
    videoUrl: '',
    duration: '1:15',
    clientName: 'Sample Property Film',
    isPlaceholder: true,
    order: 2,
  },
  {
    id: 'studio-acoustic-headset',
    title: 'Vertex Acoustic — Product Reveal Film',
    category: 'Product Videos',
    description:
      'Precision studio product film highlighting matte materials, acoustic engineering cues, and rhythmic rim lighting.',
    thumbnailUrl: '/src/assets/images/portfolio_product_headphones_1794897006103.jpg',
    videoUrl: '',
    duration: '0:30',
    clientName: 'Sample Tech Launch',
    isPlaceholder: true,
    order: 3,
  },
  {
    id: 'kinetic-brand-sculpture',
    title: 'Obsidian Dynamics — 3D Brand Motion',
    category: 'Creative Animations',
    description:
      'Procedural kinetic ring sculpture and refractive glass motion identity crafted for a global technology summit opener.',
    thumbnailUrl: '/src/assets/images/portfolio_3d_motion_sculpture_1794897005853.jpg',
    videoUrl: '',
    duration: '0:50',
    clientName: 'Sample Motion Identity',
    isPlaceholder: true,
    order: 4,
  },
  {
    id: 'agency-suite-brand-film',
    title: 'Studio Workflow — Corporate Brand Story',
    category: 'Business Promotions',
    description:
      'Editorial B2B showcase presenting modern creative direction, collaborative pipelines, and measurable campaign outcomes.',
    thumbnailUrl: '/src/assets/images/about_studio_suite_1794897008041.jpg',
    videoUrl: '',
    duration: '1:30',
    clientName: 'Sample Corporate Film',
    isPlaceholder: true,
    order: 5,
  },
  {
    id: 'cinema-stage-manifesto',
    title: 'Visual Reality — Hero Showreel Cut',
    category: 'Advertisements',
    description:
      'Widescreen cinematic teaser combining volumetric stage lighting, atmospheric depth, and dramatic voiceover pacing.',
    thumbnailUrl: '/src/assets/images/hero_ai_cinema_stage_1794897005500.jpg',
    videoUrl: '',
    duration: '0:60',
    clientName: 'Sample Agency Reel',
    isPlaceholder: true,
    order: 6,
  },
];

export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceLabel: 'Contact for Pricing',
    summary: 'Ideal for product launches, social media reels, and concise promotional clips.',
    features: [
      'Single AI promotional video or social reel',
      'Concept script & visual direction',
      'Curated music & sound design',
      '1080p / vertical & widescreen export',
      'Two structured revision rounds',
    ],
    highlighted: false,
    order: 1,
  },
  {
    id: 'professional',
    name: 'Professional',
    priceLabel: 'Contact for Pricing',
    summary: 'Built for growing brands needing high-impact commercials and multi-format ad sets.',
    features: [
      'Full commercial AI video production',
      'Custom storyboard & 3D motion accents',
      'Professional voiceover & sound mix',
      '4K master + social ad aspect variations',
      'Priority production turnaround',
    ],
    highlighted: true,
    order: 2,
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: 'Contact for Pricing',
    summary: 'End-to-end creative direction and multi-deliverable campaigns for ambitious teams.',
    features: [
      'Multi-video campaign & brand storytelling',
      'Bespoke 3D animation & visual worldbuilding',
      'Dedicated creative director oversight',
      'Full raw stems, cutdowns & localization',
      'Ongoing monthly creative partnership option',
    ],
    highlighted: false,
    order: 3,
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'sample-1',
    customerName: 'Aria Vance',
    role: 'Brand Director',
    company: 'Vanguard Horology (Sample)',
    quote:
      'Artificial Animatics delivered a launch commercial that looked like a full studio shoot in a fraction of our normal production window. Their pacing and lighting direction elevated our entire campaign.',
    rating: 5,
    photoUrl: '',
    isSample: true,
    order: 1,
  },
  {
    id: 'sample-2',
    customerName: 'Marcus Chen',
    role: 'Head of Growth',
    company: 'Solstice Estates (Sample)',
    quote:
      'Our pre-construction twilight film gave buyers an immediate emotional connection to the property. From concept notes to final 4K delivery, the workflow was seamless.',
    rating: 5,
    photoUrl: '',
    isSample: true,
    order: 2,
  },
  {
    id: 'sample-3',
    customerName: 'Elena Rostova',
    role: 'Founder',
    company: 'Kinetix Audio (Sample)',
    quote:
      'We needed crisp product reels across three aspect ratios before our global announcement. They translated rough briefs into polished visual storytelling without a single wasted frame.',
    rating: 5,
    photoUrl: '',
    isSample: true,
    order: 3,
  },
];
