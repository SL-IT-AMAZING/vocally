# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill (v2)

> Revision of `web-revamp-korean-first.md`. Fixes all blocking issues identified in Momus review: broken ID generation for Korean `defaultMessage`, wrong extract/sync base locale, unmeasurable anti-similarity gates, scope-coupled layout/global-token work, and unenforced Storybook-first workflow.

---

## What Changed from v1

| v1 Issue                                                                                                                               | v2 Fix                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `formatjs-id.mjs` strips all non-ASCII → Korean `defaultMessage` produces empty/colliding IDs                                          | **Pre-phase −1** adds Unicode-safe ID generation before any copy is written                                                                            |
| `i18n:extract` writes to `en.json` as base, but `manifest.json` says `defaultLocale: "ko"` and `i18n-sync.mjs` reads `ko.json` as base | **Pre-phase −1** realigns extract target to `ko.json`, sync reads from `ko.json`, `en.json` becomes a translation target                               |
| Anti-Voquill/anti-Wispr checks are subjective prose ("verify it looks different")                                                      | Every phase has a **concrete denylist spec** with CSS-value assertions and file-grep commands                                                          |
| Phase 0 mixes global tokens, fonts, AND PageLayout/header/footer concerns                                                              | **Phase 0 is tokens+fonts+Storybook only**; header/footer are separate phases with their own CSS scope                                                 |
| Storybook-first is described but not enforced — nothing blocks promote without POC                                                     | Every section phase has a **gate step**: POC story must render (`storybook build` + grep for story ID) before promote step is allowed                  |
| Phase 8 (i18n) is too late — broken IDs would accumulate across Phases 1–7                                                             | i18n infrastructure fixed in Pre-phase −1; incremental extract+sync runs after every promote step; Phase 8 becomes a final audit, not first-time setup |
| Korean consistency gate allows unspecified exceptions                                                                                  | Explicit **allowlist file** (`scripts/ko-ascii-allowlist.json`) with enumerated terms                                                                  |

---

## Requirements Summary

- Full visual and motion overhaul of `apps/web` (HomePage and all its sections)
- Korean-first copy: every `defaultMessage` authored in Korean, `ko.json` is source-of-truth
- Wispr-level motion quality adapted as original Vocally motion language
- Clear differentiation from Voquill: no shared layout patterns, color tokens, typography, or motion timing
- Storybook-first POC workflow strictly enforced per section
- Section-by-section sequential delivery with per-phase acceptance criteria
- Existing Storybook (`@storybook/react-vite` 10.x) and i18n (`react-intl` + `babel-plugin-formatjs`) infrastructure retained

## Scope & Constraints

### In Scope

- `apps/web/src/components/` — all homepage sections
- `apps/web/src/styles/global.css` and `apps/web/src/styles/page.module.css` — design token system
- `apps/web/src/i18n/locales/ko.json` — authoritative Korean copy
- `apps/web/.storybook/preview.tsx` — decorator locale switch
- `apps/web/src/pages/HomePage.tsx` — final composition
- `apps/web/src/layouts/PageLayout.tsx` — structural changes
- `apps/web/scripts/formatjs-id.mjs` — Unicode-safe ID generation
- `apps/web/scripts/formatjs-formatter.mjs` — extract formatter alignment
- `apps/web/package.json` — `i18n:extract` command target alignment
- All `*.module.css`, `*-poc.stories.tsx`, and production `*.stories.tsx` files

### Out of Scope

- Non-homepage routes (`/download`, `/pricing`, `/privacy`, `/terms`, `/refund`, `/auth/*`, `/checkout/*`)
- Backend/API changes, Supabase, Polar integration code
- Desktop app (`apps/desktop`), shared packages (`packages/*`)
- Content markdown files (`content/`)
- SEO/prerender script changes (unless copy changes require it)

### Technical Constraints

- Must use existing `motion` library (v12.34.1) — no new animation dependencies
- Must use existing `react-intl` with `babel-plugin-formatjs`
- `manifest.json` declares `defaultLocale: "ko"` — all tooling must honor this
- Must not break `npm run build` (includes `tsc --noEmit` + `vite build` + `prerender.mjs`)
- Storybook v10.x with `@storybook/react-vite` — no framework change
- CSS Modules preserved — no Tailwind/CSS-in-JS migration
- Font: replace Inter with a characterful alternative; keep Pretendard Variable for Korean

---

## Anti-Similarity Guardrails — Denylist Spec (Measurable)

### Voquill Denylist

These exact values and patterns MUST NOT appear in the final codebase. Each is verifiable via grep/CSS inspection.

| Dimension               | Denied Value(s)                                                                             | Grep/Assertion Command                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Primary brand color     | `#2563eb`, `#3b82f6`, `#1d4ed8`, `#60a5fa` and any `--brand` referencing these values       | `grep -rn "#2563eb\|#3b82f6\|#1d4ed8\|#60a5fa" apps/web/src/styles/` must return 0 results   |
| Font family             | `"Inter"` as primary display font                                                           | `grep -rn '"Inter"' apps/web/src/styles/ apps/web/src/components/` must return 0 results     |
| Section wrapper pattern | `<FadeInSection>` wrapping every homepage section uniformly                                 | `grep -c "FadeInSection" apps/web/src/pages/HomePage.tsx` must return 0                      |
| Section gap             | `gap: 120px` on `.main`                                                                     | `grep -n "gap: 120px" apps/web/src/styles/page.module.css` must return 0 results in `.main`  |
| Card surface tokens     | `--level1` as sole card background with `--border` + `--shadow-soft` triple combo unchanged | At least 2 card components must use a different surface treatment (verified by manual audit) |
| Motion easing           | `opacity + translateY` as the ONLY entrance animation pattern                               | `grep -c "FadeInSection\|fadeInSection" apps/web/src/pages/HomePage.tsx` must return 0       |
| Hero pattern            | Canvas waveform (`SonicWaveform`) + centered text stack                                     | `sonic-waveform.tsx` must be unused (no imports from production components)                  |
| Footer pattern          | `.footer` card-in-page with `border-radius: 14px` + `background: var(--level1)`             | Footer must use a structurally different container (verified by CSS diff)                    |

### Wispr Non-Copy Spec

