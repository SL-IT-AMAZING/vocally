# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill

## Requirements Summary

- Full visual and motion overhaul of `apps/web` (HomePage and all its sections)
- Korean-first copy: every `defaultMessage` authored in Korean, `ko.json` is source-of-truth
- Wispr-level motion quality: scroll-linked choreography, staggered reveals, physics-based spring curves — adapted as original Vocally motion language (no copy/paste of Wispr designs)
- Clear differentiation from Voquill: no shared layout patterns, color tokens, typography, or motion timing from the upstream fork
- Storybook-first POC workflow: every section built and signed off as an isolated `*-poc.stories.tsx` before touching production components
- Section-by-section sequential delivery with per-phase acceptance criteria
- Existing Storybook (`@storybook/react-vite` 10.x) and i18n (`react-intl` + `babel-plugin-formatjs` with hashed IDs) infrastructure retained

## Scope & Constraints

### In Scope

- `apps/web/src/components/` — all homepage sections (hero, header, footer, download-button, speed-showcase, text-cleanup-showcase, offline-showcase, privacy-showcase, apps-carousel, pricing-section, video-section)
- `apps/web/src/styles/global.css` and `apps/web/src/styles/page.module.css` — design token system
- `apps/web/src/i18n/locales/ko.json` — authoritative Korean copy
- `apps/web/.storybook/preview.tsx` — decorator locale from `en` → `ko`
- `apps/web/src/pages/HomePage.tsx` — final composition
- `apps/web/src/layouts/PageLayout.tsx` — if structural changes needed
- All `*.module.css` files for revamped sections
- All `*-poc.stories.tsx` and production `*.stories.tsx` files

### Out of Scope

- Non-homepage routes (`/download`, `/pricing`, `/privacy`, `/terms`, `/refund`, `/auth/*`, `/checkout/*`)
- Backend/API changes, Supabase, Polar integration code
- Desktop app (`apps/desktop`)
- Shared packages (`packages/*`)
- Content markdown files (`content/`)
- SEO/prerender script changes (unless copy changes require it)

### Technical Constraints

- Must use existing `motion` library (v12.34.1) — no new animation dependencies
- Must use existing `react-intl` with `babel-plugin-formatjs` hashed-ID pipeline
- Must keep `defaultLocale: "ko"` in `manifest.json`
- Must not break `npm run build` (includes `tsc --noEmit` + `vite build` + `prerender.mjs`)
- Storybook v10.x with `@storybook/react-vite` — no framework change
- CSS Modules pattern preserved — no migration to Tailwind/CSS-in-JS
- Font stack: replace Inter with a characterful alternative; keep Pretendard Variable for Korean

---

## Anti-Similarity Guardrails

### Anti-Voquill Checklist (enforce at every phase)

| Dimension       | Voquill Baseline (to avoid)                                            | Vocally Target                                                                                                              |
| --------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Color scheme    | Neutral grays + single blue accent (`#2563eb`)                         | New dual-accent palette (warm + cool); shift primary away from blue-600                                                     |
| Typography      | Inter + system sans-serif                                              | Distinctive display font (e.g., Satoshi, General Sans, or Plus Jakarta Sans) + Pretendard Variable                          |
| Layout rhythm   | Uniform `FadeInSection` wrappers, centered stack, `120px` vertical gap | Asymmetric grid breaks, varied section heights, intentional density shifts                                                  |
| Motion          | Simple `opacity + translateY` fade-in, uniform 0.6s ease               | Spring physics (`motion` library), scroll-velocity-linked parallax, staggered child reveals with `animation-delay` cascades |
| Hero            | Canvas waveform + centered text + download button                      | Full-viewport kinetic typography or abstract particle field + split-panel layout                                            |
| Cards           | Flat `level1` bg + `border` + `shadow-soft`                            | Glassmorphism OR bento-grid with depth layering and hover-lift transforms                                                   |
| Section cadence | Every section same structure: badge → h2 → p → visual                  | Alternating structures: some sections lead with visual, some with data, some with interaction                               |

### Anti-Copy Guardrails for Wispr Inspiration

The goal is to match Wispr's **quality bar** for motion, not its specific designs:

