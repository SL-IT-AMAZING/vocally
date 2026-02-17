# Vocally Web Surface Architecture Inventory

**Date:** February 17, 2026  
**Scope:** `apps/web` only (marketing site / SPA)  
**Purpose:** Clean separation points for major redesign while preserving routes and functional logic

---

## Executive Summary

The Vocally web app is a **marketing site + payment/auth funnel** built with React Router, Zustand (app state), Supabase Auth, and CSS Modules. The architecture cleanly separates:

1. **Page Layer** (11 routable pages)
2. **Layout Layer** (2 wrapper layouts managing metadata & structure)
3. **Section Layer** (reusable page components, often feature showcases)
4. **Component Layer** (UI primitives and helpers)
5. **Cross-Cutting** (i18n, auth, download logic, analytics)

**Key insight for redesign:** Pages compose sections. Sections are mostly stateless. Layout boundaries are clear. Styles are module-scoped. This permits styling/component overhaul with **zero functional changes** to routes or state logic.

---

## Routes & Page Layer

### Route Map (App.tsx)

| Route               | Page Component          | Purpose                      | Layout     | Metadata?           |
| ------------------- | ----------------------- | ---------------------------- | ---------- | ------------------- |
| `/`                 | HomePage                | Marketing home               | PageLayout | BaseLayout defaults |
| `/download`         | DownloadPage            | Platform-specific installers | PageLayout | Custom title/desc   |
| `/pricing`          | PricingPage             | Subscription plans           | PageLayout | Custom title/desc   |
| `/privacy`          | PrivacyPage (LegalPage) | Privacy policy               | PageLayout | Custom title/desc   |
| `/terms`            | TermsPage (LegalPage)   | Terms of service             | PageLayout | Custom title/desc   |
| `/refund`           | RefundPage (LegalPage)  | Refund policy                | PageLayout | Custom title/desc   |
| `/auth/confirmed`   | AuthConfirmedPage       | Post-email-verification      | PageLayout | Custom title/desc   |
| `/checkout/success` | CheckoutSuccessPage     | Post-Polar payment           | PageLayout | Custom title/desc   |
| `/checkout/cancel`  | CheckoutCancelPage      | Cancelled payment            | PageLayout | Custom title/desc   |
| `/legal`            | LegalPage (wrapper)     | Generic legal page           | PageLayout | Custom title/desc   |
| `*`                 | NotFoundPage            | 404 fallback                 | PageLayout | Custom title/desc   |

**Metadata Origin:** Each page calls `BaseLayout` with `title` and `description` props (see BaseLayout for mechanism).

---

## Layout Layer

### BaseLayout (src/layouts/BaseLayout.tsx)

**Responsibility:** Manage document metadata (title, meta tags, canonical URL, OG tags).

**How it works:**

- Takes optional `title`, `description` props
- Has hardcoded English defaults (also i18n-aware)
- On mount, updates `document.title`, `<meta>` tags (name/property)
- Manages canonical URL from React Router location
- No visual rendering; returns `{children}`

**Metadata Lifecycle:**

```
Page (title, desc props)
  ↓
BaseLayout (useEffect + meta tag updates)
  ↓
document.head (meta, og:, twitter:, canonical link)
```

**Used by:** All 11 page components (wraps the entire page tree)

**Styling:** None (no CSS module)

**i18n integration:** Uses `useIntl()` for default title/desc fallbacks

---

### PageLayout (src/layouts/PageLayout.tsx)

**Responsibility:** Visual page wrapper (header, footer, content container).

**Structure:**

```
<div className={styles.page}>
  <SiteHeader />
  <div className={styles.headerSpacer} />
  <main className={mainClasses}>{children}</main>
  <SiteFooter />
</div>
```

**Props:**

- `children`: Page content (sections)
- `mainClassName?`: Optional extra CSS class for `<main>`

**Used by:** All 11 page components (inside BaseLayout)

**Styling:** `src/styles/page.module.css` (comprehensive global-like styles; see Style Ownership section)

**Key Style Declarations in page.module.css:**

