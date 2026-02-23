// ============================================================================
// Configuration File for Lipstick Product Website Template
// ============================================================================
// Edit this file to customize all content on your site.
// Do NOT modify component files - they read from this config.

// Navigation Configuration
export interface NavigationConfig {
  logo: string;
  links: Array<{ label: string; href: string }>;
}

export const navigationConfig: NavigationConfig = {
  logo: "",
  links: [],
};

// Hero Section Configuration
export interface HeroConfig {
  heroImage: string;
  titleText: string;
  subtitleLabel: string;
  ctaText: string;
}

export const heroConfig: HeroConfig = {
  heroImage: "",
  titleText: "",
  subtitleLabel: "",
  ctaText: "",
};

// Manifesto Section Configuration
export interface ManifestoConfig {
  image: string;
  phrases: string[];
}

export const manifestoConfig: ManifestoConfig = {
  image: "",
  phrases: [],
};

// Product Spotlight Section Configuration
export interface ProductSpotlightConfig {
  productImage: string;
  portraitImage: string;
  titlePhrases: string[];
  ctaText: string;
  price: string;
}

export const productSpotlightConfig: ProductSpotlightConfig = {
  productImage: "",
  portraitImage: "",
  titlePhrases: [],
  ctaText: "",
  price: "",
};

// Texture Section Configuration
export interface TextureConfig {
  portraitImage: string;
  macroImage: string;
  titlePhrases: string[];
  subtitle: string;
}

export const textureConfig: TextureConfig = {
  portraitImage: "",
  macroImage: "",
  titlePhrases: [],
  subtitle: "",
};

// Shade Range Section Configuration
export interface ShadeConfig {
  name: string;
  image: string;
}

export interface ShadeRangeConfig {
  heading: string[];
  headingAccent: string;
  shades: ShadeConfig[];
  price: string;
  ctaText: string;
}

export const shadeRangeConfig: ShadeRangeConfig = {
  heading: [],
  headingAccent: "",
  shades: [],
  price: "",
  ctaText: "",
};

// Final Statement Section Configuration
export interface FinalStatementConfig {
  image1: string;
  image2: string;
  phrases: string[];
  subtitle: string;
}

export const finalStatementConfig: FinalStatementConfig = {
  image1: "",
  image2: "",
  phrases: [],
  subtitle: "",
};

// Contact Section Configuration
export interface ContactConfig {
  leftLinks: string[];
  formHeading: string[];
  formHeadingAccent: string;
  formDescription: string;
  emailPlaceholder: string;
  subscribeButtonText: string;
  socialLinks: Array<{ label: string; href: string }>;
  copyright: string;
  tagline: string;
}

export const contactConfig: ContactConfig = {
  leftLinks: [],
  formHeading: [],
  formHeadingAccent: "",
  formDescription: "",
  emailPlaceholder: "",
  subscribeButtonText: "",
  socialLinks: [],
  copyright: "",
  tagline: "",
};

// Site Metadata
export interface SiteConfig {
  title: string;
  description: string;
  language: string;
}

export const siteConfig: SiteConfig = {
  title: "",
  description: "",
  language: "",
};