| Wispr Pattern (study)             | What to Extract (principle)                                                       | What NOT to Copy (surface)                                                        |
| --------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Scroll-linked section transitions | Principle: sections morph into each other, not just fade in                       | Do not replicate Wispr's specific background-color-shift-on-scroll effect         |
| Staggered text reveal on hero     | Principle: headline words animate individually with spring physics                | Do not copy Wispr's exact word-by-word timing or font choices                     |
| Hover micro-interactions on cards | Principle: interactive elements respond with depth (scale + shadow + border glow) | Do not copy Wispr's specific glow color or card radius                            |
| Smooth page-load orchestration    | Principle: elements enter in a choreographed sequence with varied delays          | Do not copy Wispr's specific stagger timing or easing curve values                |
| Scroll-velocity parallax          | Principle: background layers move at different rates creating depth               | Implement with `motion`'s `useScroll` + `useTransform`, not Wispr's GSAP approach |

---

## Phase 0: Foundation — Design Tokens, Storybook Locale, Font System

### Tasks

0.1 **Replace Inter with display font**

- File: `apps/web/src/styles/global.css`
- Replace the Google Fonts Inter import with a new display typeface (e.g., Satoshi via Fontshare, General Sans, or Plus Jakarta Sans via Google Fonts)
- Keep Pretendard Variable import unchanged
- Update `body { font-family: ... }` to new display font + Pretendard fallback

  0.2 **Overhaul CSS custom properties (design tokens)**

- File: `apps/web/src/styles/global.css` (`:root` block)
- File: `apps/web/src/styles/page.module.css` (`.page` block)
- Define new color palette: shift from single blue accent to a dual-accent system
- New surface tokens: replace flat `--level0/1/2/3` with richer depth system (subtle gradients, noise textures via `background-image`)
- New motion tokens: `--ease-spring`, `--ease-out-expo`, `--duration-fast`, `--duration-section`
- New spacing tokens: `--section-gap-lg`, `--section-gap-md` replacing hardcoded `120px` / `64px`

  0.3 **Fix Storybook preview locale to Korean**

- File: `apps/web/.storybook/preview.tsx`
- Change `<IntlProvider locale="en" defaultLocale="en" messages={{}}>` to `locale="ko" defaultLocale="ko"` and import `koMessages` from `../src/i18n/locales/ko.json`
- This ensures every POC story renders Korean copy by default

  0.4 **Add Storybook locale switcher decorator** (optional enhancement)

- In `.storybook/preview.tsx`, add a `globalTypes.locale` toolbar selector so stories can toggle `ko` ↔ `en` for visual QA

### File Targets

- `apps/web/src/styles/global.css`
- `apps/web/src/styles/page.module.css`
- `apps/web/.storybook/preview.tsx`

### Acceptance Criteria

- [ ] `npm run storybook` renders existing stories with Korean messages and new fonts
- [ ] `npm run build` passes without errors
- [ ] New color palette has ≥ 2 accent colors, neither of which is `#2563eb`
- [ ] Inter is no longer referenced anywhere in the codebase
- [ ] CSS custom properties for motion easing and spacing are defined

### Verification Commands

```bash
cd apps/web
npm run check-types
npm run build
npm run storybook -- --smoke-test  # exits 0 if Storybook compiles
grep -r "Inter" src/styles/  # should return nothing
```

### Rollback Strategy

- `git stash` or `git checkout -- apps/web/src/styles/ apps/web/.storybook/`

### Definition of Done

- Design token system is in place, Storybook defaults to Korean, font system is updated, build passes.

---

## Phase 1: Hero Section

### Tasks

1.1 **Write Korean-first hero copy**

- Author new `defaultMessage` strings in Korean for headline, subheadline, and CTA
- These replace the current English defaults: `"Stop typing. Start talking."`, `"Vocally turns your voice into text..."`, `"Free forever. No credit card needed."`
- Pattern: `<FormattedMessage defaultMessage="타이핑을 멈추세요. 목소리로 시작하세요." />`

  1.2 **Build hero POC story**