- `.page`: Root flex container, color vars, layout gap (64px)
- `.header`: Sticky header bar (backdrop blur, border, shadow)
- `.nav`, `.navLink`: Navigation links & hover
- `.headerActions`, `.langToggle`: Language toggle, sign-in button
- `.mobileMenuButton`, `.mobileMenuPanel`, `.mobileNav`: Mobile menu (display:none on desktop)
- `.primaryButton`, `.secondaryButton`, `.ghostButton`: Button variants
- `.splitSection`, `.splitContent`, `.splitMedia`: Two-column showcase sections
- `.badge`, `.inlineButton`: Utility styles

---

## Section Layer (Page Composition)

**Pattern:** Each home/marketing section is a reusable component. HomePage composes 6 sections.

### HomePage (src/pages/HomePage.tsx)

```tsx
<BaseLayout>
  <PageLayout>
    <HeroSection />
    <AppsCarousel />
    <SpeedShowcase />
    <PrivacyShowcase />
    <TextCleanupShowcase />
    <OfflineShowcase />
    <PricingSection />
  </PageLayout>
</BaseLayout>
```

### Section Components

| Component               | File                                       | Purpose                                          | Styling                     | i18n                      | State                                              |
| ----------------------- | ------------------------------------------ | ------------------------------------------------ | --------------------------- | ------------------------- | -------------------------------------------------- |
| **HeroSection**         | components/hero/hero-section.tsx           | Title, subtitle, primary CTA, platform icons     | hero.module.css             | FormattedMessage          | None                                               |
| **AppsCarousel**        | components/apps-carousel/apps-carousel.tsx | Looping app icon carousel (2 rows)               | apps-carousel.module.css    | FormattedMessage (1)      | None                                               |
| **SpeedShowcase**       | components/speed-showcase/index.tsx        | Side-by-side keyboard vs. voice demo             | speed-showcase.module.css   | FormattedMessage, useIntl | State: displayedText, pressedKeyIndex, animationId |
| **PrivacyShowcase**     | components/privacy-showcase/index.tsx      | Privacy lock icon + copy                         | page.module.css             | FormattedMessage          | None                                               |
| **TextCleanupShowcase** | components/text-cleanup-showcase/index.tsx | Cleanup animation + copy                         | page.module.css             | FormattedMessage          | None                                               |
| **OfflineShowcase**     | components/offline-showcase/index.tsx      | Wifi icon (disabled) + copy                      | offline-showcase.module.css | FormattedMessage          | None                                               |
| **PricingSection**      | components/pricing-section/index.tsx       | Pricing cards, billing toggle, subscribe buttons | pricing-section.module.css  | FormattedMessage, useIntl | State: isYearly, checkoutLoading                   |

### DownloadPage Layout

**Structure:** Dedicated page for installers per platform.

| Component               | File                                 | Purpose                                                                   | Styling         | State                                                         |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------- |
| **DownloadPageContent** | components/download-page-content.tsx | Fetch manifest, render platform-specific downloads, show advanced options | page.module.css | State: platform, manifest, downloads, showAdvanced, isLoading |

**Manifest Fetching:** Calls `fetchReleaseManifest()` from `src/lib/downloads.tsx` (GitHub API).

---

## Component Layer (UI Primitives & Helpers)

### Buttons & CTAs

| Component              | File                                 | Purpose                     | Props                                  | Styling                          |
| ---------------------- | ------------------------------------ | --------------------------- | -------------------------------------- | -------------------------------- |
| **DownloadButton**     | components/download-button.tsx       | Platform-aware download CTA | href?, className?, trackingId?, label? | page.module.css (.primaryButton) |
| **ProSubscribeButton** | pricing-section/index.tsx (internal) | Polar checkout button       | isYearly, className?                   | pricing-section.module.css       |

**DownloadButton Behavior:**

- Detects user platform (macOS/Windows/Linux)
- Detects mobile (disabled, shows "iOS/Android coming soon")
- Responsive label (compact on <640px)
- Calls `trackButtonClick()` if `trackingId` provided
- Navigates to `/download` by default (unless `href` provided)

### Navigation & Layout

| Component       | File                               | Purpose                                                          |
| --------------- | ---------------------------------- | ---------------------------------------------------------------- |
| **SiteHeader**  | components/site-header.tsx         | Sticky navbar with logo, nav links, lang toggle, auth buttons    |
| **SiteFooter**  | components/site-footer.tsx         | Footer with CTA, legal links, copyright                          |
| **SignInModal** | components/sign-in-modal/index.tsx | Modal for OAuth (Google, Kakao) + email/password sign-in/sign-up |

