# Vocally Web Surface Architecture — Complete Index

**Generated:** February 17, 2026  
**Scope:** `apps/web` (marketing site + payment/auth funnel)  
**Phase:** Pre-redesign analysis  
**Status:** ✅ Complete and ready for implementation

---

## 📚 Documentation Overview

This comprehensive analysis consists of **3 interconnected documents** designed to support a major web surface redesign while preserving all existing routes and functional logic.

### Documents

#### 1. **VOCALLY_WEB_ARCHITECTURE_INVENTORY.md** (37 KB)

**Purpose:** Complete structural reference  
**Contents:**

- Route map (11 routable pages)
- Layout layer breakdown (BaseLayout, PageLayout)
- Section layer inventory (7 reusable showcase components)
- Component layer (UI primitives, buttons, modals)
- Cross-cutting dependencies (i18n, auth, downloads, payments, analytics)
- Style ownership boundaries (CSS module map)
- Copy & metadata inventory (where text lives)
- Data & state management (local + context)
- Functional logic flows (download, auth, payment)
- Redesign readiness assessment
- File tree summary

**Best for:** Understanding the complete architecture, finding specific components, planning large refactors

---

#### 2. **VOCALLY_WEB_ARCHITECTURE_DIAGRAMS.md** (31 KB)

**Purpose:** Visual reference for data flow and dependencies  
**Contents:**

- Component hierarchy diagram
- Page rendering flow (BaseLayout → PageLayout → Sections)
- Auth state flow (sign-in, user context, header updates)
- i18n translation workflow (component → Babel → extract → sync → runtime)
- Download flow (platform detection → manifest → variants)
- Sign-in & payment flow (modal → OAuth/email → checkout → success)
- File dependency graph (pages, utilities, shared)
- Styling system architecture (CSS variables, scopes, inheritance)
- State management isolation (local + context)
- Section composition on HomePage
- Type & props flow
- Cross-cutting dependencies map

**Best for:** Understanding how pieces fit together, presenting to non-technical stakeholders, debugging integration issues

---

#### 3. **VOCALLY_WEB_REDESIGN_QUICK_REFERENCE.md** (16 KB)

**Purpose:** Practical implementation guide  
**Contents:**