- File: `apps/web/src/components/hero/hero-section-poc.stories.tsx`
- Create `POC Redesign/Hero Section` story with inline styles (following existing POC pattern from `speed-showcase-poc.stories.tsx`)
- Implement: split-panel or asymmetric layout, kinetic typography (headline words animate in with spring physics via `motion`), abstract background (replace canvas SonicWaveform with a new visual — e.g., particle mesh, gradient orb, or SVG morphing)
- Hero must include download CTA and platform badges
- Must NOT resemble Voquill's centered-text-over-canvas pattern

  1.3 **Promote POC to production**

- Update `apps/web/src/components/hero/hero-section.tsx` from POC
- Update `apps/web/src/components/hero/hero.module.css`
- Decide fate of `sonic-waveform.tsx` and `hero-graphic.tsx` — likely deprecated/removed if new visual replaces them
- Update `apps/web/src/components/hero/hero-section.stories.tsx` (production story)

### File Targets

- `apps/web/src/components/hero/hero-section-poc.stories.tsx` (new)
- `apps/web/src/components/hero/hero-section.tsx`
- `apps/web/src/components/hero/hero.module.css`
- `apps/web/src/components/hero/sonic-waveform.tsx` (deprecate or replace)
- `apps/web/src/components/hero/hero-graphic.tsx` (deprecate or replace)
- `apps/web/src/components/hero/hero-section.stories.tsx`

### Acceptance Criteria

- [ ] POC story renders in Storybook with Korean copy, no English visible
- [ ] Hero layout is structurally different from Voquill (not centered-text-on-canvas)
- [ ] At least 3 independent motion sequences on page load (e.g., headline stagger, subtitle fade, CTA slide)
- [ ] Motion uses `motion` library spring/physics curves, not CSS `ease` alone
- [ ] Download button and platform badges remain functional
- [ ] No hardcoded English strings in component (all via `<FormattedMessage>` or `intl.formatMessage`)

### Verification Commands

```bash
cd apps/web
npm run storybook  # visual check Hero POC
npm run check-types
npm run build
grep -rn "defaultMessage=\"[A-Za-z]" src/components/hero/  # flag any English defaults
```

### Rollback Strategy

- POC is isolated in `*-poc.stories.tsx` — production files untouched until explicit promote step
- `git diff apps/web/src/components/hero/` to verify scope

### Definition of Done

- Hero POC approved → promoted to production → old hero visual (SonicWaveform/HeroGraphic) removed or repurposed → Storybook and build pass.

---

## Phase 2: Site Header

### Tasks

2.1 **Write Korean-first header copy**

- Nav link labels: `defaultMessage` in Korean (데모, 속도, 프라이버시, 요금제)
- Note: current nav labels are already translateable via `intl.formatMessage`, but `defaultMessage` values are English. Switch defaults to Korean.
- All aria-labels in Korean

  2.2 **Build header POC story**

- File: `apps/web/src/components/site-header-poc.stories.tsx`
- New header design: break from the current floating pill/bar pattern
- Add entrance animation: header slides or fades into place on page load
- Scroll behavior: header transforms on scroll (e.g., compact mode, background opacity shift)
- Must include: logo, nav links, locale toggle, sign-in, download CTA, mobile menu

  2.3 **Promote POC to production**

- Update `apps/web/src/components/site-header.tsx`
- Update relevant styles in `apps/web/src/styles/page.module.css` (`.header*`, `.nav*`, `.mobile*` selectors)

### File Targets