### Icons & Visuals

| Component                | File                                                        | Purpose                               |
| ------------------------ | ----------------------------------------------------------- | ------------------------------------- |
| **SonicWaveform**        | components/hero/sonic-waveform.tsx                          | Animated waveform background in hero  |
| **HeroGraphic**          | components/hero/hero-graphic.tsx                            | Hero section image (likely)           |
| **PrivacyLock**          | components/privacy-lock.tsx                                 | Lock icon for privacy showcase        |
| **TextCleanupAnimation** | components/text-cleanup-showcase/text-cleanup-animation.tsx | Animation showing text cleanup        |
| **LogoMark**             | components/logo-mark.tsx                                    | Vocally logo / app icon               |
| **AppIconShowcase**      | components/app-icon-showcase.tsx                            | Display supported app integrations    |
| **GithubButton**         | components/github-button.tsx                                | Link to GitHub repo                   |
| **ScrollToTop**          | components/scroll-to-top.tsx                                | Scroll behavior hook on route changes |

---

## Cross-Cutting Dependencies

### 1. Internationalization (i18n)

**System:** `react-intl` with hashed IDs (auto-generated from `defaultMessage`).

**Files:**

- `src/i18n/config.ts`: IntlProvider setup, locale detection
- `src/i18n/index.ts`: Exports, locale storage
- `src/i18n/intl.ts`: `getIntl()` utility for non-React contexts
- `src/i18n/locales/en.json`: English strings (auto-generated)
- `src/i18n/locales/es.json`, `fr.json`, etc.: Translated strings
- `src/i18n/manifest.json`: Locale list

**Usage Pattern:**

```tsx
// In components:
import { FormattedMessage, useIntl } from "react-intl";

// For simple copy:
<FormattedMessage defaultMessage="Your keyboard is holding you back." />;

// For dynamic/conditional copy:
const intl = useIntl();
const title = intl.formatMessage({ defaultMessage: "Pricing | Vocally" });
```

**Components Using i18n:**

- All 11 pages (title/description in BaseLayout)
- All 7 section components (copy)
- SiteHeader (nav labels, locale toggle, user menu)
- SiteFooter (legal links)
- SignInModal (form labels, auth copy)
- DownloadButton (platform labels, mobile fallback)
- DownloadPageContent (platform display names)

**Workflow:**

1. Add/edit `defaultMessage` in component
2. Run `npm run i18n:extract` to update `en.json`
3. Run `npm run i18n:sync` to update other locales
4. Translators fill in foreign JSON files

**Blocked Redesign Scenarios:**

- ✅ Change button text: Update `defaultMessage`, re-extract
- ✅ Add new locale: Add file + manifest entry
- ❌ Remove locale: Would require full sync/cleanup
- ❌ Change string hashing scheme: Would break all translated files

---

### 2. Authentication (auth-context.tsx)

**System:** Supabase Auth with context + hooks.

**File:** `src/context/auth-context.tsx`

**Context API:**

```tsx
type AuthContextValue = {
  user: User | null; // Current user (Supabase User type)
  loading: boolean; // Auth state loading
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signInWithEmail: (email, pwd) => Promise<string | null>; // Error msg
  signUpWithEmail: (email, pwd) => Promise<string | null>;
  signOut: () => Promise<void>;
  isSignInModalOpen: boolean; // Modal visibility
  openSignInModal: () => void;
  closeSignInModal: () => void;
};

// Usage:
const { user, signInWithGoogle, openSignInModal } = useAuth();
```

**Components Using Auth:**

- SiteHeader: Shows user avatar/email or "Sign in" button
- SignInModal: Entire modal around signin flows
- PricingSection: `ProSubscribeButton` requires auth (opens modal if not signed in)

**Supabase Integrations:**

- OAuth redirect: `supabase.auth.signInWithOAuth()` (Google, Kakao)
- Email auth: `supabase.auth.signInWithPassword()` / `signUp()`
- Session check: `supabase.auth.getSession()`
- Session listener: `onAuthStateChange()`
- Member init: `supabase.functions.invoke('member-init')`

**Blocked Redesign Scenarios:**

- ✅ Change modal styling: Rewrite sign-in-modal CSS
- ✅ Change button placement: Move auth buttons in header
- ❌ Remove Supabase: Would require new auth backend
- ❌ Change OAuth providers: Would require new Supabase OAuth app config

