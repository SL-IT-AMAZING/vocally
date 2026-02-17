# Vocally Web — Redesign Quick Reference

**Status:** Ready for visual/UX redesign without functional changes  
**Key Insight:** Clean separation between styling (CSS Modules), structure (components), and logic (auth, downloads, payments)

---

## TL;DR

| Aspect                  | Status     | Why                                                   |
| ----------------------- | ---------- | ----------------------------------------------------- |
| **Redesign styling**    | ✅ Safe    | All CSS is module-scoped, no global conflicts         |
| **Redesign components** | ✅ Safe    | No shared state between sections, pure composition    |
| **Redesign layout**     | ✅ Safe    | Sections are reorderable, HomePage just composes them |
| **Change copy/text**    | ⚠️ Careful | Need to run i18n extraction/sync after                |
| **Change routes**       | ❌ Don't   | Breaks external links, bookmarks, SEO                 |
| **Change auth**         | ❌ Don't   | Tied to Supabase OAuth config + webhooks              |
| **Change payments**     | ❌ Don't   | Tied to Polar product IDs + edge function             |

---

## File You Need to Know

### Entry Points

```
src/App.tsx              ← Routes (DO NOT CHANGE in phase 1)
src/main.tsx             ← React mount point
src/pages/*.tsx          ← 11 routable pages
```

### Layout & Structure

```
src/layouts/BaseLayout.tsx      ← Metadata (title, meta tags)
src/layouts/PageLayout.tsx      ← Visual wrapper (header, footer)
src/components/site-header.tsx  ← Sticky navbar
src/components/site-footer.tsx  ← Footer
```

### Styling (Change These)

```
src/styles/page.module.css      ← CORE: Shared utilities + layout vars
src/styles/global.css           ← CORE: Reset, fonts, CSS variables
src/styles/legal.module.css     ← Legal pages
src/components/*/               ← Each section has its own .module.css
```

### Sections (Compose These)

```
src/components/hero/                    ← Hero + CTA
src/components/apps-carousel/           ← App icons carousel
src/components/speed-showcase/          ← Keyboard vs voice demo
src/components/privacy-showcase/        ← Privacy messaging
src/components/text-cleanup-showcase/   ← AI cleanup demo
src/components/offline-showcase/        ← Offline messaging
src/components/pricing-section/         ← Pricing cards + subscribe
```

### Cross-Cutting (Don't Remove)

```
src/context/auth-context.tsx    ← Supabase auth, required for sign-in
src/lib/supabase.ts             ← Supabase client, required for auth/payments
src/lib/downloads.tsx           ← Platform detection, release manifest, required for downloads
src/i18n/                       ← react-intl setup, required for translations
src/utils/analytics.utils.ts    ← GA tracking, can be optional
```

---

## Copy Locations (Text to Update)

### All Copy Uses `<FormattedMessage>`

Every user-visible string is wrapped:

```tsx
<FormattedMessage defaultMessage="Your keyboard is holding you back." />
```

**How to update:**

1. Edit `defaultMessage` value
2. Run: `npm run i18n:extract` (from apps/web)
3. Run: `npm run i18n:sync` to propagate to es.json, fr.json, ko.json
4. Translators update foreign JSON files

### Copy by Page

| Page                 | Component               | Copy                                                            |
| -------------------- | ----------------------- | --------------------------------------------------------------- |
| Home                 | HeroSection             | Title, subtitle, platform note                                  |
| Home                 | AppsCarousel            | Badge, heading, subtitle                                        |
| Home                 | SpeedShowcase           | Badge, heading, p, pane headers                                 |
| Home                 | PrivacyShowcase         | Badge, heading, p                                               |
| Home                 | TextCleanupShowcase     | Badge, heading, p                                               |
| Home                 | OfflineShowcase         | Badge, heading, p                                               |
| Home                 | PricingSection          | All pricing copy, feature names, CTA text                       |
| Home                 | SiteHeader              | Nav links ("Demo", "Purpose", "Security", "Pricing"), "Sign in" |
| Home                 | SiteFooter              | "Ready to stop typing?", legal links                            |
| Download             | DownloadPageContent     | Hero, manifest version, section headers                         |
| Pricing              | (PricingSection)        | Same as Home pricing                                            |
| Privacy/Terms/Refund | LegalPage               | Markdown files in `content/` (NOT i18n managed)                 |
| Auth pages           | AuthConfirmedPage, etc. | Confirmation messages                                           |

---

## Component Structure (What to Change/Keep)

### Safe to Redesign

```tsx
// ✅ Can redesign completely
<div className={styles.heroSection}>
  <h1>{title}</h1>
  <p>{subtitle}</p>
  <button>{cta}</button>
</div>

// ✅ Can reorder sections
<>
  <HeroSection />
  <AppsCarousel />
  <SpeedShowcase />  ← Can move here
  <PricingSection /> ← Can move here
</>

// ✅ Can change styling
.card {
  border: 1px solid var(--border);  ← Update color
  padding: 24px;                    ← Update spacing
  border-radius: 8px;               ← Update corner radius
}
```

### Must Preserve (Functional)