- `apps/web/src/components/site-header-poc.stories.tsx` (new)
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/components/site-header.stories.tsx`
- `apps/web/src/styles/page.module.css`

### Acceptance Criteria

- [ ] POC story renders header with Korean nav labels and aria-labels
- [ ] Header has visible scroll-linked animation (compact/transparent → solid transition)
- [ ] Mobile menu works and is accessible
- [ ] Locale toggle functional (ko ↔ en)
- [ ] Header layout structurally different from Voquill floating pill

### Verification Commands

```bash
cd apps/web
npm run storybook  # visual check Header POC
npm run check-types
npm run build
```

### Rollback Strategy

- POC isolation; `git checkout -- apps/web/src/components/site-header.tsx apps/web/src/styles/page.module.css`

### Definition of Done

- Header POC approved → promoted → mobile responsive → Storybook + build pass.

---

## Phase 3: Site Footer

### Tasks

3.1 **Write Korean-first footer copy**

- CTA heading, legal links, copyright notice — all `defaultMessage` in Korean

  3.2 **Build footer POC story**

- File: `apps/web/src/components/site-footer-poc.stories.tsx`
- New footer: break from the current card-in-page pattern
- Include a bold CTA section (e.g., full-bleed gradient with download button)
- Scroll-triggered entrance animation
- Legal links row at bottom

  3.3 **Promote POC to production**

- Update `apps/web/src/components/site-footer.tsx`
- Update footer styles in `apps/web/src/styles/page.module.css` (`.footer*`, `.pageMeta*`)

### File Targets

- `apps/web/src/components/site-footer-poc.stories.tsx` (new)
- `apps/web/src/components/site-footer.tsx`
- `apps/web/src/components/site-footer.stories.tsx`
- `apps/web/src/styles/page.module.css`

### Acceptance Criteria

- [ ] Korean copy throughout, no English `defaultMessage`
- [ ] Footer CTA visually distinct from Voquill's card-style footer
- [ ] Download button functional
- [ ] Legal links present and working
- [ ] Entrance animation on scroll

### Verification Commands

```bash
cd apps/web
npm run storybook
npm run check-types
npm run build
```

### Rollback Strategy

- POC isolation; `git checkout -- apps/web/src/components/site-footer.tsx`

### Definition of Done

- Footer POC approved → promoted → responsive → Storybook + build pass.

---

## Phase 4: Download Button

### Tasks

4.1 **Write Korean-first button labels**

- `defaultMessage` for platform labels, mobile fallback, compact labels — all Korean
- Review `apps/web/src/lib/downloads.tsx` for any hardcoded English platform names

  4.2 **Build download button POC story**

- File: `apps/web/src/components/download-button-poc.stories.tsx`
- New button style: align with new design token system
- Add hover micro-interaction (scale + glow + icon animation)
- Loading state: use disabled state with subtle pulse animation (per AGENTS.md: "Use disabled button states for loading instead of changing button text")

  4.3 **Promote POC to production**

- Update `apps/web/src/components/download-button.tsx`
- Update `.primaryButton` styles in `page.module.css`

### File Targets

- `apps/web/src/components/download-button-poc.stories.tsx` (new)
- `apps/web/src/components/download-button.tsx`
- `apps/web/src/components/download-button.stories.tsx`
- `apps/web/src/styles/page.module.css` (button tokens)
- `apps/web/src/lib/downloads.tsx` (audit for hardcoded English)

### Acceptance Criteria

- [ ] Button renders Korean labels by default
- [ ] Hover interaction has perceptible depth change (scale/shadow/glow)
- [ ] Disabled state shows loading pulse, not text change
- [ ] Platform detection still works (macOS/Windows/Linux)
- [ ] Mobile "coming soon" message in Korean

### Verification Commands

```bash
cd apps/web
npm run storybook
npm run check-types
npm run build
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/download-button.tsx apps/web/src/styles/page.module.css`

### Definition of Done

- Download button POC approved → promoted → all states (hover, active, disabled, compact) validated in Storybook.

---

## Phase 5: Showcase Sections (Speed, Text Cleanup, Privacy, Offline, Apps Carousel)

This is the largest phase. Each showcase follows the same sub-workflow:

### Sub-workflow per showcase:

1. **Korean copy** — rewrite `defaultMessage` strings in Korean
2. **POC story** — build `*-poc.stories.tsx` with new layout + motion
3. **Anti-Voquill check** — verify the section layout does NOT follow Voquill's badge→h2→p→visual pattern uniformly
4. **Promote** — update production component + CSS module + production story

### 5A: Speed Showcase

- File: `apps/web/src/components/speed-showcase/`
- Current state: data-first WPM comparison (already shifted from image-based)
- New direction: enhance with animated counter that triggers on scroll-in-view (using `motion`'s `whileInView`), progress bar race animation, more dramatic data visualization
- Korean copy: headline, subtitle, metric labels, highlight text
- POC: `speed-showcase-poc.stories.tsx` already exists — create v2 or update

### 5B: Text Cleanup Showcase

- File: `apps/web/src/components/text-cleanup-showcase/`
- Current state: word-by-word typing animation with cleanup labels
- New direction: Korean demo sentence (replace English "I was... I was thinking, um..."), smoother animation with `motion` instead of raw `setTimeout` chains, more dramatic visual treatment of the cleanup transformation
- POC: `text-cleanup-showcase-poc.stories.tsx` exists — create v2 or update

### 5C: Privacy Showcase

- File: `apps/web/src/components/privacy-showcase/`
- Current state: 3-card grid with SVG icons
- New direction: break the uniform 3-card grid — use asymmetric bento layout or single hero illustration with overlaid data points. Scroll-triggered reveal with staggered children.
- Korean copy: all card titles, descriptions, section heading

### 5D: Offline Showcase

- File: `apps/web/src/components/offline-showcase/`
- Current state: simple 2-row comparison card (cloud vs local)
- New direction: more dramatic visual — animated toggle between "offline" and "online" states, or a visual metaphor (e.g., signal bars animation). Scroll-triggered.
- Korean copy: heading, subtitle, row labels, status text

### 5E: Apps Carousel

- File: `apps/web/src/components/apps-carousel/`
- Current state: static grid of 8 app icons from SimpleIcons CDN
- New direction: actual carousel/marquee animation (infinite scroll), hover interaction on each icon (lift + glow), or a more creative "works everywhere" visualization
- Korean copy: heading, subtitle, badge

### File Targets (aggregate)

- `apps/web/src/components/speed-showcase/` (index.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)
- `apps/web/src/components/text-cleanup-showcase/` (index.tsx, text-cleanup-animation.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)
- `apps/web/src/components/privacy-showcase/` (index.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)
- `apps/web/src/components/offline-showcase/` (index.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)
- `apps/web/src/components/apps-carousel/` (apps-carousel.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)

### Acceptance Criteria (per showcase)

- [ ] Korean `defaultMessage` throughout — zero English defaults in the component
- [ ] POC story renders correctly in Storybook
- [ ] Layout is NOT the same badge→h2→p→visual pattern for all 5 — at least 3 different structural approaches
- [ ] At least one scroll-triggered `motion` animation per section
- [ ] Text cleanup animation uses Korean demo sentence
- [ ] Apps carousel has perceptible motion (marquee, stagger, or interaction)
- [ ] Each section's color usage is consistent with new design tokens

### Verification Commands

```bash
cd apps/web
npm run storybook  # visual check each POC
npm run check-types
npm run build
# Per-section English default check:
grep -rn "defaultMessage=\"[A-Za-z]" src/components/speed-showcase/
grep -rn "defaultMessage=\"[A-Za-z]" src/components/text-cleanup-showcase/
grep -rn "defaultMessage=\"[A-Za-z]" src/components/privacy-showcase/
grep -rn "defaultMessage=\"[A-Za-z]" src/components/offline-showcase/
grep -rn "defaultMessage=\"[A-Za-z]" src/components/apps-carousel/
```

### Rollback Strategy

- Each showcase is independent — rollback per-directory with `git checkout -- apps/web/src/components/{section}/`

### Definition of Done

- All 5 showcase POCs approved → promoted to production → at least 3 distinct layout patterns across the 5 → build passes.

---

## Phase 6: Pricing Section

### Tasks

6.1 **Write Korean-first pricing copy**

- Plan names, descriptions, feature lists, billing labels, trust signal — all `defaultMessage` in Korean
- Pricing values ($0, $5, $50) remain as numbers

  6.2 **Build pricing POC story**

- File: `apps/web/src/components/pricing-section/pricing-section-poc.stories.tsx` (already exists — create v2 or update)
- New direction: more visual pricing comparison (not just two flat cards)
- Add toggle animation between monthly/yearly (smooth morph, not just text swap)
- Card hover interactions with depth
- Trust signal at bottom with subtle animation

  6.3 **Promote POC to production**

- Update `apps/web/src/components/pricing-section/index.tsx`
- Update `apps/web/src/components/pricing-section/pricing-section.module.css`

### File Targets

- `apps/web/src/components/pricing-section/` (index.tsx, _.module.css, _-poc.stories.tsx, \*.stories.tsx)

### Acceptance Criteria

- [ ] Korean copy for all text content
- [ ] Billing toggle has smooth animation
- [ ] Card hover interaction with visible depth change
- [ ] Subscribe button and download button remain functional
- [ ] Pricing cards visually distinct from Voquill flat-card pattern

### Verification Commands

```bash
cd apps/web
npm run storybook
npm run check-types
npm run build
grep -rn "defaultMessage=\"[A-Za-z]" src/components/pricing-section/
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/pricing-section/`

### Definition of Done

- Pricing POC approved → promoted → functional subscribe flow preserved → build passes.

---

## Phase 7: HomePage Composition & Section Transitions

### Tasks

7.1 **Replace uniform FadeInSection with per-section motion**

- File: `apps/web/src/pages/HomePage.tsx`
- Remove the generic `<FadeInSection>` wrapper from every section
- Each section now owns its own scroll-triggered entrance animation (implemented in Phases 1–6)
- Add section-to-section transition effects where needed (e.g., background color shifts, parallax layers)

  7.2 **Update PageLayout if needed**

- File: `apps/web/src/layouts/PageLayout.tsx`
- Adjust spacing, overflow, or scroll behavior for new section transitions
- Ensure footer CTA integrates naturally with last section

  7.3 **Full-page orchestration pass**

- Verify scroll performance (no jank at 60fps)
- Verify section transition order feels natural top-to-bottom
- Verify mobile responsiveness of all sections together

  7.4 **Update BaseLayout meta copy**

- File: `apps/web/src/layouts/BaseLayout.tsx`
- Update `DEFAULT_TITLE` and `DEFAULT_DESCRIPTION` defaultMessages to Korean

### File Targets

- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/layouts/PageLayout.tsx`
- `apps/web/src/layouts/BaseLayout.tsx`
- `apps/web/src/components/common/fade-in-section.tsx` (deprecate or keep as utility)