---

### 3. Download Links & Platform Detection

**System:** Platform detection + manifest fetching from GitHub releases.

**Files:**

- `src/lib/downloads.tsx`: Platform config, manifest fetching, download URL extraction
- `src/components/download-button.tsx`: Platform-aware button

**Platform Config:**

```tsx
type Platform = "mac" | "windows" | "linux";

PLATFORM_CONFIG = {
  mac: { id: "mac", name: "macOS", label: "Download for free", shortLabel: "Download", Icon: ... },
  windows: { ... },
  linux: { ... }
};
```

**Detection:**

- `detectPlatform()`: Checks `navigator.userAgent` to guess macOS/Windows/Linux
- `isMobileDevice()`: Checks mobile user agent, returns disabled button

**Manifest Fetching:**

```tsx
const manifest = await fetchReleaseManifest();
// Fetches: https://github.com/SL-IT-AMAZING/vocally/releases/download/desktop-prod/latest.json
// Returns: { version, notes, pub_date, platforms: { "darwin-aarch64": {...} } }

const downloads = extractDownloads(manifest);
// Groups by platform, filters advanced (GPU, .deb, .rpm)
```

**Components Relying on Downloads:**

- DownloadButton (all pages): Gets platform-specific URL or falls back to `/download`
- DownloadPageContent (DownloadPage): Shows full manifest, allows platform/variant selection
- HeroSection: Shows platform badge icons (macOS, Windows, Linux)

**Blocked Redesign Scenarios:**

- ✅ Change button icon/label: Update PLATFORM_CONFIG or CSS
- ✅ Customize download page layout: Rewrite DownloadPageContent JSX
- ❌ Change GitHub release tag format: Would break manifest parsing
- ❌ Switch to different release host: Would break API URLs

---

### 4. Analytics

**System:** Simple event tracking via Google Analytics / custom tracking.

**File:** `src/utils/analytics.utils.ts`

**Usage:**

- `trackPageView(pathname)`: Called on route change in App.tsx
- `trackButtonClick(trackingId)`: Called on download button clicks (with string ID like "download-hero")

**Blocked Redesign Scenarios:**

- ✅ Change tracking IDs: Update hardcoded strings in components
- ✅ Add tracking to new buttons: Add `trackingId` prop
- ❌ Remove GA: Would lose analytics entirely (requires new system)
- ❌ Change event names: Would break historical data

---

### 5. Supabase Client Integration

**System:** Global Supabase client initialized in `src/lib/supabase.ts`.

**Usage:**

- PricingSection: `supabase.functions.invoke('polar-checkout')` to initiate payment
- AuthContext: All auth operations

**Blocked Redesign Scenarios:**

- ✅ Change Polar product IDs: Update hardcoded UUIDs in PricingSection
- ❌ Change payment provider: Would require new backend integration

---

## Style Ownership & Boundaries

### CSS Module Architecture

| Module                                                    | Owner               | Sections/Components                                             | Scope                                |
| --------------------------------------------------------- | ------------------- | --------------------------------------------------------------- | ------------------------------------ |
| `styles/page.module.css`                                  | Layout system       | Shared across all pages, header, footer, buttons, badge utility | Global utilities + page structure    |
| `styles/global.css`                                       | Global setup        | Reset, fonts, CSS variables (--level0, --text-strong, etc.)     | Root level                           |
| `styles/legal.module.css`                                 | LegalPage           | Legal page specific (markdown article styling)                  | Legal pages (privacy, terms, refund) |
| `components/hero/hero.module.css`                         | HeroSection         | Hero section layout, waveform, buttons                          | Hero only                            |
| `components/apps-carousel/apps-carousel.module.css`       | AppsCarousel        | Carousel rows, icons, animation                                 | Carousel only                        |
| `components/speed-showcase/speed-showcase.module.css`     | SpeedShowcase       | Keyboard pane, voice pane, waveform, pacing                     | Speed showcase only                  |
| `components/pricing-section/pricing-section.module.css`   | PricingSection      | Card grid, toggle, plan cards, features                         | Pricing only                         |
| `components/offline-showcase/offline-showcase.module.css` | OfflineShowcase     | Wifi icon, SVG styling                                          | Offline showcase only                |
| `components/video-section/video-section.module.css`       | VideoSection        | Video embed layout                                              | Video section only                   |
| `components/privacy-lock.module.css`                      | PrivacyLock         | Lock icon animation                                             | Privacy lock only                    |
| `components/sign-in-modal/sign-in-modal.module.css`       | SignInModal         | Modal overlay, form, buttons                                    | Sign-in modal only                   |
| `components/apps-carousel/apps-carousel.module.css`       | AppIconShowcase     | App icon grid                                                   | Icon showcase only                   |
| `pages/auth-confirmed.module.css`                         | Auth/Checkout pages | Success/cancel/confirmed page layout                            | Auth flow pages                      |