```tsx
// ❌ Don't remove these hooks
const { user, openSignInModal } = useAuth();  // Required for auth UI
const intl = useIntl();                         // Required for i18n

// ❌ Don't move these
<BaseLayout title={...} description={...}>     // Required for SEO
<PageLayout>                                    // Required for header/footer

// ❌ Don't rename these
const platform = detectPlatform();             // Required for download button
const manifest = await fetchReleaseManifest(); // Required for download page
```

---

## Common Redesign Tasks

### Task 1: Change Button Colors

**Old:**

```css
.primaryButton {
  background: var(--brand);
  color: var(--primary-button-fg);
}
```

**New:**

```css
.primaryButton {
  background: #ff6b35; /* Your new color */
  color: white;
}

.primaryButton:hover {
  background: #e55a24; /* Darker shade */
}
```

**Files to edit:** `src/styles/page.module.css`  
**Test:** Click all download/subscribe buttons on all pages

---

### Task 2: Change Hero Text

**Old:**

```tsx
// src/components/hero/hero-section.tsx
<h1>
  <FormattedMessage defaultMessage="Your keyboard is holding you back." />
</h1>
```

**New:**

```tsx
<h1>
  <FormattedMessage defaultMessage="Speak faster, write better." />
</h1>
```

**Files to edit:** `src/components/hero/hero-section.tsx`  
**Then run:**

```bash
npm run i18n:extract    # Update en.json
npm run i18n:sync       # Sync to es.json, fr.json, ko.json
```

---

### Task 3: Redesign Pricing Cards

**Old:**

```tsx
// src/components/pricing-section/index.tsx
<div className={`${styles.card} ${plan.popular ? styles.popular : ""}`}>
  {/* Price, features, button */}
</div>
```

**New:**

```tsx
// Keep all logic/state/functionality the same
// Rewrite just the JSX structure and styles

<div className={styles.card}>
  {/* Your new design here */}
  {/* But keep: plan.name, plan.features, pricing state logic */}
</div>
```

**Files to edit:**

- `src/components/pricing-section/index.tsx` (JSX)
- `src/components/pricing-section/pricing-section.module.css` (styles)

**Test:**

- Click "Monthly" / "Yearly" toggle
- Click "Subscribe" button (should open checkout)
- Click "Download free" button (should navigate to /download)

---

### Task 4: Reorder Sections on HomePage

**Old:**

```tsx
// src/pages/HomePage.tsx
<HeroSection />
<AppsCarousel />
<SpeedShowcase />
<PrivacyShowcase />
<TextCleanupShowcase />
<OfflineShowcase />
<PricingSection />
```

**New:**

```tsx
<HeroSection />
<PricingSection />     ← Moved up
<SpeedShowcase />
<AppsCarousel />       ← Moved down
<PrivacyShowcase />
<TextCleanupShowcase />
<OfflineShowcase />
```

**Files to edit:** `src/pages/HomePage.tsx`  
**Test:** Sections should display in new order, all CTAs functional

---

### Task 5: Change Font Family

**Old:**

```css
/* src/styles/global.css */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ...;
}
```

**New:**

```css
@import url("https://fonts.googleapis.com/css2?family=Geist+Mono&display=swap");

body {
  font-family: "Geist Mono", monospace;
}
```

**Files to edit:** `src/styles/global.css`  
**Test:** All text should use new font across all pages

---

## Testing Checklist After Redesign

### Core Functionality

- [ ] **Homepage loads** without errors
- [ ] **Download page loads** and fetches releases
- [ ] **Pricing page loads** with pricing data
- [ ] **All legal pages load** (privacy, terms, refund)
- [ ] **404 page displays** for invalid routes

### Navigation

- [ ] **All nav links work** (Demo, Purpose, Security, Pricing)
- [ ] **Logo link returns home**
- [ ] **Language toggle switches locale** (EN ↔ 한국어)
- [ ] **Mobile menu opens/closes** on small screens

### Authentication

- [ ] **"Sign in" button opens modal** (not signed in)
- [ ] **Google OAuth button works** (redirects to Google)
- [ ] **Kakao OAuth button works** (redirects to Kakao)
- [ ] **Email/password form works** (can sign up, sign in)
- [ ] **User avatar shows email** (when signed in)
- [ ] **"Sign out" button logs out**

### Downloads

- [ ] **Download button detects platform** (macOS/Windows/Linux)
- [ ] **Download button disabled on mobile** (shows "coming soon")
- [ ] **"More download options" navigates to /download**
- [ ] **/download page fetches manifest** from GitHub
- [ ] **Platform variants display correctly**
- [ ] **Advanced options toggle shows/hides**
- [ ] **Download links point to real files**

### Payments

- [ ] **"Subscribe" button (Pro plan) requires sign-in** (opens modal if not signed in)
- [ ] **Monthly/Yearly toggle changes price**
- [ ] **"Get Pro" button redirects to Polar** checkout (signed in)
- [ ] **Monthly button shows correct price** ($5)
- [ ] **Yearly button shows correct price** ($50)
- [ ] **Personal plan "Download" button navigates to /download**

### Internationalization

