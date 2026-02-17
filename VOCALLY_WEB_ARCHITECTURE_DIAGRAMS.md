# Vocally Web Architecture — Visual Diagrams

---

## 1. Component Hierarchy Diagram

```
App.tsx (Routes)
  ↓
Browser location
  ↓
Route → Page Component (1 of 11)
  ↓
┌─────────────────────────────────────┐
│ BaseLayout                          │  ← Manages metadata
│ (title, description, meta tags)     │     (no visual output)
│  │                                   │
│  └─→ PageLayout                      │  ← Visual wrapper
│       (header, footer, spacing)      │
│       │                              │
│       └─→ Page content               │
│            (sections or content)     │
│                                      │
└─────────────────────────────────────┘
```

### Example: HomePage Flow

```
HomePage.tsx
  ↓
BaseLayout(title=default, description=default)
  ↓
PageLayout()
  ├── SiteHeader (sticky navbar)
  ├── SiteFooter (fixed bottom)
  └── <main>
        ├── HeroSection
        ├── AppsCarousel
        ├── SpeedShowcase
        ├── PrivacyShowcase
        ├── TextCleanupShowcase
        ├── OfflineShowcase
        └── PricingSection
```

### Example: DownloadPage Flow

```
DownloadPage.tsx
  ↓
BaseLayout(title="Download Vocally", description="Install on...")
  ↓
PageLayout()
  ├── SiteHeader
  ├── SiteFooter
  └── <main>
        └── DownloadPageContent
              ├── Hero heading
              ├── Manifest fetcher
              ├── Platform selector
              ├── Download variants grid
              └── Advanced options toggle
```

---

## 2. Data Flow Architecture

### 2A. Page Rendering Flow

```
┌──────────────────────────────────────────┐
│ User navigates to route                  │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ App.tsx checks <Routes>                  │
│ Renders matching page component          │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Page component renders:                  │
│ <BaseLayout title={} description={}>     │
│   <PageLayout>                           │
│     <Sections...>                        │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ BaseLayout.useEffect() updates:          │
│  • document.title                        │
│  • <meta name="description">             │
│  • <meta property="og:*">                │
│  • <link rel="canonical">                │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ PageLayout renders:                      │
│  • <SiteHeader> (sticky, auth-aware)    │
│  • <main> {children}                     │
│  • <SiteFooter>                          │
└──────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Sections render (stateless or anim)      │
│ • Hero, Carousel, Speed, etc.            │
│ Analytics trackPageView() fires          │
└──────────────────────────────────────────┘
```

### 2B. Authentication State Flow

```
┌──────────────────────────────────────┐
│ App mounts                           │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ AuthProvider (context/auth-context)  │
│ Calls: supabase.auth.getSession()    │
│ Subscribes: onAuthStateChange()      │
└──────────────────────────────────────┘
         ↓
         ┌─────────────────────────────┐
         │ Session exists?             │
         └─────────────────────────────┘
              ↙                ↘
        YES                     NO
         ↙                       ↘
    ┌─────────┐             ┌──────────┐
    │user obj │             │user=null │
    └─────────┘             └──────────┘
         ↓                       ↓
    ┌──────────────────┐   ┌───────────────┐
    │ SiteHeader shows:│   │ SiteHeader    │
    │ user.email[0]    │   │ shows: "Sign  │
    │ User menu        │   │ in" button    │
    │ Sign out button  │   │               │
    └──────────────────┘   └───────────────┘
         ↓                       ↓
    ┌──────────────────┐   ┌────────────────┐
    │ PricingSection:  │   │ PricingSection:│
    │ "Subscribe" btn  │   │ "Get Started"  │
    │ calls checkout   │   │ opens modal    │
    └──────────────────┘   └────────────────┘
```

### 2C. Internationalization Flow