These are **principle extractions**, not surface copies. Compliance is verified by absence of identical implementation details.

| Extracted Principle               | Implementation Constraint                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Scroll-linked section transitions | Must use `motion`'s `useScroll` + `useTransform` — must NOT replicate Wispr's specific background-color-shift timing |
| Staggered text reveal             | Must use spring physics via `motion` — must NOT use Wispr's word-by-word timing values                               |
| Hover depth interactions          | Must implement scale + shadow — glow color must NOT match Wispr's specific hex values                                |
| Page-load orchestration           | Must use staggered `animation-delay` — must NOT use identical delay sequences                                        |
| Parallax depth                    | Must use `motion`'s scroll hooks — must NOT use GSAP or Wispr's specific layer offsets                               |

**Verification**: At the end of Phase 9, capture Wispr.com scroll behavior via screen recording and compare side-by-side. Document 3+ specific differences per section in a `COMPARISON.md` checklist.

---

## Pre-Phase −1: i18n Infrastructure Fix (Unicode-Safe IDs + Extract/Sync Alignment)

> **WHY THIS IS FIRST**: The current `formatjs-id.mjs` uses `/[^a-z0-9]+/gi` which strips ALL Korean characters, producing empty or colliding IDs for Korean `defaultMessage` values. Every subsequent phase writes Korean `defaultMessage` strings — if this isn't fixed first, the entire build breaks.

### Tasks

**−1.1 Make `formatjs-id.mjs` Unicode-safe**

- File: `apps/web/scripts/formatjs-id.mjs`
- Current `sanitize` function strips non-ASCII. This MUST be replaced with a strategy that handles Korean (Hangul) characters.
- Strategy: Use content-hash-based IDs for non-ASCII messages. When `defaultMessage` contains non-ASCII characters, generate a stable hash (SHA-1 truncated to 8 chars) prefixed with a readable slug derived from the first ASCII-transliterable portion or a fixed prefix like `msg_`.
- The function signature and export interface (`createMessageId`, `formatjsOverrideIdFn`) must remain identical.
- The `formatjs-id.d.ts` type declarations remain unchanged.

**−1.2 Align `formatjs-formatter.mjs` with new ID generation**

- File: `apps/web/scripts/formatjs-formatter.mjs`
- The `format()` function calls `createMessageId(defaultMessage)` — this already delegates correctly. Verify that the output for Korean messages produces non-empty, non-colliding keys.
- Add a collision detection assertion: after generating all IDs, check for duplicates and throw with a clear error message identifying the colliding `defaultMessage` values.

**−1.3 Align `vite.config.ts` Babel plugin with updated ID function**

- File: `apps/web/vite.config.ts`
- The `overrideIdFn` in `babel-plugin-formatjs` config already calls `formatjsOverrideIdFn`. Verify the dynamic import `await import("./scripts/formatjs-id.mjs")` still resolves correctly after edits.
- No structural changes needed — this is a verification step.

**−1.4 Realign `i18n:extract` to output `ko.json` as base**

- File: `apps/web/package.json` (the `i18n:extract` script)
- Current: `--out-file src/i18n/locales/en.json`
- Change to: `--out-file src/i18n/locales/ko.json`
- This aligns the extract target with `manifest.json`'s `defaultLocale: "ko"` and with `i18n-sync.mjs` which already reads `${defaultLocale}.json` (= `ko.json`) as its base.
- After this change: `i18n:extract` → writes `ko.json` → `i18n:sync` reads `ko.json` as base → propagates to `en.json`, `es.json`, etc.

**−1.5 Verify `i18n-sync.mjs` already reads from `ko.json`**

- File: `apps/web/scripts/i18n-sync.mjs`
- Line 15: `const baseLocalePath = path.join(localesDir, \`${defaultLocale}.json\`);`— since`defaultLocale`comes from`manifest.json`which says`"ko"`, this already reads `ko.json`.
- Line 30: `localesToSync` filters out `defaultLocale`, so `ko` is excluded from sync targets. This means `en.json` will be a sync target that receives new keys with Korean fallback values.
- **No code change needed** — document this as a verification-only step.

**−1.6 Create `scripts/ko-ascii-allowlist.json`**

- File: `apps/web/scripts/ko-ascii-allowlist.json` (new)
- Content: JSON array of `ko.json` values that are legitimately ASCII-only:
  - Brand names: `"Vocally"`, `"Pro"`, `"AppImage"`, `"Vulkan"`, `"Whisper"`, `"API"`, `"Groq"`
  - Technical strings: `"~220 wpm"`, `"~45 wpm"`, `"AppImage"`, `"DMG"`, `".deb"`, `".rpm"`
  - Currency: `"$0"`, `"$5"`, `"$50"`, `"/mo"`, `"/yr"`
  - Formats: `"4× faster"`, email patterns
- This allowlist is consumed by the Korean consistency gate script (Phase 8) and can be updated as needed.

**−1.7 Smoke-test the full i18n pipeline with existing English messages**

- Run `npm run i18n:extract` (now targeting `ko.json`)
- Run `npm run i18n:sync`
- Run `npm run build`
- Verify: no ID collisions, no missing messages, app renders in both locales
- This proves the infrastructure works BEFORE any Korean copy is written.

### File Targets

- `apps/web/scripts/formatjs-id.mjs`
- `apps/web/scripts/formatjs-formatter.mjs`
- `apps/web/vite.config.ts` (verify only)
- `apps/web/package.json` (`i18n:extract` script)
- `apps/web/scripts/i18n-sync.mjs` (verify only)
- `apps/web/scripts/ko-ascii-allowlist.json` (new)
- `apps/web/scripts/formatjs-id.d.ts` (verify only — no changes expected)

### Acceptance Criteria

- [ ] `createMessageId("타이핑을 멈추세요")` returns a non-empty, stable string (same input → same output)
- [ ] `createMessageId("Stop typing")` still returns `stop_typing` (English backward compat)
- [ ] Two different Korean messages produce two different IDs (no collisions)
- [ ] `npm run i18n:extract` exits 0 and writes to `src/i18n/locales/ko.json`
- [ ] `npm run i18n:sync` exits 0 and propagates keys to `en.json` and all other locales
- [ ] `npm run build` passes (tsc + vite + prerender)
- [ ] `ko-ascii-allowlist.json` exists and is valid JSON
- [ ] No changes to the i18n runtime (`intl.ts`, `config.ts`) — only tooling scripts

