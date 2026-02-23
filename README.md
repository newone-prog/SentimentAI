# Lipstick Product Landing Page Template

A bold, high-impact product landing page template featuring Swiss-inspired grid design, cinematic scroll animations, and edgy typography. Perfect for beauty, cosmetics, or lifestyle brands looking for a dark, premium aesthetic with immersive visual storytelling.

## Features

- **Hero Section** - Full-screen grid collage with animated title reveal and image slicing
- **Manifesto Section** - Brand message with synchronized text and image animations
- **Product Spotlight** - Product showcase with parallax image tiles
- **Texture Study** - Close-up visuals with macro photography effects
- **Shade Range** - Product catalog grid with hover interactions
- **Final Statement** - Brand philosophy section with dual-image layout
- **Contact/Newsletter** - Subscription form with social links
- **Scroll Snap** - Smooth section-to-section navigation
- **Film Grain Overlay** - Cinematic texture layer
- **Responsive Design** - Mobile-optimized layouts

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 3** with custom animations
- **GSAP 3** with ScrollTrigger (pinned sections, scroll-driven animations)
- **shadcn/ui** component primitives (if using base components)

## Quick Start

1. Clone or extract this template
2. Install dependencies:
   ```bash
   npm install
   ```
3. Edit `src/config.ts` with your content
4. Add images to `public/images/`
5. Run the dev server:
   ```bash
   npm run dev
   ```
6. Build for production:
   ```bash
   npm run build
   ```

## Configuration

All content is configured in `src/config.ts`. Edit this single file to customize your entire site. **Do not modify component files** - they contain pure logic and read from config.

### Navigation

```typescript
export const navigationConfig: NavigationConfig = {
  logo: "",                    // Brand name displayed in header (e.g. "Lipstick Queen")
  links: [],                   // Array of { label: string, href: string }
                               // href should match section IDs: "#shop", "#shades", "#story", "#contact"
};
```

**Example:**
```typescript
{
  logo: "ROUGE BOLD",
  links: [
    { label: "Shop", href: "#shop" },
    { label: "Shades", href: "#shades" },
    { label: "Story", href: "#story" },
    { label: "Contact", href: "#contact" }
  ]
}
```

---

### Hero Section

```typescript
export const heroConfig: HeroConfig = {
  heroImage: "",               // Path to hero collage image: "images/hero.jpg"
  titleText: "",               // 10-letter title text (e.g. "DARETOWEAR")
                               // Letters are distributed across the grid
  subtitleLabel: "",           // Small label in top-right (e.g. "New Season Drop")
  ctaText: "",                 // CTA button text (e.g. "Shop the Drop")
};
```

**Example:**
```typescript
{
  heroImage: "images/hero_face.jpg",
  titleText: "DARETOWEAR",
  subtitleLabel: "New Season Drop",
  ctaText: "Shop the Drop"
}
```

**Notes:**
- `titleText` should be exactly 10 characters (letters are placed in grid)
- If fewer than 10 characters, remaining grid positions will be empty
- `heroImage` is sliced into 6 segments across the grid

---

### Manifesto Section

```typescript
export const manifestoConfig: ManifestoConfig = {
  image: "",                   // Path: "images/manifesto.jpg"
  phrases: [],                 // Array of short phrases (9 max)
                               // e.g. ["IT'S", "YOUR", "LIPS", "(AND", "YOUR", "LIFE)", "DARE", "TO", "WEAR"]
};
```

**Example:**
```typescript
{
  image: "images/manifesto_face.jpg",
  phrases: ["IT'S", "YOUR", "LIPS", "(AND", "YOUR", "LIFE)", "DARE", "TO", "WEAR"]
}
```

---

### Product Spotlight Section

```typescript
export const productSpotlightConfig: ProductSpotlightConfig = {
  productImage: "",            // Path: "images/product.jpg"
  portraitImage: "",           // Path: "images/portrait.jpg"
  titlePhrases: [],            // Array of phrases (6 max)
                               // e.g. ["THE", "ICON", "SHADE", "THAT", "NEVER", "SLEEPS"]
  ctaText: "",                 // Button text (e.g. "Add to Bag")
  price: "",                   // Price display (e.g. "$28")
};
```

**Example:**
```typescript
{
  productImage: "images/product_lipstick.jpg",
  portraitImage: "images/spotlight_face.jpg",
  titlePhrases: ["THE", "ICON", "SHADE", "THAT", "NEVER", "SLEEPS"],
  ctaText: "Add to Bag",
  price: "$28"
}
```

---

### Texture Section

```typescript
export const textureConfig: TextureConfig = {
  portraitImage: "",           // Path: "images/portrait_side.jpg"
  macroImage: "",              // Path: "images/texture_lips.jpg" (close-up texture)
  titlePhrases: [],            // Array of phrases (6 max)
                               // e.g. ["FEEL", "THE", "COLOR", "OWN", "THE", "ROOM"]
  subtitle: "",                // Bottom tagline (e.g. "Velvet matte. All day. No apologies.")
};
```