### CSS Variable System (page.module.css)

```css
--level0: #000000 /* Darkest bg */ --level1: #1c1c1e --level2: #2c2c2e
  --level3: #3a3a3c /* Lightest bg */ --border: rgba(255, 255, 255, 0.08)
  --shadow: 0 12px 40px rgba(0, 0, 0, 0.5) --shadow-soft: 0 4px 16px
  rgba(0, 0, 0, 0.35) --text-strong: #f5f5f7 /* Primary text */
  --text-muted: #98989d /* Secondary text */
  --brand: (defined elsewhere, likely #0a84ff)
  --brand-hover: (defined elsewhere) --brand-active: (defined elsewhere);
```

### Redesign Clean Points

**Easy to change:**

1. Color scheme: Update CSS variables in `page.module.css` and `global.css`
2. Typography: Update font-family, font-size in `global.css`
3. Button styles: Rewrite `.primaryButton`, `.secondaryButton` rules in `page.module.css`
4. Section layouts: Rewrite component-scoped CSS modules
5. Header/Footer appearance: Modify `.header`, `.footer` in `page.module.css` and layout JSX

**Harder to change:**

1. Component structure: Would require JSX refactoring (but no logic changes)
2. Section composition order: Would require HomePage JSX change (but functional)
3. Page routes: Would require App.tsx change (but no logic impact)

**Blocked by cross-cutting concerns:**

1. i18n extraction/sync workflow: Tied to Babel plugin + npm scripts
2. Auth providers: Supabase OAuth config + email validation
3. Payment flow: Polar product IDs, webhook URLs
4. Download manifest: GitHub release format/location

---

## Copy & Metadata Inventory

### Homepage (HomePage.tsx + 6 sections)

| Section     | Copy Location                                                                  | Type                       | i18n                        |
| ----------- | ------------------------------------------------------------------------------ | -------------------------- | --------------------------- |
| Hero        | HeroSection: h1, subtitle, note                                                | FormattedMessage           | Yes (title, subtitle, note) |
| Hero        | Hero: "More download options" link                                             | FormattedMessage           | Yes                         |
| Apps        | AppsCarousel: badge, h2, subtitle                                              | FormattedMessage           | Yes                         |
| Speed       | SpeedShowcase: badge, h2, p, pane headers                                      | FormattedMessage + useIntl | Yes                         |
| Privacy     | PrivacyShowcase: badge, h2, p                                                  | FormattedMessage           | Yes                         |
| TextCleanup | TextCleanupShowcase: badge, h2, p                                              | FormattedMessage           | Yes                         |
| Offline     | OfflineShowcase: badge, h2, p                                                  | FormattedMessage           | Yes                         |
| Pricing     | PricingSection: header, toggle label, plan names, price, features, CTA buttons | FormattedMessage + useIntl | Yes                         |
| Footer      | SiteFooter: "Ready to stop typing?", legal links, copyright                    | FormattedMessage + useIntl | Yes                         |

### Pricing Page (PricingPage.tsx)

| Element          | Copy                              | Location                    | i18n                  |
| ---------------- | --------------------------------- | --------------------------- | --------------------- | --------- |
| Title            | "Pricing                          | Vocally"                    | BaseLayout title prop | useIntl() |
| Meta description | "Simple, transparent pricing..."  | BaseLayout description prop | useIntl()             |
| Section          | PricingSection (same as HomePage) | PricingSection              | Yes                   |

### Download Page (DownloadPage.tsx + DownloadPageContent)