### Verification Commands

```bash
cd apps/web

# Unit-test the ID function
node -e "
  import('./scripts/formatjs-id.mjs').then(m => {
    const id1 = m.createMessageId('타이핑을 멈추세요');
    const id2 = m.createMessageId('목소리로 시작하세요');
    const id3 = m.createMessageId('Stop typing');
    console.log('Korean ID 1:', id1);
    console.log('Korean ID 2:', id2);
    console.log('English ID:', id3);
    console.assert(id1 !== '', 'Korean ID must not be empty');
    console.assert(id1 !== id2, 'Different messages must produce different IDs');
    console.assert(id3 === 'stop_typing', 'English ID must be backward compatible');
    console.log('ALL ASSERTIONS PASSED');
  });
"

# Full pipeline
npm run i18n:extract
npm run i18n:sync
npm run check-types
npm run build
```

### Rollback Strategy

- `git checkout -- apps/web/scripts/ apps/web/package.json`

### Definition of Done

- Korean `defaultMessage` strings produce unique, stable, non-empty IDs. Extract writes to `ko.json`. Sync reads `ko.json` as base. Build passes. No runtime changes.

---

## Phase 0: Foundation — Design Tokens, Font System, Storybook Locale

> Scope is strictly: CSS custom properties in `global.css` and `page.module.css`, font replacement, and Storybook preview locale. NO component changes. NO layout changes. NO header/footer work.

### Tasks

**0.1 Replace Inter with display font**

- File: `apps/web/src/styles/global.css`
- Remove `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");`
- Add import for a new characterful display font. Candidates (pick ONE): Satoshi (via Fontshare CDN), General Sans (via Fontshare), Plus Jakarta Sans (via Google Fonts), or Outfit (via Google Fonts).
- **MUST NOT use**: Inter, Roboto, Arial, system fonts, Space Grotesk.
- Keep Pretendard Variable import unchanged.
- Update `body { font-family: ... }` to new display font + `"Pretendard Variable"` fallback chain.

**0.2 Overhaul CSS custom properties (design tokens)**

- File: `apps/web/src/styles/global.css` (`:root` block)
- Remove all Voquill blue tokens: `--brand: #2563eb`, `--brand-hover: #3b82f6`, `--brand-active: #1d4ed8`, `--brand-light: #60a5fa`, `--brand-pale: rgba(37, 99, 235, 0.12)`, `--voice-blue: #60a5fa`, `--voice-glow: rgba(96, 165, 250, 0.35)`
- Define new dual-accent palette: a warm accent + a cool accent, neither of which is blue-600 or any Voquill blue.
- File: `apps/web/src/styles/page.module.css` (`.page` block)
- Update surface tokens: richer depth system beyond flat `--level0/1/2/3`
- Add motion tokens: `--ease-spring`, `--ease-out-expo`, `--duration-fast: 150ms`, `--duration-section: 600ms`
- Add spacing tokens: `--section-gap-lg`, `--section-gap-md`, `--section-gap-sm` replacing hardcoded `120px` / `64px`
- Update `.main { gap: 120px }` → `gap: var(--section-gap-lg)`
- Update `.page { gap: 64px }` → `gap: var(--section-gap-md)`
- Update all `--primary-button-*` tokens to reference new accent colors

**0.3 Fix Storybook preview locale to Korean**

- File: `apps/web/.storybook/preview.tsx`
- Change `<IntlProvider locale="en" defaultLocale="en" messages={{}}>` to `<IntlProvider locale="ko" defaultLocale="ko" messages={koMessages}>`
- Add import: `import koMessages from "../src/i18n/locales/ko.json";`
- This ensures every POC story renders Korean copy by default.

**0.4 Add Storybook locale switcher decorator (optional)**

- In `.storybook/preview.tsx`, add a `globalTypes.locale` toolbar selector so stories can toggle `ko` ↔ `en`
- This is non-blocking — skip if time-constrained.

### File Targets

- `apps/web/src/styles/global.css`
- `apps/web/src/styles/page.module.css`
- `apps/web/.storybook/preview.tsx`

### Acceptance Criteria

- [ ] `npm run storybook` renders existing stories with Korean messages and new fonts
- [ ] `npm run build` passes without errors
- [ ] `grep -rn "#2563eb\|#3b82f6\|#1d4ed8\|#60a5fa" apps/web/src/styles/` returns 0 results
- [ ] `grep -rn '"Inter"' apps/web/src/styles/` returns 0 results
- [ ] CSS custom properties for motion easing and spacing are defined in `page.module.css`
- [ ] `.main` uses `var(--section-gap-lg)` not hardcoded `120px`
- [ ] New color palette has ≥ 2 accent colors, verified by counting distinct `--accent-*` or `--brand-*` tokens in `:root`

### Verification Commands

```bash
cd apps/web
npm run check-types
npm run build
npm run storybook -- --smoke-test
grep -rn '"Inter"' src/styles/
grep -rn "#2563eb\|#3b82f6\|#1d4ed8\|#60a5fa" src/styles/
grep -n "gap: 120px" src/styles/page.module.css  # should return 0
```

### Rollback Strategy

- `git checkout -- apps/web/src/styles/ apps/web/.storybook/`

### Definition of Done

- Design token system is in place with new palette. Storybook defaults to Korean. Font system replaced. All Voquill blue hex values removed from styles. Build passes.

---

## Phase 1: Hero Section

### Storybook-First Gate

> **BLOCKING**: The POC story (`hero-section-poc.stories.tsx`) MUST exist and render successfully in `storybook build` BEFORE any production file (`hero-section.tsx`, `hero.module.css`) is modified. Verification: `grep -r "hero-section-poc" apps/web/.storybook-static/` confirms the story was compiled.

### Tasks

**1.1 Write Korean-first hero copy**

- Author new `defaultMessage` strings in Korean for headline, subheadline, and CTA.
- Pattern: `<FormattedMessage defaultMessage="타이핑을 멈추세요. 목소리로 시작하세요." />`
- These replace the current English defaults.

**1.2 Build hero POC story**