- TL;DR decision table (what's safe to change)
- Key files by category (entry points, layouts, styles, sections)
- Copy locations and update workflow
- Component structure (safe to redesign vs. must preserve)
- Common redesign tasks with code examples
- Testing checklist (functional, navigation, auth, downloads, payments, i18n, analytics)
- Dependencies you can't remove
- Build & deploy commands
- Environment variables
- Key decision points (Q&A)
- Performance considerations
- Common gotchas
- Next steps

**Best for:** Hands-on development, quick lookups during implementation, testing guides

---

## 🎯 Quick Navigation

### I want to...

#### **Understand the overall structure**

→ Start with INVENTORY (Routes & Page Layer section)

#### **Know what I can/cannot change**

→ Go to QUICK_REFERENCE (TL;DR table)

#### **See how authentication works**

→ Check DIAGRAMS (Auth State Flow section) + INVENTORY (Cross-Cutting Dependencies → Authentication)

#### **Change button colors globally**

→ QUICK_REFERENCE (Task 1: Change Button Colors) + INVENTORY (Style Ownership & Boundaries)

#### **Update pricing page copy**

→ QUICK_REFERENCE (Task 2: Change Hero Text) + INVENTORY (Copy & Metadata Inventory)

#### **Redesign pricing cards**

→ QUICK_REFERENCE (Task 3: Redesign Pricing Cards) + INVENTORY (Section Layer → PricingSection)

#### **Reorder sections on homepage**

→ QUICK_REFERENCE (Task 4: Reorder Sections) + DIAGRAMS (Section Composition on HomePage)

#### **Understand download flow**

→ DIAGRAMS (Download Flow section) + INVENTORY (Cross-Cutting Dependencies → Download Links)

#### **Know what tests to run**

→ QUICK_REFERENCE (Testing Checklist After Redesign)

#### **See file locations for specific components**

→ INVENTORY (File Tree Summary)

#### **Understand CSS scoping**

→ DIAGRAMS (Styling System Architecture) + INVENTORY (Style Ownership & Boundaries)

---

## 🚀 Quick Start for Redesign Teams

### Phase 1: Analysis (You are here)

- ✅ Read INVENTORY executive summary
- ✅ Skim DIAGRAMS for visual understanding
- ✅ Review QUICK_REFERENCE TL;DR table
- ✅ Share documents with design team

### Phase 2: Planning

- Identify CSS/styling changes needed (QUICK_REFERENCE colors, fonts, spacing)
- Identify component restructuring (reorder sections, redesign cards)
- Create design mockups showing desired changes
- Map changes to files (use File Tree Summary)

### Phase 3: Implementation

- Update global styles (global.css)
- Update shared styles (page.module.css)
- Update section component CSS and JSX
- Update copy if needed (run i18n:extract + sync)
- Test using provided checklist

### Phase 4: Verification

- Run all tests in Testing Checklist
- Verify no cross-cutting concerns broken (auth, downloads, payments)
- Deploy to Vercel

---

## 🔑 Key Insights

### 1. Clean Separation of Concerns

The web app cleanly separates:

- **Styling** (CSS Modules, no globals)
- **Structure** (Components, pure composition)
- **Logic** (Hooks, context, utilities)

This enables styling/UX redesign **without touching functional code**.

### 2. All Routes Are Preserved

The route structure is fixed:

- `/` (home)
- `/download` (installers)
- `/pricing` (plans)
- `/privacy`, `/terms`, `/refund` (legal)
- `/auth/confirmed`, `/checkout/success`, `/checkout/cancel` (flows)

**Any redesign must preserve these URLs.** External links, bookmarks, and SEO depend on them.

### 3. Three Layers of Dependencies

**Must-Keep (Core):**

- Routes (App.tsx)
- Layout system (BaseLayout, PageLayout)
- Context system (auth-context)
- Integration clients (supabase, downloads.tsx)

**Can-Redesign (Safe):**

- All CSS/styling
- Component JSX structure
- Section order/arrangement
- Copy (with i18n workflow)

**Risky to Touch:**

- i18n extraction/sync system
- Auth providers (Supabase OAuth)
- Payment provider (Polar)
- GitHub release format

### 4. All Copy Is Internationalized

Every user-visible string uses `<FormattedMessage>`. Update workflow:

1. Edit component
2. Run `npm run i18n:extract`
3. Run `npm run i18n:sync`
4. Translators update foreign JSON files

This ensures **no broken links** in foreign versions.

### 5. No Global App State

The web app uses **zero Zustand store** (unlike desktop). All state is:

- Local component state (for animations, toggles)
- React Context (for auth)
- External services (Supabase, Polar)

This simplifies redesign because there's no complex state to preserve.

---

## 📊 Architecture Stats

| Metric                      | Count  | Notes                                         |
| --------------------------- | ------ | --------------------------------------------- |
| **Routable Pages**          | 11     | All preserved in redesign                     |
| **Section Components**      | 7      | Reusable, composable, mostly stateless        |
| **UI Primitive Components** | 6+     | Buttons, modals, icons, helpers               |
| **CSS Modules**             | 12     | All scoped, no globals                        |
| **Global Dependencies**     | 5      | i18n, auth, downloads, supabase, analytics    |
| **Layout Components**       | 2      | BaseLayout (metadata), PageLayout (structure) |
| **Lines of JSX (pages)**    | ~300   | Mostly composition, minimal logic             |
| **Lines of CSS**            | ~1000+ | Scoped across 12 modules                      |
| **Languages Supported**     | 4      | English, Spanish, French, Korean              |

---

## 🛠️ Technology Stack

| Layer         | Technology                 | Notes                             |
| ------------- | -------------------------- | --------------------------------- |
| **Framework** | React 18                   | Hooks-based                       |
| **Router**    | React Router v6            | Client-side routing               |
| **Styling**   | CSS Modules                | Component-scoped, no conflicts    |
| **i18n**      | react-intl                 | Message-based, auto-extracted     |
| **Auth**      | Supabase Auth              | Google, Kakao, email/password     |
| **Payments**  | Polar + Supabase Functions | Edge function invokes Polar API   |
| **Backend**   | Supabase                   | Auth, functions, storage          |
| **Hosting**   | Vercel                     | Static SPA, auto-deploy on push   |
| **Build**     | Vite                       | Fast dev server, optimized builds |
| **CI/CD**     | GitHub Actions             | Lint, type-check, tests, deploy   |

---

## ✅ Pre-Redesign Checklist

Before starting your redesign, ensure:

- [ ] All 3 documentation files reviewed by team
- [ ] Design mockups created based on current structure
- [ ] Understanding of i18n workflow for copy changes
- [ ] Understanding of CSS module scoping
- [ ] Agreement on which sections to reorder/redesign
- [ ] Agreement on color/typography changes
- [ ] Environment variables configured (.env.local)
- [ ] Local dev environment working (`npm run dev`)
- [ ] i18n extraction/sync tested
- [ ] Testing checklist saved for QA phase

---

## ⚠️ Critical Constraints

### DO NOT Change (Breaking)

1. **Route structure** — External links depend on `/download`, `/pricing`, etc.
2. **Page components** — Removing pages breaks bookmarks and SEO
3. **i18n Babel plugin** — Core part of build pipeline
4. **Supabase client** — Required for auth, payments, functions
5. **Auth providers** — Changing from Supabase requires new OAuth setup
6. **Payment provider** — Changing from Polar requires new product IDs, webhooks

### MUST Update (If Changed)

1. **Copy/text** → Run i18n:extract + sync
2. **Component props** → Check dependent components still receive props
3. **CSS module names** → Update component imports
4. **Environment variables** → Update .env.local

### SAFE to Change (Isolated)

1. All CSS/styling
2. Component visual structure
3. Button labels (with i18n update)
4. Section order on HomePage
5. Icon/image sources
6. Animation timing
7. Responsive breakpoints
8. Color scheme (via CSS variables)

---

## 📞 Common Questions

### Q: Can I remove unused sections?

**A:** Yes, from HomePage.tsx. But don't delete the component files in case they're needed later.

### Q: Can I add new sections?

**A:** Yes. Create a new component, follow the pattern of existing sections (module-scoped CSS, FormattedMessage for text), and compose it in HomePage.

### Q: Can I change the color scheme?

**A:** Yes, easiest way is update CSS variables in page.module.css + global.css.

### Q: Do I need to update translation files?

**A:** Only if you change copy. Layout/styling changes don't require translation updates.

### Q: What if a design requires new routes?

**A:** You can add new pages, but don't remove or rename existing ones. New routes won't break anything, just add new URLs.

### Q: Can I use Tailwind instead of CSS Modules?

**A:** Not recommended in phase 1 (would require rewriting all CSS). CSS Modules are fine and scoped well.

### Q: What's the deployment process?

**A:** Push to `main` branch → GitHub Actions runs tests → Vercel auto-deploys.

### Q: How do I test locally?

**A:** `npm run dev` from apps/web, opens http://localhost:3000, hot reloads on changes.

---

## 📖 Document Structure Map

```
VOCALLY_WEB_ARCHITECTURE_INVENTORY.md
├── Executive Summary
├── Routes & Page Layer
├── Layout Layer
├── Section Layer
├── Component Layer
├── Cross-Cutting Dependencies
│   ├── i18n
│   ├── Authentication
│   ├── Downloads
│   ├── Payments
│   └── Analytics
├── Style Ownership & Boundaries
├── Copy & Metadata Inventory
├── Data & State Management
├── Functional Logic & Integrations
├── Redesign Readiness Assessment
├── File Tree Summary
└── Appendix: Boundary Definitions

VOCALLY_WEB_ARCHITECTURE_DIAGRAMS.md
├── Component Hierarchy Diagram
├── Data Flow Architecture
│   ├── Page Rendering Flow
│   ├── Auth State Flow
│   ├── i18n Workflow
│   ├── Download Flow
│   └── Sign-In & Payment Flow
├── File Dependency Graph
├── Styling System Architecture
├── State Management Architecture
├── Section Composition (HomePage)
├── Type & Props Flow
└── Cross-Cutting Dependencies Map

VOCALLY_WEB_REDESIGN_QUICK_REFERENCE.md
├── TL;DR Table
├── Key Files by Category
├── Copy Locations & Update Workflow
├── Component Structure (Safe vs. Preserve)
├── Common Redesign Tasks (5 examples with code)
├── Testing Checklist
├── Dependencies You Can't Remove
├── Build & Deploy
├── Environment Variables
├── Key Decision Points
├── Performance Considerations
├── Common Gotchas
└── Next Steps
```

---

## 🎓 Learning Path

**For Design Team:**

1. Read INVENTORY → Executive Summary + Routes & Page Layer
2. Browse DIAGRAMS → Component Hierarchy, Section Composition
3. Skip QUICK_REFERENCE (dev guide)

**For Frontend Developers:**

1. Read INVENTORY → All sections
2. Study DIAGRAMS → Data Flow, Dependencies
3. Reference QUICK_REFERENCE during implementation

**For Project Managers:**

1. Read INVENTORY → Executive Summary + Redesign Readiness Assessment
2. Skim DIAGRAMS → Component Hierarchy
3. Review QUICK_REFERENCE → Next Steps section

**For QA/Testing:**

1. Skip INVENTORY technical details
2. Skip DIAGRAMS
3. Use QUICK_REFERENCE → Testing Checklist as test cases

---

## 🔗 Related Documentation

Also see:

- `docs/` folder (architecture notes for desktop app)
- `README.md` (project overview)
- `AGENTS.md` (instructions for development)
- Package READMEs (packages/\* directories)

---

## 📝 Version History

| Date       | Author                | Changes                                   |
| ---------- | --------------------- | ----------------------------------------- |
| 2026-02-17 | Architecture Analysis | Initial complete analysis, 3-document set |

---

## 📌 Key Files at a Glance

**Must Read First:**

- This file (VOCALLY_WEB_ARCHITECTURE_INDEX.md)
- VOCALLY_WEB_ARCHITECTURE_INVENTORY.md (Executive Summary section)

**Reference During Design:**

- VOCALLY_WEB_ARCHITECTURE_DIAGRAMS.md

**Reference During Development:**

- VOCALLY_WEB_REDESIGN_QUICK_REFERENCE.md

**Source Code:**

- `apps/web/src/App.tsx` (routes)
- `apps/web/src/pages/` (page components)
- `apps/web/src/components/` (UI components)
- `apps/web/src/styles/` (CSS)
- `apps/web/src/context/` (state/hooks)

---

## ✨ Summary

**Status:** Vocally web app is **ready for a complete visual/UX redesign** while preserving all functional routes and logic.

**Key Strengths:**

- ✅ Clean component separation (sections are reusable, stateless, composable)
- ✅ Module-scoped CSS (no global conflicts, safe to modify)
- ✅ Clear dependency boundaries (auth, downloads, payments are isolated)
- ✅ Internationalization built-in (no broken translations)
- ✅ No complex global state (just local state + context)

**Design Constraints:**

- ❌ Do NOT change route structure
- ❌ Do NOT remove authentication system
- ❌ Do NOT change payment provider without planning
- ⚠️ Must run i18n:extract/sync after copy changes

**Implementation Path:**

1. Update global CSS (fonts, colors, variables)
2. Update section component CSS (reposition, restyle)
3. Update section component JSX (if structure changes)
4. Run i18n workflow (if copy changed)
5. Test thoroughly
6. Deploy to Vercel

---

**Questions? Issues?** Refer to the detailed documentation, or reach out to the development team.

This analysis is complete and production-ready. 🚀