```
┌────────────────────────────────────┐
│ Component written with:            │
│ <FormattedMessage                  │
│   defaultMessage="Your text"       │
│ />                                 │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ Babel plugin (build-time):         │
│ Converts to:                       │
│ <FormattedMessage                  │
│   id="your_text" />                │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ npm run i18n:extract:              │
│ Builds en.json with ID → message   │
│ {                                  │
│   "your_text": "Your text"         │
│ }                                  │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ npm run i18n:sync:                 │
│ Copies IDs to es.json, fr.json,    │
│ ko.json (preserves translations)   │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ Translators edit foreign JSON:     │
│ "your_text": "Tu texto" (Spanish)  │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│ Runtime (react-intl):              │
│ User locale = "es"                 │
│ Renders: "Tu texto"                │
└────────────────────────────────────┘
```

### 2D. Download Flow

```
┌──────────────────────────────────┐
│ User clicks Download Button       │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ detectPlatform() checks:          │
│ navigator.userAgent              │
│ → "mac" | "windows" | "linux"    │
└──────────────────────────────────┘
         ↓
    ┌────────────────────────────┐
    │ isMobileDevice()?           │
    └────────────────────────────┘
         ↙            ↘
       YES             NO
        ↙               ↘
   ┌────────┐    ┌─────────────────┐
   │Disabled│    │href provided?   │
   │button  │    └─────────────────┘
   └────────┘         ↙         ↘
              YES              NO
               ↙                ↘
        ┌──────────┐      ┌─────────────┐
        │Direct    │      │Navigate to  │
        │download  │      │/download    │
        └──────────┘      └─────────────┘
         ↓                 ↓
    User browser        ┌──────────────────┐
    downloads           │DownloadPageContent
    .dmg/.exe/.tar      ├─ fetchManifest()
                        ├─ GitHub API call
                        ├─ Parse JSON
                        ├─ extractDownloads()
                        ├─ Group by platform
                        └─ Render variants
```

### 2E. Sign-In / Payment Flow

```
┌──────────────────────────────────────┐
│ User clicks "Get Pro" in Pricing     │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ ProSubscribeButton.handleSubscribe()  │
└──────────────────────────────────────┘
         ↓
┌──────────────────────────────────────┐
│ Check: user exists?                  │
└──────────────────────────────────────┘
         ↙              ↘
      NO                YES
       ↙                 ↘
  ┌──────────┐      ┌─────────────────┐
  │openSignIn│      │Call supabase    │
  │Modal()   │      │functions.invoke │
  └──────────┘      │('polar-checkout'
       ↓            │{ productId })
  SignInModal       └─────────────────┘
  opens                   ↓
   ↓                 Get checkoutUrl
  ┌──────────┐       from Polar
  │User picks │       ↓
  │Google/    │      window.location.href
  │Kakao/     │      = checkoutUrl
  │Email      │       ↓
  └──────────┘    Polar hosted checkout
   ↓              (user fills payment)
User signs in          ↓
   ↓              Polar redirects to:
Auth updated      /checkout/success
   ↓              OR
Header re-        /checkout/cancel
renders w/user       ↓
   ↓            CheckoutSuccessPage OR
Context           CheckoutCancelPage
subscribes to      ↓
new user       Shows confirmation
   ↓               or retry message
Can now
checkout
```

---

## 3. File Dependency Graph

### Pages (Leaf Nodes)