- File: `apps/web/src/components/hero/hero-section-poc.stories.tsx` (new)
- Requirements:
  - Layout MUST be structurally different from Voquill's centered-text-over-canvas pattern (split-panel, asymmetric grid, or similar)
  - Kinetic typography with spring physics via `motion`
  - New background visual replacing canvas SonicWaveform
  - Download CTA and platform badges included
  - All text via `<FormattedMessage>` with Korean defaults

**1.3 Promote POC to production**

- **GATE CHECK**: Run `npx storybook build -o /tmp/sb-check && grep -r "hero-section-poc" /tmp/sb-check/` — must succeed before proceeding.
- Update `apps/web/src/components/hero/hero-section.tsx`
- Update `apps/web/src/components/hero/hero.module.css`
- Remove/deprecate `sonic-waveform.tsx` and `hero-graphic.tsx` if replaced
- Update production `hero-section.stories.tsx`

**1.4 Incremental i18n extract+sync**

```bash
cd apps/web && npm run i18n:extract && npm run i18n:sync
```

### Denylist Checks (Hero-specific)

- [ ] `grep -rn "SonicWaveform\|sonic-waveform" apps/web/src/components/hero/hero-section.tsx` returns 0 results
- [ ] `grep -rn "HeroGraphic\|hero-graphic" apps/web/src/components/hero/hero-section.tsx` returns 0 results
- [ ] Hero component does NOT have a single centered text column with a canvas background beneath it

### File Targets

- `apps/web/src/components/hero/hero-section-poc.stories.tsx` (new)
- `apps/web/src/components/hero/hero-section.tsx`
- `apps/web/src/components/hero/hero.module.css`
- `apps/web/src/components/hero/sonic-waveform.tsx` (deprecate)
- `apps/web/src/components/hero/hero-graphic.tsx` (deprecate)
- `apps/web/src/components/hero/hero-section.stories.tsx`

### Acceptance Criteria

- [ ] POC story renders in Storybook with Korean copy, no English visible
- [ ] Hero layout is NOT centered-text-on-canvas (structural grep verification above)
- [ ] At least 3 independent motion sequences on page load
- [ ] Motion uses `motion` library spring/physics curves, not CSS `ease` alone
- [ ] Download button and platform badges remain functional
- [ ] `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/hero/` returns 0 (no English defaults)
- [ ] `npm run i18n:extract && npm run i18n:sync` exits 0
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check  # POC must compile
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -rn 'defaultMessage="[A-Za-z]' src/components/hero/
grep -rn "SonicWaveform\|sonic-waveform" src/components/hero/hero-section.tsx
```

### Rollback Strategy

- POC is isolated in `*-poc.stories.tsx`. Production files untouched until gate passes.
- `git checkout -- apps/web/src/components/hero/`

### Definition of Done

- Hero POC gate passed → promoted to production → old visuals removed → i18n synced → build passes.

---

## Phase 2: Site Header

### Storybook-First Gate

> **BLOCKING**: `site-header-poc.stories.tsx` MUST compile in storybook build before production `site-header.tsx` is modified.

### Tasks

**2.1 Write Korean-first header copy**

- Nav link labels: `defaultMessage` in Korean
- All aria-labels in Korean

**2.2 Build header POC story**

- File: `apps/web/src/components/site-header-poc.stories.tsx` (new)
- New header design: MUST break from the current floating pill/bar pattern (the Voquill `.header` with `border-radius: 12px` + `backdrop-filter: blur(20px)` + `border: 1px solid rgba(255, 255, 255, 0.1)`)
- Add entrance animation and scroll behavior (compact mode, background opacity shift)
- Must include: logo, nav links, locale toggle, sign-in, download CTA, mobile menu

**2.3 Promote POC to production**

- **GATE CHECK**: storybook build must include `site-header-poc` story.
- Update `apps/web/src/components/site-header.tsx`
- Update header-related selectors in `apps/web/src/styles/page.module.css` (`.headerWrapper`, `.header`, `.nav*`, `.mobile*`)
- **Scope boundary**: Only touch `.header*`, `.nav*`, `.mobile*`, `.logo*`, `.langToggle`, `.headerCta`, `.headerActions` selectors in `page.module.css`. Do NOT modify `.main`, `.footer`, `.page`, or any other selectors.

**2.4 Incremental i18n extract+sync**

### Denylist Checks (Header-specific)

- [ ] Header container MUST NOT use `border-radius: 12px` + `backdrop-filter: blur(20px)` + floating pill layout simultaneously (can use blur separately, but not the exact Voquill combination)
- [ ] `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/site-header.tsx` returns 0

### File Targets

- `apps/web/src/components/site-header-poc.stories.tsx` (new)
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/components/site-header.stories.tsx`
- `apps/web/src/styles/page.module.css` (header selectors ONLY)

### Acceptance Criteria