### Acceptance Criteria

- [ ] HomePage no longer uses uniform `<FadeInSection>` on every section
- [ ] Scrolling through the full page shows varied entrance animations per section
- [ ] No layout shift (CLS) during section transitions
- [ ] Scroll performance stays at 60fps (test in Chrome DevTools Performance tab)
- [ ] Meta title and description are Korean defaults
- [ ] Full page renders correctly on mobile (375px), tablet (768px), and desktop (1440px)

### Verification Commands

```bash
cd apps/web
npm run check-types
npm run build
npm run preview  # manual scroll test on localhost:3000
```

### Rollback Strategy

- `git checkout -- apps/web/src/pages/HomePage.tsx apps/web/src/layouts/`

### Definition of Done

- Full homepage scroll experience is cohesive, performant, Korean-first, and visually distinct from Voquill.

---

## Phase 8: i18n Extract, Sync & Korean Consistency Gate

### Tasks

8.1 **Run i18n extract**

```bash
cd apps/web
npm run i18n:extract
```

- This regenerates `src/i18n/locales/en.json` from all `defaultMessage` strings
- Since defaults are now Korean, `en.json` will contain Korean text as the "source" for new keys
- Note: `en.json` is NOT the source of truth for English — it's a key registry. The `ko.json` file IS the source.

  8.2 **Manual audit: update `ko.json`**