**Example:**
```typescript
{
  portraitImage: "images/texture_face_side.jpg",
  macroImage: "images/texture_lips.jpg",
  titlePhrases: ["FEEL", "THE", "COLOR", "OWN", "THE", "ROOM"],
  subtitle: "Velvet matte. All day. No apologies."
}
```

---

### Shade Range Section

```typescript
export const shadeRangeConfig: ShadeRangeConfig = {
  heading: [],                 // Array of heading lines (e.g. ["CHOOSE", "YOUR"])
  headingAccent: "",           // Accent line in pink (e.g. "TRUTH")
  shades: [],                  // Array of { name: string, image: string }
  price: "",                   // Price per shade (e.g. "$28")
  ctaText: "",                 // Button text (e.g. "Add to Bag")
};
```

**Example:**
```typescript
{
  heading: ["CHOOSE", "YOUR"],
  headingAccent: "TRUTH",
  shades: [
    { name: "Stage Red", image: "images/shade_swatch_1.jpg" },
    { name: "Afterhours Plum", image: "images/shade_swatch_2.jpg" },
    { name: "Riot Pink", image: "images/shade_swatch_3.jpg" },
    { name: "Bare Threat", image: "images/shade_swatch_4.jpg" },
    { name: "Midnight Merlot", image: "images/shade_swatch_5.jpg" },
    { name: "Neon Confession", image: "images/shade_swatch_6.jpg" }
  ],
  price: "$28",
  ctaText: "Add to Bag"
}
```

---

### Final Statement Section

```typescript
export const finalStatementConfig: FinalStatementConfig = {
  image1: "",                  // Path: "images/closing_face_1.jpg"
  image2: "",                  // Path: "images/closing_face_2.jpg"
  phrases: [],                 // Array of phrases (7 max)
                               // e.g. ["LIFE", "IS", "TOO", "SHORT", "FOR", "NUDE", "LIPS"]
  subtitle: "",                // Bottom tagline (e.g. "Go bold. Stay bold.")
};
```

**Example:**
```typescript
{
  image1: "images/closing_face_1.jpg",
  image2: "images/closing_face_2.jpg",
  phrases: ["LIFE", "IS", "TOO", "SHORT", "FOR", "NUDE", "LIPS"],
  subtitle: "Go bold. Stay bold."
}
```

---

### Contact Section

```typescript
export const contactConfig: ContactConfig = {
  leftLinks: [],               // Array of link labels (e.g. ["STOCKISTS", "PRESS", "CARE"])
  formHeading: [],             // Array of heading lines (e.g. ["GET", "THE"])
  formHeadingAccent: "",       // Accent line in pink (e.g. "DROP")
  formDescription: "",         // Form description text
  emailPlaceholder: "",        // Email input placeholder (e.g. "YOUR EMAIL")
  subscribeButtonText: "",     // Submit button text (e.g. "Subscribe")
  socialLinks: [],             // Array of { label: string, href: string }
                               // e.g. [{ label: "IG", href: "https://instagram.com/..." }]
  copyright: "",               // Copyright text (e.g. "© 2026 LIPSTICK QUEEN")
  tagline: "",                 // Brand tagline (e.g. "DARE TO WEAR")
};
```

**Example:**
```typescript
{
  leftLinks: ["STOCKISTS", "PRESS", "CARE"],
  formHeading: ["GET", "THE"],
  formHeadingAccent: "DROP",
  formDescription: "New shades, restocks, and behind-the-scenes—once a week, zero spam.",
  emailPlaceholder: "YOUR EMAIL",
  subscribeButtonText: "Subscribe",
  socialLinks: [
    { label: "IG", href: "https://instagram.com/brand" },
    { label: "TK", href: "https://tiktok.com/@brand" },
    { label: "PIN", href: "https://pinterest.com/brand" }
  ],
  copyright: "© 2026 LIPSTICK QUEEN",
  tagline: "DARE TO WEAR"
}
```

---

### Site Metadata

```typescript
export const siteConfig: SiteConfig = {
  title: "",                   // Browser tab title (also update in index.html)
  description: "",             // Site description for SEO
  language: "",                // Language code
};
```

---

## Required Images

Add these images to the `public/images/` directory:

### Hero Section (1 image)
- **hero_face.jpg** - Portrait photo for grid collage. Recommended: **1920x1080** or larger. Image is sliced into 6 segments.

### Manifesto Section (1 image)
- **manifesto_face.jpg** - Portrait photo. Recommended: **800x1200** portrait orientation. Image is sliced into 5 segments.

### Product Spotlight Section (2 images)
- **product_lipstick.jpg** - Product photo. Recommended: **800x1200** portrait orientation. Image is sliced into 4 segments.
- **spotlight_face.jpg** - Portrait photo. Recommended: **800x1200** portrait orientation. Image is sliced into 7 segments.

### Texture Section (2 images)
- **texture_face_side.jpg** - Side profile portrait. Recommended: **800x1200** portrait orientation. Image is sliced into 4 segments.
- **texture_lips.jpg** - Macro/close-up of lips texture. Recommended: **1200x800** landscape. Image is sliced into 7 segments.