- [ ] POC story renders header with Korean nav labels and aria-labels
- [ ] Header has visible scroll-linked animation
- [ ] Mobile menu works and is accessible
- [ ] Locale toggle functional (ko ↔ en)
- [ ] Header layout structurally different from Voquill floating pill
- [ ] Only header-related CSS selectors modified in `page.module.css`
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -rn 'defaultMessage="[A-Za-z]' src/components/site-header.tsx
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/site-header.tsx apps/web/src/components/site-header-poc.stories.tsx apps/web/src/styles/page.module.css`

### Definition of Done

- Header POC gate passed → promoted → mobile responsive → i18n synced → build passes.

---

## Phase 3: Site Footer

### Storybook-First Gate

> **BLOCKING**: `site-footer-poc.stories.tsx` MUST compile before production `site-footer.tsx` is modified.

### Tasks

**3.1 Write Korean-first footer copy**

- CTA heading, legal links, copyright notice — all `defaultMessage` in Korean

**3.2 Build footer POC story**

- File: `apps/web/src/components/site-footer-poc.stories.tsx` (new)
- New footer: MUST break from the current card-in-page pattern (`.footer { border-radius: 14px; background: var(--level1); border: 1px solid var(--border) }`)
- Include bold CTA section, scroll-triggered entrance, legal links

**3.3 Promote POC to production**

- **GATE CHECK**: storybook build must include `site-footer-poc` story.
- Update `apps/web/src/components/site-footer.tsx`
- Update footer-related selectors in `apps/web/src/styles/page.module.css` (`.footer`, `.footerInner`, `.footerActions`, `.pageMeta`, `.pageLinks`)
- **Scope boundary**: Only touch `.footer*`, `.pageMeta*`, `.pageLinks*` selectors. Do NOT modify `.header*`, `.main`, `.page`, or other selectors.

**3.4 Incremental i18n extract+sync**

### Denylist Checks (Footer-specific)

- [ ] Footer MUST NOT use `border-radius: 14px` + `background: var(--level1)` + `border: 1px solid var(--border)` card pattern
- [ ] `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/site-footer.tsx` returns 0

### File Targets

- `apps/web/src/components/site-footer-poc.stories.tsx` (new)
- `apps/web/src/components/site-footer.tsx`
- `apps/web/src/components/site-footer.stories.tsx`
- `apps/web/src/styles/page.module.css` (footer selectors ONLY)

### Acceptance Criteria

- [ ] Korean copy throughout, no English `defaultMessage`
- [ ] Footer CTA visually distinct from Voquill's card-style footer (denylist above)
- [ ] Download button functional
- [ ] Legal links present and working
- [ ] Entrance animation on scroll
- [ ] Only footer-related CSS selectors modified in `page.module.css`
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -rn 'defaultMessage="[A-Za-z]' src/components/site-footer.tsx
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/site-footer.tsx apps/web/src/components/site-footer-poc.stories.tsx apps/web/src/styles/page.module.css`

### Definition of Done

- Footer POC gate passed → promoted → responsive → i18n synced → build passes.

---

## Phase 4: Download Button

### Storybook-First Gate

> **BLOCKING**: `download-button-poc.stories.tsx` MUST compile before `download-button.tsx` is modified.

### Tasks

**4.1 Write Korean-first button labels**

- `defaultMessage` for platform labels, mobile fallback, compact labels — all Korean
- Audit `apps/web/src/lib/downloads.tsx` for hardcoded English platform names

**4.2 Build download button POC story**

- File: `apps/web/src/components/download-button-poc.stories.tsx` (new)
- Align with new design token system (new accent colors, not Voquill blue)
- Hover micro-interaction (scale + glow + icon animation)
- Loading state: disabled + pulse animation (per AGENTS.md)

**4.3 Promote POC to production**

- **GATE CHECK**: storybook build must include `download-button-poc` story.
- Update `apps/web/src/components/download-button.tsx`
- Update `.primaryButton` styles in `page.module.css`
- **Scope boundary**: Only touch `.primaryButton*`, `.secondaryButton*`, `.ghostButton*`, `.buttonIcon` selectors.

**4.4 Incremental i18n extract+sync**

### Denylist Checks (Button-specific)

- [ ] `.primaryButton` MUST NOT use `rgba(37, 99, 235, *)` anywhere (Voquill blue)
- [ ] `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/download-button.tsx apps/web/src/lib/downloads.tsx` returns 0

### File Targets

- `apps/web/src/components/download-button-poc.stories.tsx` (new)
- `apps/web/src/components/download-button.tsx`
- `apps/web/src/components/download-button.stories.tsx`
- `apps/web/src/styles/page.module.css` (button selectors ONLY)
- `apps/web/src/lib/downloads.tsx` (audit for hardcoded English)

### Acceptance Criteria

- [ ] Button renders Korean labels by default
- [ ] Hover interaction has perceptible depth change
- [ ] Disabled state shows loading pulse, not text change
- [ ] Platform detection still works (macOS/Windows/Linux)
- [ ] Mobile "coming soon" message in Korean
- [ ] No Voquill blue hex values in button styles
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -rn "rgba(37, 99, 235" src/styles/page.module.css
grep -rn 'defaultMessage="[A-Za-z]' src/components/download-button.tsx src/lib/downloads.tsx
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/download-button.tsx apps/web/src/styles/page.module.css`

### Definition of Done

- Download button POC gate passed → promoted → all states validated → i18n synced → build passes.

---

## Phase 5: Showcase Sections (Speed, Text Cleanup, Privacy, Offline, Apps Carousel)

Each showcase follows the standard sub-workflow with Storybook-first gate enforcement.

### Standard Sub-Workflow per Showcase

```
1. WRITE Korean copy (defaultMessage strings in Korean)
     ↓
2. CREATE *-poc.stories.tsx with new layout + motion
     ↓
3. GATE: npx storybook build -o /tmp/sb-check — POC must compile
     ↓
4. REVIEW in Storybook (Korean rendering, motion quality, denylist check)
     ↓
5. PROMOTE: extract styles to *.module.css, update production component
     ↓
6. UPDATE production *.stories.tsx
     ↓
7. VERIFY: npm run check-types && npm run build
     ↓
8. RUN: npm run i18n:extract && npm run i18n:sync
     ↓