- After extract, run `npm run i18n:sync`
- Manually verify `ko.json` — since `defaultMessage` values are Korean, the sync will propagate Korean into `ko.json` for any new keys (which is correct)
- For keys where `ko.json` still has English text (the "mixed locale risk"), manually translate those remaining English values

  8.3 **Korean consistency gate**

- Run a grep/script to detect any `ko.json` values that contain ASCII-only text (likely untranslated):

```bash
node -e "
  const ko = require('./src/i18n/locales/ko.json');
  const ascii = Object.entries(ko).filter(([k,v]) => /^[\\x00-\\x7F]+$/.test(v));
  if (ascii.length) { console.log('UNTRANSLATED:', ascii.length); ascii.forEach(([k,v]) => console.log('  ', k, '→', v)); process.exit(1); }
  else { console.log('All ko.json values contain Korean characters. PASS.'); }
"
```

- Allow exceptions: brand names (Vocally, Pro, AppImage), technical terms, currency symbols, numbers

  8.4 **Sync all other locale files**

```bash
cd apps/web
npm run i18n:sync
```

- This propagates key additions/removals to `en.json`, `es.json`, `fr.json`, etc.

  8.5 **Update `en.json` with English translations**

- For every key whose value is now Korean (from the extract), provide an English translation in `en.json`
- This is manual work or can use a script/LLM translation pass