```
HomePage
  ├── BaseLayout (metadata)
  ├── PageLayout (structure)
  ├── HeroSection
  │   ├── DownloadButton
  │   ├── SonicWaveform (SVG animation)
  │   └── hero.module.css
  ├── AppsCarousel
  │   └── apps-carousel.module.css
  ├── SpeedShowcase
  │   ├── DownloadButton
  │   ├── fractalNoise1d (perlin utils)
  │   └── speed-showcase.module.css
  ├── PrivacyShowcase
  │   └── PrivacyLock
  ├── TextCleanupShowcase
  │   ├── DownloadButton
  │   ├── TextCleanupAnimation
  │   └── page.module.css
  ├── OfflineShowcase
  │   └── offline-showcase.module.css
  └── PricingSection
      ├── useAuth() → auth-context
      ├── supabase client
      ├── DownloadButton
      └── pricing-section.module.css

DownloadPage
  ├── BaseLayout
  ├── PageLayout
  └── DownloadPageContent
      ├── downloads.tsx (platform config, manifest fetch)
      ├── analytics.utils.ts (trackButtonClick)
      ├── DownloadButton
      └── page.module.css

PricingPage
  ├── BaseLayout
  ├── PageLayout
  └── PricingSection (same as on HomePage)

PrivacyPage / TermsPage / RefundPage (Legal pages)
  ├── BaseLayout
  ├── PageLayout
  ├── LegalPage (markdown renderer)
  │   └── markdown.ts (getMarkdownContent)
  └── legal.module.css

AuthConfirmedPage / CheckoutSuccessPage / CheckoutCancelPage
  ├── BaseLayout
  ├── PageLayout
  ├── DownloadButton (optional)
  └── auth-confirmed.module.css

NotFoundPage
  ├── BaseLayout
  └── PageLayout
```

### Shared Utilities (Used Everywhere)

```
All components that use text:
  ├─ react-intl
  │  ├── FormattedMessage (component)
  │  └── useIntl() (hook)
  └─ i18n/
      ├── config.ts (IntlProvider)
      ├── index.ts (setLocale, detectLocale)
      ├── intl.ts (getIntl for non-React)
      └── locales/ (en.json, es.json, etc)

All pages with auth-aware UI:
  ├─ auth-context.tsx
  │  ├── useAuth() hook
  │  └── AuthProvider wrapper
  └─ lib/supabase.ts (client instance)

All pages with downloads:
  ├─ lib/downloads.tsx
  │  ├── PLATFORM_CONFIG
  │  ├── detectPlatform()
  │  ├── isMobileDevice()
  │  ├── fetchReleaseManifest()
  │  └── extractDownloads()
  └─ utils/analytics.utils.ts
      ├── trackPageView()
      └── trackButtonClick()
```

---

## 4. Styling System Architecture

```
┌─────────────────────────────────────────────┐
│ CSS Variable Root (page.module.css)         │
├─────────────────────────────────────────────┤
│ --level0, --level1, --level2, --level3     │
│ --border, --shadow, --shadow-soft          │
│ --text-strong, --text-muted                │
│ --brand, --brand-hover, --brand-active     │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ page.module.css (Layout System)             │
├─────────────────────────────────────────────┤
│ .page (root flex)                          │
│ .header, .nav, .navLink                    │
│ .footer, .pageMeta, .pageLinks             │
│ .primaryButton, .secondaryButton           │
│ .badge, .inlineButton, .splitSection       │
│ .mobileMenuButton, .mobileMenuPanel        │
└─────────────────────────────────────────────┘
   ↙      ↙      ↙      ↙      ↙
Used by:
  • SiteHeader
  • SiteFooter
  • All section components
  • DownloadButton
  • DownloadPageContent

┌─────────────────────────────────────────────┐
│ Component-Scoped CSS Modules                │
├─────────────────────────────────────────────┤
│ hero.module.css                            │
│   .heroSection, .heroTitle, .heroActions   │
│                                            │
│ apps-carousel.module.css                   │
│   .section, .row, .iconCard, .animation    │
│                                            │
│ speed-showcase.module.css                  │
│   .speedShowcase, .keyboardPane, .waveform│
│                                            │
│ pricing-section.module.css                 │
│   .section, .card, .popular, .toggleButton│
│                                            │
│ offline-showcase.module.css                │
│   .wrapper, .wifiSvg, .arcGradient        │
│                                            │
│ sign-in-modal.module.css                   │
│   .modal, .overlay, .form, .submitButton   │
│                                            │
│ legal.module.css                           │
│   .legalContent, .legalMain                │
│                                            │
│ auth-confirmed.module.css                  │
│   .container, .title, .subtitle, .checkIcon
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ global.css (Foundation)                     │
├─────────────────────────────────────────────┤
│ * { box-sizing: border-box }               │
│ font-family (Inter, etc)                   │
│ body, html resets                          │
│ --brand, --brand-hover definitions         │
└─────────────────────────────────────────────┘
```