9. DENYLIST: grep -rn 'defaultMessage="[A-Za-z]' src/components/{section}/
```

### 5A: Speed Showcase

- Directory: `apps/web/src/components/speed-showcase/`
- Enhancement: animated counter on scroll-in-view (using `motion`'s `whileInView`), progress bar race, dramatic data viz
- Korean copy: headline, subtitle, metric labels, highlight text
- POC: update existing `speed-showcase-poc.stories.tsx` or create v2

### 5B: Text Cleanup Showcase

- Directory: `apps/web/src/components/text-cleanup-showcase/`
- Korean demo sentence MUST replace English "I was... I was thinking, um..."
- Smoother animation via `motion` replacing raw `setTimeout` chains
- POC: update existing `text-cleanup-showcase-poc.stories.tsx` or create v2

### 5C: Privacy Showcase

- Directory: `apps/web/src/components/privacy-showcase/`
- Break the uniform 3-card grid — use asymmetric bento layout or single hero illustration
- Scroll-triggered staggered reveal
- Korean copy for all card titles, descriptions, section heading

### 5D: Offline Showcase

- Directory: `apps/web/src/components/offline-showcase/`
- More dramatic visual — animated toggle between states, or signal bars animation
- Scroll-triggered entrance
- Korean copy for heading, subtitle, row labels, status text

### 5E: Apps Carousel

- Directory: `apps/web/src/components/apps-carousel/`
- Actual carousel/marquee animation (infinite scroll), hover interaction
- Korean copy for heading, subtitle, badge

### Layout Diversity Requirement

> **MANDATORY**: At least 3 out of these 5 showcases MUST use structurally different layouts. Specifically, they must NOT all follow the pattern: `badge → h2 → p → visual`.

Required layout patterns (pick 3+ from):

- Visual-first (image/animation leads, text follows)
- Data-first (metric/number dominates, explanation below)
- Interactive-first (user interaction drives the reveal)
- Split-panel (50/50 or asymmetric horizontal split)
- Full-bleed (section breaks out of content width)

### Acceptance Criteria (aggregate for all 5)

- [ ] Korean `defaultMessage` throughout — `grep -rn 'defaultMessage="[A-Za-z]' src/components/{speed,text-cleanup,privacy,offline,apps-carousel}-showcase/` returns 0 for each
- [ ] All 5 POC stories compile in storybook build
- [ ] At least 3 different structural layouts across the 5 sections (document which)
- [ ] Each section has at least one scroll-triggered `motion` animation
- [ ] Text cleanup animation uses Korean demo sentence
- [ ] Apps carousel has perceptible motion (marquee, stagger, or interaction)
- [ ] Each section's color usage references new design tokens (not Voquill blues)
- [ ] `npm run build` passes
- [ ] `npm run i18n:extract && npm run i18n:sync` exits 0

### File Targets (aggregate)

- `apps/web/src/components/speed-showcase/` (all files)
- `apps/web/src/components/text-cleanup-showcase/` (all files)
- `apps/web/src/components/privacy-showcase/` (all files)
- `apps/web/src/components/offline-showcase/` (all files)
- `apps/web/src/components/apps-carousel/` (all files)

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build

# Per-section denylist:
for section in speed-showcase text-cleanup-showcase privacy-showcase offline-showcase apps-carousel; do
  echo "--- $section ---"
  grep -rn 'defaultMessage="[A-Za-z]' "src/components/$section/" && echo "FAIL: English defaults found" || echo "PASS"
  grep -rn "#2563eb\|#3b82f6" "src/components/$section/" && echo "FAIL: Voquill blue found" || echo "PASS"
done
```

### Rollback Strategy

- Each showcase is independent — `git checkout -- apps/web/src/components/{section}/`

### Definition of Done

- All 5 showcase POCs gate-passed → promoted → at least 3 distinct layout patterns → i18n synced → build passes.

---

## Phase 6: Pricing Section

### Storybook-First Gate

> **BLOCKING**: `pricing-section-poc.stories.tsx` MUST compile before production `index.tsx` is modified.

### Tasks

**6.1 Write Korean-first pricing copy**

- Plan names, descriptions, feature lists, billing labels, trust signal — all `defaultMessage` in Korean
- Pricing values ($0, $5, $50) remain as numbers

**6.2 Build pricing POC story**

- Update existing `apps/web/src/components/pricing-section/pricing-section-poc.stories.tsx`
- More visual pricing comparison (not just two flat cards)
- Toggle animation between monthly/yearly (smooth morph)
- Card hover interactions with depth
- Trust signal with subtle animation

**6.3 Promote POC to production**

- **GATE CHECK**: storybook build includes pricing POC story
- Update `apps/web/src/components/pricing-section/index.tsx`
- Update `apps/web/src/components/pricing-section/pricing-section.module.css`

**6.4 Incremental i18n extract+sync**

### Denylist Checks (Pricing-specific)

- [ ] Pricing cards MUST NOT use the exact Voquill combination: `background: var(--level1)` + `border: 1px solid var(--border)` + `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)` + flat layout
- [ ] `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/pricing-section/` returns 0

### File Targets

- `apps/web/src/components/pricing-section/` (all files)

### Acceptance Criteria

- [ ] Korean copy for all text content
- [ ] Billing toggle has smooth animation
- [ ] Card hover interaction with visible depth change
- [ ] Subscribe and download buttons functional
- [ ] Pricing cards visually distinct from Voquill flat-card pattern
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npx storybook build -o /tmp/sb-check
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -rn 'defaultMessage="[A-Za-z]' src/components/pricing-section/
```

### Rollback Strategy

- `git checkout -- apps/web/src/components/pricing-section/`

### Definition of Done

- Pricing POC gate passed → promoted → functional subscribe flow preserved → i18n synced → build passes.

---

## Phase 7: HomePage Composition & Section Transitions

### Tasks

**7.1 Replace uniform FadeInSection**

- File: `apps/web/src/pages/HomePage.tsx`
- Remove ALL `<FadeInSection>` wrappers
- Each section now owns its own scroll-triggered entrance (implemented in Phases 1–6)
- Add section-to-section transition effects where appropriate

**7.2 Update PageLayout**

- File: `apps/web/src/layouts/PageLayout.tsx`
- Adjust spacing, overflow, or scroll behavior for new section transitions
- Ensure footer CTA integrates naturally

**7.3 Full-page orchestration pass**

- Scroll performance (no jank at 60fps)
- Section transition order
- Mobile responsiveness across all sections

**7.4 Update BaseLayout meta copy**

- File: `apps/web/src/layouts/BaseLayout.tsx`
- Update `DEFAULT_TITLE` and `DEFAULT_DESCRIPTION` `defaultMessage` values to Korean

**7.5 Incremental i18n extract+sync**

### Denylist Checks (Composition-specific)

- [ ] `grep -c "FadeInSection" apps/web/src/pages/HomePage.tsx` returns 0
- [ ] `grep -c "fadeInSection\|fade-in-section" apps/web/src/pages/HomePage.tsx` returns 0
- [ ] `.main` in `page.module.css` does NOT use `gap: 120px` (uses variable)

### File Targets

- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/layouts/PageLayout.tsx`
- `apps/web/src/layouts/BaseLayout.tsx`
- `apps/web/src/components/common/fade-in-section.tsx` (deprecate or keep as utility)

### Acceptance Criteria

- [ ] HomePage has zero `<FadeInSection>` wrappers
- [ ] Varied entrance animations per section (not uniform)
- [ ] No layout shift (CLS) during transitions
- [ ] Scroll performance at 60fps
- [ ] Meta title and description are Korean defaults
- [ ] Full page renders correctly at 375px, 768px, and 1440px
- [ ] `npm run build` passes