- [ ] **All copy is translatable** (uses FormattedMessage)
- [ ] **Language toggle switches English ↔ Korean** without reload
- [ ] **i18n:extract runs without errors**
- [ ] **i18n:sync propagates strings to all locales**

### Analytics

- [ ] **Page views tracked** (check GA)
- [ ] **Button clicks tracked** with correct tracking ID

### Visual/CSS

- [ ] **No console errors**
- [ ] **No styling shifts** on page load
- [ ] **Buttons have hover states**
- [ ] **Modal closes on Escape key**
- [ ] **Animations are smooth** (no jank)
- [ ] **Responsive on mobile, tablet, desktop**

---

## Dependencies You Can't Remove

| Module                  | Used By                                 | Required For                 |
| ----------------------- | --------------------------------------- | ---------------------------- |
| `react-intl`            | All pages/components                    | Text rendering, i18n         |
| `react-router-dom`      | App.tsx                                 | Routing, navigation          |
| `@supabase/supabase-js` | auth-context, pricing-section           | Auth, payments               |
| `pages.module.css`      | All layouts/sections                    | Layout, colors, buttons      |
| `auth-context.tsx`      | SiteHeader, SignInModal, PricingSection | User state, sign-in          |
| `lib/downloads.tsx`     | DownloadButton, DownloadPageContent     | Platform detection, releases |

**DO NOT remove or significantly refactor these without updating dependent components.**

---

## Build & Deploy

### Local Development

```bash
cd apps/web

# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Check types
npm run check-types

# Lint
npm run lint

# Update translations
npm run i18n:extract
npm run i18n:sync
```

### Production Build

```bash
# Build
npm run build

# Output in dist/ (static files for Vercel)

# Preview locally
npm run preview
```

### Environment Variables (`.env.local`)

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Key Decision Points

### Before Styling Changes

**Q: Can I change this component's visual design?**  
A: Yes, if it only affects CSS. NO if you need to change React hooks/state.

### Before Copy Changes

**Q: Will I need to update translations?**  
A: Yes. Every text change requires `npm run i18n:extract` + `npm run i18n:sync`.

### Before Restructuring

**Q: Can I remove `<BaseLayout>` or `<PageLayout>`?**  
A: NO. BaseLayout manages SEO metadata. PageLayout renders header/footer.

### Before Removing Components

**Q: Can I delete `auth-context.tsx`?**  
A: NO. Required for sign-in modal and payment button functionality.

### Before Removing Files

**Q: Can I delete `src/lib/downloads.tsx`?**  
A: NO. Required for all download buttons and /download page.

---

## Performance Considerations

**Current State:**

- Mostly stateless components (fast renders)
- CSS Modules (no global conflicts, easy tree-shaking)
- i18n: String matching at runtime (minimal overhead)
- Auth: Lazy-loaded Supabase client (on demand)
- Manifest: Fetched once per session (cached)

**When Redesigning, Avoid:**

- ❌ Adding lots of event listeners (use event delegation)
- ❌ Large animations without RAF/transitions
- ❌ N+1 API calls (manifest is fetched once)
- ❌ Inline styles (use CSS modules)
- ❌ Global CSS variables (use CSS module imports)

---

## Common Gotchas

### Gotcha 1: Forgot to Run i18n:sync

**Problem:** English text changes, but Spanish/Korean/French still show old text.  
**Fix:** Run `npm run i18n:sync` after each copy edit.

### Gotcha 2: Styling Applies Globally

**Problem:** Edited `.button { ... }` in page.module.css, now all buttons changed.  
**Fix:** Only edit **component-scoped CSS** if you want local changes. Use class names to target specific buttons.

### Gotcha 3: Download Button Links to /download

**Problem:** Clicked download button, expected direct download, got redirected.  
**Fix:** Most download buttons navigate to `/download` page (for platform selection). Only direct links skip this (rare).

### Gotcha 4: Pricing Section Requires Auth

**Problem:** Clicked "Subscribe", modal opened instead of checkout.  
**Fix:** User must be signed in. Click "Sign in" first, then try "Subscribe" again.

### Gotcha 5: Manifest Not Fetching

**Problem:** /download page shows "Loading..." forever.  
**Fix:** GitHub API rate limit or no releases published. Check GitHub releases exist at: `https://api.github.com/repos/SL-IT-AMAZING/vocally/releases`.

---

## Next Steps

1. **Review this inventory** with your design team
2. **Identify CSS changes** you want to make (colors, fonts, spacing)
3. **Identify component restructuring** you want (reorder sections, redesign cards)
4. **Create design mockups** showing:
   - Color scheme
   - Typography (font sizes, weights)
   - Layout (grid, spacing, breakpoints)
   - New section designs
5. **Plan implementation tasks**:
   - Update global.css (fonts, variables)
   - Update page.module.css (colors, shared styles)
   - Update section component CSS (hero, pricing, etc.)
   - Update section component JSX (if structure changes)
   - Run i18n:extract + i18n:sync for copy changes
6. **Test thoroughly** using checklist above
7. **Deploy to Vercel** (auto-deploys on push to main)

---

**Questions?** Refer back to the full architecture inventory for detailed explanations.