---

## 5. State Management Architecture

### No Global State

This web app uses **no Zustand store** (unlike desktop app).

### Local Component State Only

```
Component State Isolation:

SiteHeader         → isMobileMenuOpen, showUserMenu, locale
SpeedShowcase      → displayedText, pressedKeyIndex, wave1/2/3 refs
PricingSection     → isYearly
SignInModal        → mode, email, password, error, success, submitting
DownloadPageContent→ platform, manifest, downloads, isLoading, showAdvanced

Auth State (Shared Context):
AuthContext        → user, loading, isSignInModalOpen
  ↓
Subscribed by:
  • SiteHeader
  • SignInModal
  • PricingSection → ProSubscribeButton
```

---

## 6. Section Composition on HomePage

```
┌───────────────────────────────────────────────────┐
│ HomePage (src/pages/HomePage.tsx)                 │
│                                                   │
│  <BaseLayout>                                     │
│    <PageLayout>                                   │
│      <HeroSection />          ← Entry point        │
│        ├─ "Your keyboard..."                      │
│        ├─ Platform icons                          │
│        └─ "Download", "More options" CTAs         │
│                                                   │
│      <AppsCarousel />          ← Use case         │
│        ├─ "One voice. Every app."                 │
│        ├─ Scrolling app icons (2 rows)            │
│        └─ System-wide compatibility message       │
│                                                   │
│      <SpeedShowcase />         ← Comparison       │
│        ├─ "Your voice outruns..."                 │
│        ├─ Keyboard typing demo (45 wpm)           │
│        ├─ Voice demo (220 wpm)                    │
│        └─ Waveform animation                      │
│                                                   │
│      <PrivacyShowcase />       ← Trust signal     │
│        ├─ "Your data is yours."                   │
│        ├─ Privacy lock icon                       │
│        └─ "Process locally, BYOA, or cloud"       │
│                                                   │
│      <TextCleanupShowcase />   ← Value prop       │
│        ├─ "Auto-correct with AI"                  │
│        ├─ Before/after animation                  │
│        └─ "Speak naturally, we handle the rest"   │
│                                                   │
│      <OfflineShowcase />       ← Feature          │
│        ├─ "No internet? No problem."              │
│        ├─ Wifi-off icon                           │
│        └─ "Never leaves your machine"             │
│                                                   │
│      <PricingSection />        ← CTA              │
│        ├─ "Simple, transparent pricing"           │
│        ├─ Monthly/Yearly toggle                   │
│        ├─ Personal plan card (Free)               │
│        ├─ Pro plan card (Featured)                │
│        │   └─ "Best value" badge                  │
│        ├─ "Subscribe" / "Download" buttons        │
│        └─ Trust signal: "No hidden fees"          │
│                                                   │
│    </PageLayout>                                  │
│  </BaseLayout>                                    │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## 7. Type & Props Flow

```
HomePage.tsx (no props)
  ├─ BaseLayout props:
  │  ├─ title: string (optional, uses default)
  │  └─ description: string (optional, uses default)
  │
  └─ PageLayout props:
     ├─ children: ReactNode
     └─ mainClassName?: string
        └─ (all sections use this)

DownloadButton props (used in multiple places):
  ├─ href?: string (direct download)
  ├─ className?: string (styling)
  ├─ trackingId?: string (analytics ID)
  └─ label?: string (override button text)

PricingSection props (standalone, no props):
  ├─ Internal state: isYearly
  └─ Internal component: ProSubscribeButton
     ├─ isYearly: boolean
     └─ className?: string

SignInModal props (none, pulled from context):
  └─ useAuth() hook:
     ├─ isSignInModalOpen: boolean
     ├─ closeSignInModal: () => void
     ├─ signInWithGoogle: () => Promise<void>
     ├─ signInWithKakao: () => Promise<void>
     ├─ signInWithEmail: (email, pwd) => Promise<string | null>
     └─ signUpWithEmail: (email, pwd) => Promise<string | null>