### File Targets

- `apps/web/src/i18n/locales/ko.json`
- `apps/web/src/i18n/locales/en.json`
- All other locale files in `apps/web/src/i18n/locales/`

### Acceptance Criteria

- [ ] `npm run i18n:extract` exits 0
- [ ] `npm run i18n:sync` exits 0
- [ ] Korean consistency gate passes (no ASCII-only values in `ko.json` except allowed brand terms)
- [ ] `en.json` has valid English translations for all keys
- [ ] App renders correctly in both `ko` and `en` locales
- [ ] No `react-intl` missing translation warnings in browser console

### Verification Commands

```bash
cd apps/web
npm run i18n:extract
npm run i18n:sync
npm run build
# Korean consistency gate (inline above)
# Browser test: set localStorage 'app-locale' to 'ko' → full Korean
# Browser test: set localStorage 'app-locale' to 'en' → full English
```

### Rollback Strategy

- `git checkout -- apps/web/src/i18n/locales/`

### Definition of Done

- i18n pipeline is clean, `ko.json` has zero untranslated entries (except allowed terms), `en.json` has complete English, all locale files synced, build passes.

---

## Phase 9: Final Anti-Similarity Audit & QA

### Tasks

9.1 **Visual diff against Voquill**

- Open Voquill's live site (or the original fork state) side-by-side with `npm run preview`
- Check each section: hero, header, footer, all showcases, pricing
- Document any remaining visual similarities — if a section still "looks like Voquill", flag for redesign

  9.2 **Anti-copy audit against Wispr**

- Compare each section's motion with wispr.com
- Verify Vocally's motion is inspired-by but not derivative-of
- No identical easing curves, timing patterns, or layout compositions

  9.3 **Accessibility pass**

- All interactive elements have aria-labels in Korean
- Color contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text)
- Keyboard navigation works through all interactive elements
- Reduced motion: `prefers-reduced-motion: reduce` disables complex animations

  9.4 **Performance pass**

- Lighthouse Performance score ≥ 90
- No layout shifts during animations (CLS < 0.1)
- Largest Contentful Paint < 2.5s
- Total bundle size check: no unintended growth from `motion` tree-shaking

  9.5 **Cross-browser check**

- Chrome, Firefox, Safari (macOS), Edge
- Mobile Safari, Chrome Mobile (responsive preview)

### File Targets

- Potentially any file from Phases 0–8 that needs adjustment

### Acceptance Criteria

- [ ] Zero visual pattern matches with Voquill across all homepage sections
- [ ] Motion quality is Wispr-inspired but not Wispr-copied
- [ ] WCAG AA color contrast met
- [ ] `prefers-reduced-motion` honored
- [ ] Lighthouse Performance ≥ 90
- [ ] CLS < 0.1
- [ ] Works in Chrome, Firefox, Safari, Edge

### Verification Commands

```bash
cd apps/web
npm run build
npm run preview
# Lighthouse audit in Chrome DevTools
# Manual visual comparison
```

### Rollback Strategy

- Per-section rollback from any prior phase

### Definition of Done

- Full revamp passes all quality gates — visual differentiation, motion quality, Korean consistency, accessibility, performance.

---

## Execution Order Summary