| Element          | Copy                                    | Location                    | i18n             |
| ---------------- | --------------------------------------- | --------------------------- | ---------------- |
| Title            | "Download Vocally"                      | BaseLayout title prop       | useIntl()        |
| Meta description | "Install Vocally on macOS..."           | BaseLayout description prop | useIntl()        |
| Hero h1          | "Make voice your new keyboard."         | DownloadPageContent         | FormattedMessage |
| Hero subtitle    | "Dictate four times faster..."          | DownloadPageContent         | FormattedMessage |
| Manifest version | "{displayName} {version} (recommended)" | DownloadPageContent         | useIntl()        |
| Section headers  | "Direct installers", "Loading...", etc. | DownloadPageContent         | FormattedMessage |
| Advanced toggle  | "Hide/Show advanced options"            | DownloadPageContent         | FormattedMessage |

### Auth Pages (AuthConfirmedPage, CheckoutSuccessPage, CheckoutCancelPage)

| Page                | Copy                                          | i18n                                       |
| ------------------- | --------------------------------------------- | ------------------------------------------ |
| AuthConfirmedPage   | Title: "Email Confirmed", subtitle, body copy | useIntl() title + FormattedMessage content |
| CheckoutSuccessPage | Title: "Payment Successful", subtitle, CTA    | useIntl() title + FormattedMessage content |
| CheckoutCancelPage  | Title: "Checkout Cancelled", subtitle, link   | useIntl() title + FormattedMessage content |

### Legal Pages (PrivacyPage, TermsPage, RefundPage)

| Page        | Copy                         | Source                    | i18n                        |
| ----------- | ---------------------------- | ------------------------- | --------------------------- |
| PrivacyPage | Title/desc (custom per page) | BaseLayout props          | useIntl()                   |
| TermsPage   | Title/desc (custom per page) | BaseLayout props          | useIntl()                   |
| RefundPage  | Title/desc (custom per page) | BaseLayout props          | useIntl()                   |
| Content     | Markdown HTML                | `content/` Markdown files | Markdown (not i18n managed) |

### Not-Found Page (NotFoundPage)

| Element  | Copy                           | i18n             |
| -------- | ------------------------------ | ---------------- |
| Heading  | "Page not found"               | FormattedMessage |
| Subtitle | "We couldn't find the page..." | FormattedMessage |
| Link     | "Return home"                  | FormattedMessage |

---

## Data & State Management

### App-Level State

**System:** None in web app. This is a **stateless marketing site** with no Zustand store.

### Local Component State

| Component           | State Vars                                                       | Purpose                                 |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| SiteHeader          | `isMobileMenuOpen`, `showUserMenu`, `locale`                     | Mobile menu toggle, user menu, language |
| SpeedShowcase       | `displayedText`, `pressedKeyIndex`, wave refs, script refs       | Animation state for keyboard demo       |
| PricingSection      | `isYearly`                                                       | Monthly vs yearly toggle                |
| ProSubscribeButton  | `checkoutLoading`                                                | Submit state during Polar redirect      |
| SignInModal         | `mode`, `email`, `password`, `error`, `success`, `submitting`    | Form state for sign-in/sign-up          |
| DownloadPageContent | `platform`, `manifest`, `downloads`, `isLoading`, `showAdvanced` | Manifest fetch state, UI toggles        |
| SpeedShowcase       | (3 wave refs)                                                    | SVG waveform animation                  |

### External State (Auth Context)

**Managed by:** `AuthContext` (from `context/auth-context.tsx`)

```tsx
user: User | null;
loading: boolean;
isSignInModalOpen: boolean;
```

**Subscriptions:**

- `supabase.auth.onAuthStateChange()`: Listens for login/logout
- `supabase.auth.getSession()`: Fetches current session on mount

---

## Functional Logic & Integrations

### Download Flow

```
User clicks DownloadButton
  ↓
Detect platform (macOS/Windows/Linux)
  ↓
Navigate to /download OR direct download link
  ↓
(If /download:)
  Fetch manifest from GitHub API
  Group downloads by platform
  Render all available variants (CPU, GPU, .deb, .rpm)
  Allow filter by platform + advanced
```

### Sign-In Flow

```
User clicks "Sign in" button
  ↓
SignInModal opens (via auth context)
  ↓
User chooses: Google OAuth | Kakao OAuth | Email/Password
  ↓
OAuth: supabase.auth.signInWithOAuth() → Redirects to provider → Redirects back
Email: supabase.auth.signInWithPassword() → Returns error or success
  ↓
Auth state updates → user context updated → header re-renders with user avatar
```