```

---

## 8. Internationalization Architecture Snapshot

```
Component Write-Time:
────────────────────
SiteHeader.tsx:
  <FormattedMessage defaultMessage="Sign in" />

Build-Time (Babel):
──────────────────
Babel plugin (formatjs) converts to:
  <FormattedMessage id="sign_in" />

Extract-Time (npm run i18n:extract):
────────────────────────────────────
Reads all `defaultMessage` values
Generates: src/i18n/locales/en.json
  {
    "sign_in": "Sign in"
  }

Sync-Time (npm run i18n:sync):
──────────────────────────────
Copies IDs to other locales:
  es.json: { "sign_in": "" }    ← Translator fills
  fr.json: { "sign_in": "" }    ← Translator fills
  ko.json: { "sign_in": "" }    ← Translator fills

Runtime (IntlProvider):
──────────────────────
User locale: "ko"
Loads: locales/ko.json
  { "sign_in": "로그인" }
Renders: "로그인"
```

---

## 9. Cross-Cutting Dependencies Map

```
┌────────────────────────────────────────┐
│ Every Component That Renders Text      │
├────────────────────────────────────────┤
│ DEPENDS ON:                            │
│                                        │
│ react-intl                             │
│  ├─ FormattedMessage (prop-based)      │
│  └─ useIntl() (for dynamic strings)    │
│                                        │
│ i18n/ folder                           │
│  ├─ config.ts (IntlProvider)           │
│  ├─ index.ts (locale helpers)          │
│  └─ locales/ (message catalogs)        │
│                                        │
│ Build process:                         │
│  ├─ npm run i18n:extract               │
│  └─ npm run i18n:sync                  │
│                                        │
│ Affected: ALL 11 pages + 7+ sections   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Components with Auth Logic             │
├────────────────────────────────────────┤
│ DEPENDS ON:                            │
│                                        │
│ auth-context.tsx                       │
│  └─ useAuth() → AuthContext            │
│                                        │
│ lib/supabase.ts                        │
│  └─ supabase client instance           │
│                                        │
│ Supabase project config                │
│  ├─ VITE_SUPABASE_URL env var          │
│  └─ VITE_SUPABASE_ANON_KEY env var     │
│                                        │
│ Affected:                              │
│  • SiteHeader                          │
│  • SignInModal                         │
│  • PricingSection → ProSubscribeButton │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Components with Download Logic         │
├────────────────────────────────────────┤
│ DEPENDS ON:                            │
│                                        │
│ lib/downloads.tsx                      │
│  ├─ PLATFORM_CONFIG                    │
│  ├─ detectPlatform()                   │
│  ├─ fetchReleaseManifest()             │
│  └─ extractDownloads()                 │
│                                        │
│ GitHub API                             │
│  └─ /repos/.../releases/download/..    │
│                                        │
│ analytics.utils.ts                     │
│  └─ trackButtonClick(id)               │
│                                        │
│ Affected:                              │
│  • DownloadButton (all pages)          │
│  • HeroSection                         │
│  • SpeedShowcase                       │
│  • TextCleanupShowcase                 │
│  • DownloadPageContent                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Components with Payment Logic          │
├────────────────────────────────────────┤
│ DEPENDS ON:                            │
│                                        │
│ supabase.functions.invoke()            │
│  ├─ 'polar-checkout' function          │
│  └─ Returns checkoutUrl                │
│                                        │
│ Polar hosted checkout                  │
│  └─ window.location.href = url         │
│                                        │
│ Supabase configuration                 │
│  └─ POLAR_PRODUCT_MONTHLY UUID         │
│  └─ POLAR_PRODUCT_YEARLY UUID          │
│                                        │
│ Affected:                              │
│  • PricingSection → ProSubscribeButton │
└────────────────────────────────────────┘
```

---

**End of Diagrams Document**

Visual reference for understanding data flow, component hierarchy, and dependency boundaries.