### Verification Commands

```bash
cd apps/web
npm run i18n:extract && npm run i18n:sync
npm run check-types
npm run build
grep -c "FadeInSection" src/pages/HomePage.tsx  # must be 0
npm run preview  # manual scroll test
```

### Rollback Strategy

- `git checkout -- apps/web/src/pages/HomePage.tsx apps/web/src/layouts/`

### Definition of Done

- Full homepage scroll experience is cohesive, performant, Korean-first, and structurally distinct from Voquill.

---

## Phase 8: i18n Final Audit & Korean Consistency Gate

> Unlike v1 where this was the first time running extract/sync, by this point every phase has already run incremental extract+sync. This phase is a FINAL AUDIT to catch any drift.

### Tasks

**8.1 Full i18n extract**

```bash
cd apps/web && npm run i18n:extract
```

- Verify the output `ko.json` has no missing keys and no stale keys.

**8.2 Full i18n sync**

```bash
cd apps/web && npm run i18n:sync
```

- Propagates to all locale files.

**8.3 Korean consistency gate with allowlist**

```bash
cd apps/web
node -e "
  import fs from 'node:fs';
  const ko = JSON.parse(fs.readFileSync('src/i18n/locales/ko.json', 'utf8'));
  const allowlist = JSON.parse(fs.readFileSync('scripts/ko-ascii-allowlist.json', 'utf8'));
  const allowSet = new Set(allowlist);
  const asciiOnly = Object.entries(ko).filter(([k, v]) =>
    /^[\x00-\x7F]+$/.test(v) && !allowSet.has(v)
  );
  if (asciiOnly.length) {
    console.error('FAIL: Untranslated ASCII-only values in ko.json:');
    asciiOnly.forEach(([k, v]) => console.error('  ', k, '→', v));
    process.exit(1);
  }
  console.log('PASS: All ko.json values contain Korean characters or are in allowlist.');
"
```

**8.4 Verify `en.json` has English translations**

- For every key whose value in `en.json` is Korean (carried over from extract), provide English translation.
- Verification: `en.json` should have zero Korean-character-containing values (inverse of the `ko.json` gate).

```bash
cd apps/web
node -e "
  import fs from 'node:fs';
  const en = JSON.parse(fs.readFileSync('src/i18n/locales/en.json', 'utf8'));
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
  const untranslated = Object.entries(en).filter(([k, v]) => koreanPattern.test(v));
  if (untranslated.length) {
    console.error('FAIL: Korean values found in en.json (need English translation):');
    untranslated.forEach(([k, v]) => console.error('  ', k, '→', v));
    process.exit(1);
  }
  console.log('PASS: All en.json values are in English.');
"
```

**8.5 Browser locale test**

- Build and preview the app.
- Test: `localStorage.setItem('app-locale', 'ko')` → reload → full Korean
- Test: `localStorage.setItem('app-locale', 'en')` → reload → full English
- Verify: zero `react-intl` missing translation warnings in browser console

### File Targets

- `apps/web/src/i18n/locales/ko.json`
- `apps/web/src/i18n/locales/en.json`
- All other locale files in `apps/web/src/i18n/locales/`

### Acceptance Criteria

- [ ] `npm run i18n:extract` exits 0
- [ ] `npm run i18n:sync` exits 0
- [ ] Korean consistency gate passes (script above exits 0)
- [ ] English consistency gate passes (script above exits 0)
- [ ] `npm run build` passes
- [ ] App renders correctly in both `ko` and `en` locales
- [ ] Zero `react-intl` missing translation warnings in browser console

### Verification Commands

```bash
cd apps/web
npm run i18n:extract
npm run i18n:sync
npm run build
npm run preview
# Run both gate scripts above
# Manual browser locale toggle test
```

### Rollback Strategy

- `git checkout -- apps/web/src/i18n/locales/`

### Definition of Done

- i18n pipeline is clean, `ko.json` passes consistency gate, `en.json` has complete English, all locale files synced, build passes.

---

## Phase 9: Final Anti-Similarity Audit & QA

### Tasks

**9.1 Full Voquill denylist sweep**

Run the complete denylist table from the Anti-Similarity Guardrails section above. Every grep command must return 0 matches.

```bash
cd apps/web
echo "=== Voquill Denylist Sweep ==="
echo "Blue hex values:"
grep -rn "#2563eb\|#3b82f6\|#1d4ed8\|#60a5fa" src/styles/ src/components/ && echo "FAIL" || echo "PASS"
echo "Inter font:"
grep -rn '"Inter"' src/styles/ src/components/ && echo "FAIL" || echo "PASS"
echo "FadeInSection in HomePage:"
grep -c "FadeInSection" src/pages/HomePage.tsx && echo "FAIL" || echo "PASS: 0"
echo "Hardcoded 120px gap:"
grep -n "gap: 120px" src/styles/page.module.css && echo "FAIL" || echo "PASS"
echo "SonicWaveform imports:"
grep -rn "sonic-waveform\|SonicWaveform" src/components/hero/hero-section.tsx && echo "FAIL" || echo "PASS"
```

**9.2 Wispr differentiation documentation**

- Create `apps/web/COMPARISON.md` documenting 3+ specific motion differences per section between Vocally and Wispr.com
- This is documentation, not code — verifies intentionality of motion choices.

**9.3 Accessibility pass**

- All interactive elements have aria-labels (Korean default)
- Color contrast WCAG AA: 4.5:1 body text, 3:1 large text
- Keyboard navigation through all interactive elements
- `prefers-reduced-motion: reduce` disables complex animations

**9.4 Performance pass**

- Lighthouse Performance ≥ 90
- CLS < 0.1
- LCP < 2.5s
- Bundle size check: no unintended growth from `motion`

**9.5 Cross-browser check**

- Chrome, Firefox, Safari (macOS), Edge
- Mobile Safari, Chrome Mobile (responsive preview)

### Acceptance Criteria