### Payment Flow

```
User clicks "Get Pro" (PricingSection)
  ↓
Check auth: if not signed in, open SignInModal
  ↓
User signed in: Call supabase.functions.invoke('polar-checkout', { productId, locale })
  ↓
Polar Edge Function returns { checkoutUrl }
  ↓
window.location.href = checkoutUrl (redirect to Polar)
  ↓
User completes payment on Polar
  ↓
Polar redirects to /checkout/success or /checkout/cancel
```

### Analytics Tracking

```
Page load → trackPageView(pathname) → GA event
Button click → trackButtonClick(trackingId) → GA event
```

---

## Redesign Readiness Assessment

### Green Light (Safe to Change)

✅ **All CSS/styling** (module-scoped, no side effects)  
✅ **Component visual structure** (JSX structure, not logic)  
✅ **Button labels/copy** (i18n managed, no code logic)  
✅ **Layout arrangement** (sections can be reordered in HomePage)  
✅ **Color scheme** (CSS variables)  
✅ **Typography** (font settings)  
✅ **Icon set** (replace SVG sources)  
✅ **Animation timing** (CSS/JS timing values)  
✅ **Responsive breakpoints** (media queries in CSS)

### Yellow Light (Test After Changes)

⚠️ **i18n extraction/sync workflow** (requires npm script run after copy changes)  
⚠️ **Component state transitions** (animations, modals, toggles)  
⚠️ **Platform detection logic** (test on all platforms)  
⚠️ **Manifest fetching** (test with actual releases)

### Red Light (Don't Change Without Plan)

❌ **Auth provider** (Supabase OAuth + email config, webhooks)  
❌ **Payment provider** (Polar product IDs, webhook handler)  
❌ **Download manifest format** (GitHub release API)  
❌ **Route structure** (affects external links, bookmarks)  
❌ **i18n system** (Babel plugin, extraction/sync pipeline)

---

## File Tree Summary

```
apps/web/src/
├── pages/                          # 11 routable pages
│   ├── HomePage.tsx                # Section composition root
│   ├── PricingPage.tsx             # Pricing-only page
│   ├── DownloadPage.tsx            # Download-only page
│   ├── PrivacyPage.tsx             # Legal (LegalPage wrapper)
│   ├── TermsPage.tsx               # Legal (LegalPage wrapper)
│   ├── RefundPage.tsx              # Legal (LegalPage wrapper)
│   ├── AuthConfirmedPage.tsx       # Post-email-verification
│   ├── CheckoutSuccessPage.tsx     # Post-payment
│   ├── CheckoutCancelPage.tsx      # Payment cancelled
│   ├── NotFoundPage.tsx            # 404 fallback
│   └── LegalPage.tsx               # Generic legal page template
│
├── layouts/
│   ├── BaseLayout.tsx              # Metadata management (not visual)
│   └── PageLayout.tsx              # Visual page wrapper (header + footer)
│
├── components/
│   ├── site-header.tsx             # Sticky navbar
│   ├── site-footer.tsx             # Footer
│   ├── download-button.tsx         # Platform-aware download CTA
│   ├── sign-in-modal/              # Auth modal
│   │   └── index.tsx
│   ├── hero/                       # Hero section
│   │   ├── hero-section.tsx
│   │   ├── sonic-waveform.tsx
│   │   ├── hero-graphic.tsx
│   │   └── hero.module.css
│   ├── apps-carousel/              # App icons carousel
│   │   ├── apps-carousel.tsx
│   │   └── apps-carousel.module.css
│   ├── speed-showcase/             # Keyboard vs voice demo
│   │   ├── index.tsx
│   │   └── speed-showcase.module.css
│   ├── privacy-showcase/           # Privacy section
│   │   └── index.tsx
│   ├── privacy-lock.tsx            # Lock icon
│   ├── text-cleanup-showcase/      # AI cleanup demo
│   │   ├── index.tsx
│   │   └── text-cleanup-animation.tsx
│   ├── offline-showcase/           # Offline section
│   │   ├── index.tsx
│   │   └── offline-showcase.module.css
│   ├── pricing-section/            # Pricing cards
│   │   ├── index.tsx
│   │   └── pricing-section.module.css
│   ├── download-page-content.tsx   # Download page full layout
│   ├── app-icon-showcase.tsx       # App integrations grid
│   ├── github-button.tsx           # GitHub link
│   ├── logo-mark.tsx              # Logo/icon
│   ├── scroll-to-top.tsx          # Route scroll behavior
│   └── video-section/              # Video embed (if present)
│       └── index.tsx
│
├── styles/
│   ├── page.module.css             # Shared layout + utility styles
│   ├── global.css                  # Reset, fonts, base variables
│   └── legal.module.css            # Legal page styles
│
├── context/
│   └── auth-context.tsx            # Supabase auth provider
│
├── lib/
│   ├── downloads.tsx               # Platform detection, manifest fetching
│   ├── supabase.ts                 # Supabase client init
│   └── markdown.ts                 # Markdown rendering for legal pages
│
├── utils/
│   ├── analytics.utils.ts          # GA tracking
│   ├── string.utils.ts             # String helpers
│   └── perlin.utils.ts             # Perlin noise for animations
│
├── i18n/
│   ├── config.ts                   # IntlProvider setup
│   ├── index.ts                    # Exports, locale storage
│   ├── intl.ts                     # getIntl() for non-React code
│   ├── manifest.json               # Locale list
│   └── locales/
│       ├── en.json                 # English strings (auto-gen)
│       ├── es.json                 # Spanish
│       ├── fr.json                 # French
│       └── ko.json                 # Korean
│
├── App.tsx                         # Route definitions
├── main.tsx                        # React root mount
└── env.d.ts                        # TypeScript env vars
```