| Phase | Section                               | Depends On       | Estimated Effort |
| ----- | ------------------------------------- | ---------------- | ---------------- |
| 0     | Foundation (tokens, fonts, Storybook) | —                | Small            |
| 1     | Hero                                  | Phase 0          | Large            |
| 2     | Site Header                           | Phase 0          | Medium           |
| 3     | Site Footer                           | Phase 0          | Medium           |
| 4     | Download Button                       | Phase 0          | Small            |
| 5A    | Speed Showcase                        | Phase 0, Phase 4 | Medium           |
| 5B    | Text Cleanup Showcase                 | Phase 0          | Large            |
| 5C    | Privacy Showcase                      | Phase 0          | Medium           |
| 5D    | Offline Showcase                      | Phase 0          | Medium           |
| 5E    | Apps Carousel                         | Phase 0          | Medium           |
| 6     | Pricing Section                       | Phase 0, Phase 4 | Large            |
| 7     | HomePage Composition                  | Phases 1–6       | Medium           |
| 8     | i18n Extract/Sync                     | Phases 1–7       | Medium           |
| 9     | Final Audit & QA                      | Phase 8          | Medium           |

**Critical path:** Phase 0 → Phase 1 → Phase 7 → Phase 8 → Phase 9

**Parallelizable:** Phases 2, 3, 4 can run in parallel after Phase 0. Phases 5A–5E can run in parallel after Phase 0 + Phase 4. Phase 6 can run in parallel with Phase 5.

---

## Risk Mitigations

| Risk                                                          | Likelihood | Impact | Mitigation                                                                                                                      |
| ------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Korean copy quality — awkward/unnatural phrasing              | Medium     | High   | Have native Korean speaker review all `defaultMessage` strings before promote step                                              |
| Motion performance on low-end devices                         | Medium     | High   | Use `motion`'s `LazyMotion` with `domAnimation` (already in use); add `prefers-reduced-motion` fallbacks; test on throttled CPU |
| Storybook breaking after major CSS changes                    | Low        | Medium | Phase 0 validates Storybook first; POC stories use inline styles initially                                                      |
| `i18n:extract` generating wrong hashed IDs after copy changes | Low        | High   | Run extract + sync as dedicated phase (Phase 8); verify no missing translations in browser                                      |
| Voquill visual similarity persists after revamp               | Medium     | High   | Phase 9 includes explicit visual diff audit; anti-similarity checklist enforced at every phase                                  |
| Build failures from TypeScript after component refactors      | Low        | Medium | Run `npm run check-types` after every promote step                                                                              |
| Font loading performance regression                           | Low        | Medium | Use `font-display: swap`; subset Korean glyphs via Pretendard's dynamic subset (already in use)                                 |
| Motion library bundle size growth                             | Low        | Medium | Use `LazyMotion` + `domAnimation` (lighter subset); verify tree-shaking with `npm run build`                                    |

---

## Storybook-First POC Workflow (Standard Operating Procedure)

Every section follows this exact workflow:

```
1. WRITE Korean copy (defaultMessage strings)
     ↓
2. CREATE *-poc.stories.tsx with inline styles + motion
     ↓
3. REVIEW in Storybook (Korean rendering, motion quality, anti-Voquill check)
     ↓
4. ITERATE on POC until approved
     ↓
5. PROMOTE: extract styles to *.module.css, update production component
     ↓
6. UPDATE production *.stories.tsx
     ↓
7. VERIFY: npm run check-types && npm run build
     ↓
8. RUN grep check for English defaultMessage leaks
```

This workflow is enforced for: Hero, Header, Footer, Download Button, all 5 showcases, and Pricing.

---

## i18n Extract/Sync Workflow (Standard Operating Procedure)

```
1. AUTHOR: Write all defaultMessage values in Korean in component code
     ↓
2. EXTRACT: npm run i18n:extract
   → Regenerates en.json with Korean defaults as values
     ↓
3. SYNC: npm run i18n:sync
   → Propagates new/removed keys to all locale files
     ↓
4. TRANSLATE en.json: Replace Korean values with English translations
     ↓
5. GATE: Run Korean consistency check on ko.json
   → Fail if ASCII-only values found (except allowed terms)
     ↓
6. VERIFY: npm run build (catches missing imports, type errors)
     ↓
7. BROWSER TEST: Toggle locale in-app, verify no missing translations
```

This workflow runs once as Phase 8, but can also run incrementally after each promote step if preferred.