### Shade Range Section (6 images)
- **shade_swatch_1.jpg** - Shade 1 swatch photo. Recommended: **600x600** square format.
- **shade_swatch_2.jpg** - Shade 2 swatch photo. Recommended: **600x600** square format.
- **shade_swatch_3.jpg** - Shade 3 swatch photo. Recommended: **600x600** square format.
- **shade_swatch_4.jpg** - Shade 4 swatch photo. Recommended: **600x600** square format.
- **shade_swatch_5.jpg** - Shade 5 swatch photo. Recommended: **600x600** square format.
- **shade_swatch_6.jpg** - Shade 6 swatch photo. Recommended: **600x600** square format.

### Final Statement Section (2 images)
- **closing_face_1.jpg** - Portrait photo. Recommended: **800x1200** portrait orientation. Image is sliced into 4 segments.
- **closing_face_2.jpg** - Portrait photo. Recommended: **800x1200** portrait orientation. Image is sliced into 4 segments.

**Total: 14 images**

---

## Design

### Colors

Defined in `src/App.css` and Tailwind config:

- **Primary/Accent:** Pink `#ff73c3` (`.text-lipstick-pink`, `.bg-lipstick-pink`)
- **Background:** Light grey `#f5f3ef` (`.bg-lipstick-grey`)
- **Foreground:** Black `#0a0a0a` (`.text-lipstick-black`)
- **Contact BG:** Black `#000000` (`.bg-lipstick-black`)
- **Text Secondary:** Grey with opacity (`.text-lipstick-text-secondary`)

To change the accent color, update CSS custom properties in `src/App.css`.

### Fonts

- **Display:** [Montserrat](https://fonts.google.com/specimen/Montserrat) (weights 100-900) - Used for headings, logos, large titles (`.font-heading`)
- **Body:** [Open Sans](https://fonts.google.com/specimen/Open+Sans) (weights 300-800) - Used for body text (`.font-body`)
- **Mono Label:** [Space Mono](https://fonts.google.com/specimen/Space+Mono) (weight 400) - Used for labels, prices (`.font-mono-label`)

Fonts are imported via Google Fonts in `src/index.css`.

### Animations

All GSAP animations are preserved in components:

#### Hero Section
- **Load Animation:** Tiles wipe in → Image slices clip reveal → Text tiles pop → Accent tiles flash
- **Scroll Exit:** All elements scatter and fade out as you scroll down

#### Manifesto, Product, Texture, Final Sections
- **Entrance (0%-30% scroll):** Text slides up, images slide in, accents scale up
- **Hold (30%-70%):** Elements stay visible during scroll
- **Exit (70%-100%):** All elements fade/slide out as next section approaches

#### Shade Range Section
- **Scroll Trigger:** Heading fades up, cards rotate in with stagger

#### Contact Section
- **Scroll Trigger:** Form block fades up, contact tiles stagger in

#### Global
- **Scroll Snap:** Smooth snap-to-section navigation for pinned sections

---

## Build

Standard Vite build:

```bash
npm run build
```

Output is in the `dist/` folder, ready for static hosting (Vercel, Netlify, GitHub Pages, etc.).

Build optimizations include:
- Tree-shaking
- Code splitting
- Asset compression
- Minification
- Cache-busting hashes

---

## Project Structure

```
├── src/
│   ├── config.ts              ← Edit this file for all content
│   ├── main.tsx               ← React entry point
│   ├── App.tsx                ← Root component (all sections, scroll snap)
│   ├── App.css                ← Component-specific styles
│   ├── index.css              ← Global styles, fonts, Tailwind imports
│   ├── components/
│   │   └── ui/                ← shadcn/ui component library (if using)
│   ├── hooks/
│   │   └── use-mobile.ts      ← Mobile detection hook
│   └── lib/
│       └── utils.ts           ← Utility functions (cn, etc.)
├── public/
│   └── images/                ← Add your 14 images here
│       └── .gitkeep
├── index.html                 ← HTML entry (update <title> here)
├── tailwind.config.js         ← Tailwind theme + custom animations
├── vite.config.ts             ← Vite build config
├── postcss.config.js          ← PostCSS plugins
├── tsconfig*.json             ← TypeScript configs
└── package.json               ← Dependencies
```

---

## Notes

- **Edit only `src/config.ts`** and add images to `public/images/`
- Do not modify component files unless fixing bugs
- Design properties (colors, fonts) are in `src/App.css` and `tailwind.config.js`
- All GSAP animations are preserved in component logic
- Components automatically hide when their config values are empty
- Update `<title>` in `index.html` to match your site name

---

## Tips

- Use high-quality images (1200px+ recommended)
- Keep phrase arrays concise (1-2 words per phrase)
- Test scroll animations on different screen sizes
- Optimize images before adding (WebP format recommended)
- Ensure hero image has visual interest across the entire frame (it gets sliced into a grid)

---

## License

This template is provided as-is for use in your projects.