---

## Key Takeaways for Redesign

### What Can Be Redesigned Cleanly

1. **All visual design & CSS** — Module-scoped, no shared side effects
2. **Component layout** — JSX structure can change without breaking logic
3. **Typography & colors** — CSS variables make this trivial
4. **Animations & interactions** — Self-contained in component CSS/JS
5. **Hero/section arrangement** — Reorder sections in HomePage without functional impact
6. **Download page layout** — Completely redesign DownloadPageContent JSX

### What Needs Careful Attention

1. **i18n strings** — Must re-extract and sync after copy changes
2. **Auth flow UX** — Modal can be redesigned, but Supabase integration stays
3. **Payment buttons** — Can be restyled, but Polar integration stays
4. **Download detection** — Platform detection is hidden, but manifest structure must remain

### What Must NOT Change (Phase 1)

1. **Route structure** — Breaking `/download`, `/pricing`, etc. breaks existing links
2. **Auth providers** — Would require new Supabase OAuth app, webhook setup
3. **Payment provider** — Would require new Polar account + product IDs
4. **i18n extraction system** — Core part of build pipeline
5. **Supabase integrations** — Auth, functions, storage all tied to one project

---

## Appendix: Boundary Definitions

### Section Component Boundary

A **section component** is a self-contained visual block that:

- Takes no props (or only optional styling props)
- Uses `FormattedMessage` for copy
- Has module-scoped CSS
- Can be reordered/removed from a page without breaking other sections
- Optionally has local state (animations, toggles)

Examples: HeroSection, SpeedShowcase, PricingSection, OfflineShowcase

### Layout Component Boundary

A **layout component** is a wrapper that:

- Provides structural/visual framing
- May manage metadata (BaseLayout) or page shell (PageLayout)
- Composes header/footer (PageLayout) or nothing (BaseLayout)
- Renders `{children}` without transforming them

Examples: BaseLayout, PageLayout

### Page Component Boundary

A **page component** is:

- Routable (referenced in App.tsx Routes)
- Wrapped by `BaseLayout` for metadata
- Wrapped by `PageLayout` for structure
- Composes sections (if marketing page) or single content component (if utility page)

Examples: HomePage (6 sections), PricingPage (1 section), DownloadPage (1 content comp)

### Cross-Cutting Boundary

A **cross-cutting concern** is:

- Used by multiple components/pages
- Not a component itself
- Provides hooks, utilities, or context

Examples: `useAuth()`, `useIntl()`, `trackPageView()`, platform detection

---

**End of Inventory Document**

Generated: February 17, 2026  
Scope: apps/web marketing site + auth/payment funnel  
Status: Complete, ready for redesign planning