- [ ] Voquill denylist sweep: ALL checks pass (0 matches on every grep)
- [ ] `COMPARISON.md` exists with ≥ 3 documented motion differences per section
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
# Full denylist sweep script above
# Lighthouse audit in Chrome DevTools
# Manual visual comparison
```

### Rollback Strategy

- Per-section rollback from any prior phase.

### Definition of Done

- Full revamp passes all quality gates — denylist verified, motion documented, Korean consistent, accessible, performant.

---

## Execution Order Summary

| Phase  | Section                               | Depends On | Estimated Effort | Key Deliverable                                 |
| ------ | ------------------------------------- | ---------- | ---------------- | ----------------------------------------------- |
| **−1** | i18n Infrastructure Fix               | —          | Small            | Unicode-safe IDs, extract→ko.json alignment     |
| **0**  | Foundation (tokens, fonts, Storybook) | Phase −1   | Small            | New palette, font, Storybook ko locale          |
| **1**  | Hero                                  | Phase 0    | Large            | Split-panel hero with spring physics            |
| **2**  | Site Header                           | Phase 0    | Medium           | Non-floating-pill header with scroll behavior   |
| **3**  | Site Footer                           | Phase 0    | Medium           | Non-card-in-page footer with CTA                |
| **4**  | Download Button                       | Phase 0    | Small            | New accent color button with micro-interactions |
| **5A** | Speed Showcase                        | Phase 0, 4 | Medium           | Animated counter data viz                       |
| **5B** | Text Cleanup Showcase                 | Phase 0    | Large            | Korean demo sentence, motion-based animation    |
| **5C** | Privacy Showcase                      | Phase 0    | Medium           | Asymmetric bento layout                         |
| **5D** | Offline Showcase                      | Phase 0    | Medium           | Animated state toggle                           |
| **5E** | Apps Carousel                         | Phase 0    | Medium           | Infinite scroll marquee                         |
| **6**  | Pricing Section                       | Phase 0, 4 | Large            | Toggle morph animation                          |
| **7**  | HomePage Composition                  | Phases 1–6 | Medium           | Section transitions, FadeInSection removal      |
| **8**  | i18n Final Audit                      | Phases 1–7 | Medium           | Consistency gates pass                          |
| **9**  | Final Audit & QA                      | Phase 8    | Medium           | Full denylist sweep, a11y, performance          |

**Critical path:** Phase −1 → Phase 0 → Phase 1 → Phase 7 → Phase 8 → Phase 9

**Parallelizable after Phase 0:** Phases 1, 2, 3, 4 (hero needs Phase 0; header, footer, button only need Phase 0). Phases 5A–5E can run in parallel after Phase 0 + Phase 4. Phase 6 can run in parallel with Phase 5.

---

## Risk Mitigations

| Risk                                                     | Likelihood | Impact   | Mitigation                                                                                                                                      |
| -------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Korean ID collisions after `formatjs-id.mjs` rewrite     | Medium     | Critical | Phase −1 includes explicit collision detection assertion in `formatjs-formatter.mjs`; smoke-test with existing messages before any copy changes |
| Korean copy quality — awkward phrasing                   | Medium     | High     | Have native Korean speaker review all `defaultMessage` strings before each promote step                                                         |
| `i18n:extract` target change breaks existing workflow    | Low        | High     | Phase −1 smoke-tests full pipeline with existing English messages before switching to Korean                                                    |
| Motion performance on low-end devices                    | Medium     | High     | `LazyMotion` + `domAnimation`; `prefers-reduced-motion` fallbacks; throttled CPU testing                                                        |
| Storybook breaking after major CSS changes               | Low        | Medium   | Phase 0 validates Storybook first; every phase gates on storybook build                                                                         |
| Voquill visual similarity persists                       | Medium     | High     | Measurable denylist grep commands at every phase + full sweep in Phase 9                                                                        |
| Scope coupling — CSS changes in one phase break another  | Medium     | High     | Explicit scope boundaries per phase (header selectors only, footer selectors only, etc.)                                                        |
| Build failures from TypeScript after component refactors | Low        | Medium   | `npm run check-types` after every promote step                                                                                                  |
| Allowlist drift — legitimate ASCII terms not covered     | Low        | Low      | `ko-ascii-allowlist.json` is a simple JSON array, easy to update; reviewed in Phase 8                                                           |

---

## Storybook-First Enforcement Protocol

Every section phase (1–6) follows this exact enforced workflow:

```
1. WRITE Korean copy (defaultMessage strings in Korean)
     ↓
2. CREATE *-poc.stories.tsx in isolation
     ↓
3. GATE: npx storybook build -o /tmp/sb-check
   → Must exit 0
   → Story file must appear in build output
   → If GATE FAILS: fix POC, do NOT touch production files
     ↓
4. REVIEW POC in Storybook:
   → Korean rendering correct?
   → Motion quality acceptable?
   → Denylist check passes for this section?
     ↓
5. PROMOTE: extract styles to *.module.css, update production component
     ↓
6. UPDATE production *.stories.tsx
     ↓
7. VERIFY: npm run check-types && npm run build
     ↓
8. i18n: npm run i18n:extract && npm run i18n:sync
     ↓
9. DENYLIST: section-specific grep checks (documented per phase above)
```

**Rule**: Steps 5–9 are BLOCKED until step 3 passes. No exceptions.

---

## i18n Pipeline (Corrected for Korean-First)

```
INFRASTRUCTURE (Phase −1):
  formatjs-id.mjs → Unicode-safe ID generation
  package.json → i18n:extract --out-file ko.json
  i18n-sync.mjs → already reads ko.json as base (no change)
  ko-ascii-allowlist.json → enumerated legitimate ASCII terms

AUTHORING (Phases 1–7):
  Component code → defaultMessage="한국어 텍스트"
     ↓
  babel-plugin-formatjs → calls formatjsOverrideIdFn → produces stable ID
     ↓
  (incremental after each promote step)
  npm run i18n:extract → writes ko.json (Korean defaults as values)
     ↓
  npm run i18n:sync → propagates keys to en.json, es.json, etc.
     (new keys in en.json get Korean fallback → must be translated)

FINAL AUDIT (Phase 8):
  Full extract + sync
     ↓
  Korean consistency gate (ko.json: no unexpected ASCII-only values)
     ↓
  English consistency gate (en.json: no Korean-character values)
     ↓
  Browser toggle test (ko ↔ en, zero missing translation warnings)
```
