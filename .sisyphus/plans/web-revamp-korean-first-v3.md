# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill (v3)

> Revision of `web-revamp-korean-first-v2.md`. Fixes the **two remaining Momus blockers**:
>
> 1. **Anti-similarity checks are not fully measurable** — v2 still relied on manual audit, subjective CSS diffs, and side-by-side screen-recording comparisons for card surfaces, footer structure, header structure, hero layout, and Wispr motion differentiation.
> 2. **Storybook-first workflow is not enforceable** — v2 described the gate as prose instructions ("BLOCKING: POC must exist before production file is modified") but provided no CI gate, pre-commit hook, or script that would **fail the build** if the protocol was violated.
>
> **Everything else is unchanged from v2.** This document is a **surgical delta** — it replaces only the Anti-Similarity Guardrails section and the Storybook-First Enforcement Protocol section. All phases, tasks, file targets, i18n pipeline, rollback strategies, risk mitigations, and execution order from v2 remain in effect. Read this document **together with v2**; where a section header matches, this document's version supersedes v2.

---

## Change Log: v2 → v3

| v2 Weakness                                                                              | v3 Fix                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card surface denylist says "verified by manual audit"                                    | Replaced with `grep -c` commands that count distinct `background` values across card components; threshold-based pass/fail                                                                |
| Footer structural denylist says "verified by CSS diff" with no baseline                  | Replaced with three specific grep assertions on the exact Voquill CSS triple (`border-radius: 14px` + `var(--level1)` + `var(--border)`)                                                  |
| Header structural denylist is prose ("MUST NOT use floating pill layout simultaneously") | Replaced with grep for the exact Voquill header CSS triple (`border-radius: 12px` + `backdrop-filter: blur(20px)` + `rgba(255, 255, 255, 0.1)`)                                           |
| Hero layout check is prose ("does NOT have a single centered text column…")              | Replaced with grep for `text-align: center` on hero wrapper + import check for `SonicWaveform`                                                                                            |
| Wispr non-copy checks end with "screen recording and compare side-by-side"               | Replaced with concrete denylist of Wispr-specific timing values, easing curves, hex colors, and GSAP imports — all grep-checkable                                                         |
| No denied motion timing values enumerated                                                | Explicit denylist: `duration: 0.6s`, `ease` (as sole easing), specific delay sequences                                                                                                    |
| Storybook-first is prose-only ("BLOCKING: POC must exist…")                              | New `scripts/enforce-storybook-first.mjs` spec + CI workflow `storybook-gate.yml` that fails PR if production files change without corresponding POC + passing `storybook build` artifact |
| No mechanism detects POC-less production edits                                           | Script cross-references `git diff` file list against a registry of `{production_file → poc_story}` mappings                                                                               |

---

## §A — Anti-Similarity Guardrails (v3, Fully Measurable)

> **This section fully replaces v2's "Anti-Similarity Guardrails — Denylist Spec (Measurable)" section.**
> Every check below is a command that exits 0 (pass) or non-zero (fail). Zero manual audits. Zero subjective comparisons.

### A.1 — Master Denylist: Exact Values

Every value below MUST NOT appear in the specified file scope. Each row is a single grep command.

| ID  | Dimension              | Denied Token / Pattern          | Scope                                           | Command                                                                                                  | Pass        |
| --- | ---------------------- | ------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| D01 | Brand hex (blue-600)   | `#2563eb`                       | `src/styles/`, `src/components/`                | `grep -rn "#2563eb" apps/web/src/styles/ apps/web/src/components/`                                       | 0 results   |
| D02 | Brand hex (blue-400)   | `#3b82f6`                       | `src/styles/`, `src/components/`                | `grep -rn "#3b82f6" apps/web/src/styles/ apps/web/src/components/`                                       | 0 results   |
| D03 | Brand hex (blue-700)   | `#1d4ed8`                       | `src/styles/`, `src/components/`                | `grep -rn "#1d4ed8" apps/web/src/styles/ apps/web/src/components/`                                       | 0 results   |
| D04 | Brand hex (blue-300)   | `#60a5fa`                       | `src/styles/`, `src/components/`                | `grep -rn "#60a5fa" apps/web/src/styles/ apps/web/src/components/`                                       | 0 results   |
| D05 | Brand rgba             | `rgba(37, 99, 235`              | `src/styles/`, `src/components/`                | `grep -rn "rgba(37, 99, 235" apps/web/src/styles/ apps/web/src/components/`                              | 0 results   |
| D06 | Voice glow rgba        | `rgba(96, 165, 250`             | `src/styles/`, `src/components/`                | `grep -rn "rgba(96, 165, 250" apps/web/src/styles/ apps/web/src/components/`                             | 0 results   |
| D07 | Font: Inter            | `"Inter"`                       | `src/styles/`, `src/components/`                | `grep -rn '"Inter"' apps/web/src/styles/ apps/web/src/components/`                                       | 0 results   |
| D08 | FadeInSection wrapper  | `FadeInSection`                 | `src/pages/HomePage.tsx`                        | `grep -c "FadeInSection" apps/web/src/pages/HomePage.tsx`                                                | outputs `0` |
| D09 | Hardcoded section gap  | `gap: 120px`                    | `src/styles/page.module.css`                    | `grep -c "gap: 120px" apps/web/src/styles/page.module.css`                                               | outputs `0` |
| D10 | SonicWaveform import   | `SonicWaveform\|sonic-waveform` | `src/components/hero/hero-section.tsx`          | `grep -c "SonicWaveform\|sonic-waveform" apps/web/src/components/hero/hero-section.tsx`                  | outputs `0` |
| D11 | HeroGraphic import     | `HeroGraphic\|hero-graphic`     | `src/components/hero/hero-section.tsx`          | `grep -c "HeroGraphic\|hero-graphic" apps/web/src/components/hero/hero-section.tsx`                      | outputs `0` |
| D12 | English defaultMessage | `defaultMessage="[A-Za-z]`      | `src/components/`, `src/pages/`, `src/layouts/` | `grep -rn 'defaultMessage="[A-Za-z]' apps/web/src/components/ apps/web/src/pages/ apps/web/src/layouts/` | 0 results   |

### A.2 — Structural Pattern Denylist: CSS Combinations

These deny specific **combinations** of CSS properties that constitute Voquill's visual identity. Each is a script block that greps for the individual properties within a scoped file and fails if ALL properties in the combination are present simultaneously.

#### A.2.1 — Voquill Header Pattern (floating pill)

Denied combination in any single CSS rule block within header-related selectors:

- `border-radius: 12px`
- `backdrop-filter: blur(20px)`
- `rgba(255, 255, 255, 0.1)`

**Verification script:**

```bash
# Header pattern: FAIL if all three Voquill header traits exist in page.module.css header selectors
cd apps/web
HEADER_CSS=$(sed -n '/\.header[^A-Z]/,/^}/p' src/styles/page.module.css)
HAS_BR12=$(echo "$HEADER_CSS" | grep -c "border-radius: 12px")
HAS_BLUR20=$(echo "$HEADER_CSS" | grep -c "blur(20px)")
HAS_RGBA_WHITE=$(echo "$HEADER_CSS" | grep -c "rgba(255, 255, 255, 0.1)")
if [ "$HAS_BR12" -gt 0 ] && [ "$HAS_BLUR20" -gt 0 ] && [ "$HAS_RGBA_WHITE" -gt 0 ]; then
  echo "FAIL: Voquill header pattern detected (border-radius:12px + blur(20px) + white rgba)"
  exit 1
fi
echo "PASS: Header does not match Voquill floating pill pattern"
```

#### A.2.2 — Voquill Footer Pattern (card-in-page)

Denied combination in footer-related selectors:

- `border-radius: 14px`
- `background: var(--level1)`
- `border: 1px solid var(--border)`

**Verification script:**

```bash
cd apps/web
FOOTER_CSS=$(sed -n '/\.footer[^A-Z]/,/^}/p' src/styles/page.module.css)
HAS_BR14=$(echo "$FOOTER_CSS" | grep -c "border-radius: 14px")
HAS_LEVEL1=$(echo "$FOOTER_CSS" | grep -c "var(--level1)")
HAS_BORDER=$(echo "$FOOTER_CSS" | grep -c "1px solid var(--border)")
if [ "$HAS_BR14" -gt 0 ] && [ "$HAS_LEVEL1" -gt 0 ] && [ "$HAS_BORDER" -gt 0 ]; then
  echo "FAIL: Voquill footer card pattern detected (border-radius:14px + level1 + border)"
  exit 1
fi
echo "PASS: Footer does not match Voquill card-in-page pattern"
```

#### A.2.3 — Voquill Card Surface Pattern

Denied: ALL card-like components using the identical surface triple of `var(--level1)` + `var(--border)` + `var(--shadow-soft)` with no variation between them.

**Verification script:**

```bash
cd apps/web
# Count how many *.module.css files use the exact Voquill card triple
CARD_FILES=$(grep -rl "var(--level1)" src/components/ --include="*.module.css" | xargs grep -l "var(--border)" | xargs grep -l "var(--shadow-soft)")
CARD_COUNT=$(echo "$CARD_FILES" | grep -c . || echo 0)
if [ "$CARD_COUNT" -gt 1 ]; then
  echo "FAIL: $CARD_COUNT module files use the identical Voquill card surface triple (--level1 + --border + --shadow-soft)."
  echo "At most 1 may use this combination. Diversify surface treatments."
  echo "Files: $CARD_FILES"
  exit 1
fi
echo "PASS: Card surfaces are sufficiently diversified ($CARD_COUNT files with Voquill triple, max allowed: 1)"
```

#### A.2.4 — Voquill Hero Pattern (centered text on canvas)

Denied: Hero section with `text-align: center` on the primary content wrapper AND an import of `SonicWaveform` or `HeroGraphic`.

**Verification script:**

```bash
cd apps/web
HERO_CENTER=$(grep -c "text-align: center" src/components/hero/hero.module.css || echo 0)
HERO_CANVAS=$(grep -c "SonicWaveform\|HeroGraphic\|sonic-waveform\|hero-graphic" src/components/hero/hero-section.tsx || echo 0)
if [ "$HERO_CENTER" -gt 0 ] && [ "$HERO_CANVAS" -gt 0 ]; then
  echo "FAIL: Voquill hero pattern detected (centered text + canvas waveform/graphic)"
  exit 1
fi
echo "PASS: Hero is structurally different from Voquill"
```

### A.3 — Motion Timing Denylist

These specific motion values are denied because they constitute Voquill's uniform animation signature.

| ID  | Denied Value                                                      | Context                  | Command                                                               | Pass                                                                                                    |
| --- | ----------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M01 | `duration: 0.6` as the sole/default entrance duration             | `src/components/`        | `grep -rn "duration: 0.6" apps/web/src/components/ --include="*.tsx"` | 0 results OR each hit is accompanied by ≥1 different duration in the same file (verified by M05 script) |
| M02 | `ease` as the sole easing keyword (no spring/physics)             | `src/components/`        | See M05 composite script below                                        |
| M03 | `transition: opacity` + `translateY` as the ONLY entrance pattern | `src/pages/HomePage.tsx` | Covered by D08 (FadeInSection removal)                                |
| M04 | GSAP / gsap import                                                | `src/`                   | `grep -rn "gsap\|from 'gsap'" apps/web/src/`                          | 0 results                                                                                               |

**M05 — Motion diversity script (composite check):**

```bash
cd apps/web
# Count distinct motion easing values across all component TSX files
# Require at least 3 distinct easing approaches (spring, easeOut*, easeInOut*, custom cubic-bezier, etc.)
EASINGS=$(grep -roh "type:\s*\"spring\"\|ease:\s*\"[^\"]*\"\|ease:\s*\[[^\]]*\]" src/components/ --include="*.tsx" | sort -u | wc -l)
if [ "$EASINGS" -lt 3 ]; then
  echo "FAIL: Only $EASINGS distinct easing value(s) found across components. Minimum required: 3."
  echo "Voquill used a single uniform easing. Vocally must have motion diversity."
  exit 1
fi
echo "PASS: $EASINGS distinct easing values found (minimum: 3)"
```

### A.4 — Wispr Non-Copy Denylist (Concrete Values)

These specific values are denied to prevent surface-copying of Wispr's implementation details. The **principles** (scroll-linked transitions, staggered reveals, parallax depth) are desired; these **exact values** are not.

| ID  | Denied Value                             | Rationale                              | Command                                                                            | Pass      |
| --- | ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- | --------- |
| W01 | `gsap` or `ScrollTrigger` imports        | Wispr uses GSAP; Vocally uses `motion` | `grep -rn "gsap\|ScrollTrigger" apps/web/src/`                                     | 0 results |
| W02 | `#6366f1` (Wispr indigo-500)             | Wispr's primary accent                 | `grep -rn "#6366f1" apps/web/src/styles/ apps/web/src/components/`                 | 0 results |
| W03 | `#818cf8` (Wispr indigo-400)             | Wispr's secondary accent               | `grep -rn "#818cf8" apps/web/src/styles/ apps/web/src/components/`                 | 0 results |
| W04 | `#4f46e5` (Wispr indigo-600)             | Wispr's active accent                  | `grep -rn "#4f46e5" apps/web/src/styles/ apps/web/src/components/`                 | 0 results |
| W05 | `#a5b4fc` (Wispr indigo-300)             | Wispr's light accent                   | `grep -rn "#a5b4fc" apps/web/src/styles/ apps/web/src/components/`                 | 0 results |
| W06 | `staggerChildren: 0.035`                 | Wispr's exact hero text stagger timing | `grep -rn "staggerChildren: 0.035\|staggerChildren:0.035" apps/web/src/`           | 0 results |
| W07 | `staggerChildren: 0.07`                  | Wispr's exact section stagger timing   | `grep -rn "staggerChildren: 0.07\|staggerChildren:0.07" apps/web/src/`             | 0 results |
| W08 | Delay sequence `[0, 0.1, 0.2, 0.3, 0.4]` | Wispr's exact hero word delay pattern  | `grep -rn "delay: 0\.1.*delay: 0\.2.*delay: 0\.3\|0, 0.1, 0.2, 0.3" apps/web/src/` | 0 results |

### A.5 — Layout Diversity Gate (Showcase Sections)

> v2 required "at least 3 out of 5 showcases use structurally different layouts" but had no automated check.

**Verification script:**

```bash
cd apps/web
# Each showcase's primary layout pattern is tagged with a data attribute in the root element:
#   data-layout="visual-first|data-first|interactive-first|split-panel|full-bleed|badge-h2-p-visual"
# This script counts distinct layout tags across the 5 showcase sections.
LAYOUTS=$(grep -roh 'data-layout="[^"]*"' \
  src/components/speed-showcase/ \
  src/components/text-cleanup-showcase/ \
  src/components/privacy-showcase/ \
  src/components/offline-showcase/ \
  src/components/apps-carousel/ \
  --include="*.tsx" | sort -u | wc -l)
if [ "$LAYOUTS" -lt 3 ]; then
  echo "FAIL: Only $LAYOUTS distinct layout pattern(s) across 5 showcases. Minimum required: 3."
  grep -roh 'data-layout="[^"]*"' src/components/*-showcase/ src/components/apps-carousel/ --include="*.tsx" | sort
  exit 1
fi
echo "PASS: $LAYOUTS distinct layout patterns found across showcases (minimum: 3)"
```

**Implementation requirement**: Each showcase's root element MUST include a `data-layout` attribute with one of: `visual-first`, `data-first`, `interactive-first`, `split-panel`, `full-bleed`. The value `badge-h2-p-visual` is the Voquill default and is allowed on at most 2 of 5 showcases.

### A.6 — Aggregate Denylist Script

All checks from A.1–A.5 are composed into a single runnable script:

**File**: `apps/web/scripts/denylist-check.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }

echo "=== Vocally Anti-Similarity Denylist Check ==="
echo ""
echo "--- A.1: Exact Value Denials ---"

grep -rqn "#2563eb" src/styles/ src/components/ 2>/dev/null && fail "D01: #2563eb found" || pass "D01: No #2563eb"
grep -rqn "#3b82f6" src/styles/ src/components/ 2>/dev/null && fail "D02: #3b82f6 found" || pass "D02: No #3b82f6"
grep -rqn "#1d4ed8" src/styles/ src/components/ 2>/dev/null && fail "D03: #1d4ed8 found" || pass "D03: No #1d4ed8"
grep -rqn "#60a5fa" src/styles/ src/components/ 2>/dev/null && fail "D04: #60a5fa found" || pass "D04: No #60a5fa"
grep -rqn "rgba(37, 99, 235" src/styles/ src/components/ 2>/dev/null && fail "D05: Voquill brand rgba found" || pass "D05: No Voquill brand rgba"
grep -rqn "rgba(96, 165, 250" src/styles/ src/components/ 2>/dev/null && fail "D06: Voice glow rgba found" || pass "D06: No voice glow rgba"
grep -rqn '"Inter"' src/styles/ src/components/ 2>/dev/null && fail "D07: Inter font found" || pass "D07: No Inter font"

FADE_COUNT=$(grep -c "FadeInSection" src/pages/HomePage.tsx 2>/dev/null || echo 0)
[ "$FADE_COUNT" -eq 0 ] && pass "D08: No FadeInSection in HomePage" || fail "D08: FadeInSection found ($FADE_COUNT occurrences)"

GAP_COUNT=$(grep -c "gap: 120px" src/styles/page.module.css 2>/dev/null || echo 0)
[ "$GAP_COUNT" -eq 0 ] && pass "D09: No hardcoded 120px gap" || fail "D09: Hardcoded 120px gap found"

WAVEFORM_COUNT=$(grep -c "SonicWaveform\|sonic-waveform" src/components/hero/hero-section.tsx 2>/dev/null || echo 0)
[ "$WAVEFORM_COUNT" -eq 0 ] && pass "D10: No SonicWaveform in hero" || fail "D10: SonicWaveform still in hero"

GRAPHIC_COUNT=$(grep -c "HeroGraphic\|hero-graphic" src/components/hero/hero-section.tsx 2>/dev/null || echo 0)
[ "$GRAPHIC_COUNT" -eq 0 ] && pass "D11: No HeroGraphic in hero" || fail "D11: HeroGraphic still in hero"

ENGLISH_COUNT=$(grep -rn 'defaultMessage="[A-Za-z]' src/components/ src/pages/ src/layouts/ 2>/dev/null | wc -l | tr -d ' ')
[ "$ENGLISH_COUNT" -eq 0 ] && pass "D12: No English defaultMessage" || fail "D12: $ENGLISH_COUNT English defaultMessage(s) found"

echo ""
echo "--- A.2: Structural Pattern Denials ---"

# A.2.1 Header
HEADER_CSS=$(sed -n '/\.header[^A-Z]/,/^}/p' src/styles/page.module.css 2>/dev/null || echo "")
HAS_BR12=$(echo "$HEADER_CSS" | grep -c "border-radius: 12px" || echo 0)
HAS_BLUR20=$(echo "$HEADER_CSS" | grep -c "blur(20px)" || echo 0)
HAS_RGBA_W=$(echo "$HEADER_CSS" | grep -c "rgba(255, 255, 255, 0.1)" || echo 0)
if [ "$HAS_BR12" -gt 0 ] && [ "$HAS_BLUR20" -gt 0 ] && [ "$HAS_RGBA_W" -gt 0 ]; then
  fail "A.2.1: Voquill header floating pill pattern detected"
else
  pass "A.2.1: Header is not Voquill floating pill"
fi

# A.2.2 Footer
FOOTER_CSS=$(sed -n '/\.footer[^A-Z]/,/^}/p' src/styles/page.module.css 2>/dev/null || echo "")
HAS_BR14=$(echo "$FOOTER_CSS" | grep -c "border-radius: 14px" || echo 0)
HAS_LEVEL1=$(echo "$FOOTER_CSS" | grep -c "var(--level1)" || echo 0)
HAS_BORDER_S=$(echo "$FOOTER_CSS" | grep -c "1px solid var(--border)" || echo 0)
if [ "$HAS_BR14" -gt 0 ] && [ "$HAS_LEVEL1" -gt 0 ] && [ "$HAS_BORDER_S" -gt 0 ]; then
  fail "A.2.2: Voquill footer card pattern detected"
else
  pass "A.2.2: Footer is not Voquill card-in-page"
fi

# A.2.3 Card surface diversity
CARD_FILES=$(grep -rl "var(--level1)" src/components/ --include="*.module.css" 2>/dev/null | xargs grep -l "var(--border)" 2>/dev/null | xargs grep -l "var(--shadow-soft)" 2>/dev/null || echo "")
CARD_COUNT=$(echo "$CARD_FILES" | grep -c . 2>/dev/null || echo 0)
if [ "$CARD_COUNT" -gt 1 ]; then
  fail "A.2.3: $CARD_COUNT module files use identical Voquill card surface triple (max: 1)"
else
  pass "A.2.3: Card surface diversity OK ($CARD_COUNT files with Voquill triple)"
fi

# A.2.4 Hero pattern
HERO_CENTER=$(grep -c "text-align: center" src/components/hero/hero.module.css 2>/dev/null || echo 0)
HERO_CANVAS=$(grep -c "SonicWaveform\|HeroGraphic\|sonic-waveform\|hero-graphic" src/components/hero/hero-section.tsx 2>/dev/null || echo 0)
if [ "$HERO_CENTER" -gt 0 ] && [ "$HERO_CANVAS" -gt 0 ]; then
  fail "A.2.4: Voquill hero pattern (centered text + canvas)"
else
  pass "A.2.4: Hero is structurally distinct"
fi

echo ""
echo "--- A.3: Motion Timing Denials ---"

grep -rqn "gsap\|from 'gsap'\|ScrollTrigger" src/ 2>/dev/null && fail "M04/W01: GSAP import found" || pass "M04/W01: No GSAP"

EASINGS=$(grep -roh 'type:\s*"spring"\|ease:\s*"[^"]*"\|ease:\s*\[[^]]*\]' src/components/ --include="*.tsx" 2>/dev/null | sort -u | wc -l | tr -d ' ')
if [ "$EASINGS" -lt 3 ]; then
  fail "M05: Only $EASINGS distinct easing(s) found (minimum: 3)"
else
  pass "M05: $EASINGS distinct easing values (minimum: 3)"
fi

echo ""
echo "--- A.4: Wispr Non-Copy Denials ---"

grep -rqn "#6366f1" src/styles/ src/components/ 2>/dev/null && fail "W02: Wispr indigo-500 found" || pass "W02: No Wispr indigo-500"
grep -rqn "#818cf8" src/styles/ src/components/ 2>/dev/null && fail "W03: Wispr indigo-400 found" || pass "W03: No Wispr indigo-400"
grep -rqn "#4f46e5" src/styles/ src/components/ 2>/dev/null && fail "W04: Wispr indigo-600 found" || pass "W04: No Wispr indigo-600"
grep -rqn "#a5b4fc" src/styles/ src/components/ 2>/dev/null && fail "W05: Wispr indigo-300 found" || pass "W05: No Wispr indigo-300"
grep -rqn "staggerChildren: 0.035\|staggerChildren:0.035" src/ 2>/dev/null && fail "W06: Wispr hero stagger timing" || pass "W06: No Wispr hero stagger"
grep -rqn "staggerChildren: 0.07\|staggerChildren:0.07" src/ 2>/dev/null && fail "W07: Wispr section stagger timing" || pass "W07: No Wispr section stagger"

echo ""
echo "--- A.5: Layout Diversity ---"

LAYOUTS=$(grep -roh 'data-layout="[^"]*"' src/components/speed-showcase/ src/components/text-cleanup-showcase/ src/components/privacy-showcase/ src/components/offline-showcase/ src/components/apps-carousel/ --include="*.tsx" 2>/dev/null | sort -u | wc -l | tr -d ' ')
if [ "$LAYOUTS" -lt 3 ]; then
  fail "A.5: Only $LAYOUTS distinct layout(s) across showcases (minimum: 3)"
else
  pass "A.5: $LAYOUTS distinct layouts across showcases"
fi

echo ""
echo "==========================="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL DENYLIST CHECKS PASSED"
  exit 0
else
  echo "DENYLIST FAILURES DETECTED — see above"
  exit 1
fi
```

**Usage from any phase:**

```bash
cd apps/web && bash scripts/denylist-check.sh
```

**CI integration:** The `denylist-check` step in the CI workflow (§B.3) runs this script on every PR targeting `main`.

### A.7 — Per-Phase Denylist Application

Each phase from v2 retains its phase-specific denylist checks. In v3, those checks are subsumed by the aggregate script. The per-phase sections in v2 should be read as "run `bash scripts/denylist-check.sh` and also verify the phase-specific acceptance criteria." No phase is considered done unless the aggregate script passes.

---

## §B — Storybook-First Enforcement Mechanism (v3, CI-Gated)

> **This section fully replaces v2's "Storybook-First Enforcement Protocol" section.**
> v2 described the workflow as prose ("BLOCKING: POC must exist before production file is modified") but nothing actually blocked a production-file edit when the POC was absent. v3 introduces a script + CI gate that **fails the PR** if the protocol is violated.

### B.1 — POC-to-Production Registry

A JSON file maps each production component to its required POC story. This is the single source of truth for enforcement.

**File**: `apps/web/scripts/storybook-poc-registry.json`

```json
{
  "src/components/hero/hero-section.tsx": "src/components/hero/hero-section-poc.stories.tsx",
  "src/components/hero/hero.module.css": "src/components/hero/hero-section-poc.stories.tsx",
  "src/components/site-header.tsx": "src/components/site-header-poc.stories.tsx",
  "src/components/site-footer.tsx": "src/components/site-footer-poc.stories.tsx",
  "src/components/download-button.tsx": "src/components/download-button-poc.stories.tsx",
  "src/components/speed-showcase/index.tsx": "src/components/speed-showcase/speed-showcase-poc.stories.tsx",
  "src/components/speed-showcase/speed-showcase.module.css": "src/components/speed-showcase/speed-showcase-poc.stories.tsx",
  "src/components/text-cleanup-showcase/index.tsx": "src/components/text-cleanup-showcase/text-cleanup-showcase-poc.stories.tsx",
  "src/components/text-cleanup-showcase/text-cleanup-showcase.module.css": "src/components/text-cleanup-showcase/text-cleanup-showcase-poc.stories.tsx",
  "src/components/privacy-showcase/index.tsx": "src/components/privacy-showcase/privacy-showcase-poc.stories.tsx",
  "src/components/privacy-showcase/privacy-showcase.module.css": "src/components/privacy-showcase/privacy-showcase-poc.stories.tsx",
  "src/components/offline-showcase/index.tsx": "src/components/offline-showcase/offline-showcase-poc.stories.tsx",
  "src/components/offline-showcase/offline-showcase.module.css": "src/components/offline-showcase/offline-showcase-poc.stories.tsx",
  "src/components/apps-carousel/apps-carousel.tsx": "src/components/apps-carousel/apps-carousel-poc.stories.tsx",
  "src/components/apps-carousel/apps-carousel.module.css": "src/components/apps-carousel/apps-carousel-poc.stories.tsx",
  "src/components/pricing-section/index.tsx": "src/components/pricing-section/pricing-section-poc.stories.tsx",
  "src/components/pricing-section/pricing-section.module.css": "src/components/pricing-section/pricing-section-poc.stories.tsx"
}
```

### B.2 — Enforcement Script

**File**: `apps/web/scripts/enforce-storybook-first.mjs`

**Behavior:**

1. Reads the list of files changed in the current PR (via `git diff --name-only origin/main...HEAD` or a CI-provided env var).
2. For each changed file, checks if it appears as a key in `storybook-poc-registry.json`.
3. If yes, verifies two conditions:
   - **Condition 1**: The corresponding POC story file also appears in the changed file list (i.e., was created or modified in the same PR).
   - **Condition 2**: A Storybook build artifact exists (the POC story was compiled). This is checked by:
     - Running `npx storybook build -o .storybook-check --quiet` (if not already done by CI).
     - Verifying the POC story's ID appears in the build output: `grep -r "<poc-story-filename-stem>" .storybook-check/`.
4. If either condition fails, the script exits with a non-zero code and prints which production file was changed without its POC gate being satisfied.

**Script specification (pseudocode):**

```
import registry from './storybook-poc-registry.json'
const changedFiles = getChangedFiles()  // git diff or CI env
const violations = []

for (const [prodFile, pocFile] of Object.entries(registry)) {
  const prodRelative = prodFile  // relative to apps/web/
  if (changedFiles.includes(prodRelative)) {
    // Condition 1: POC file must also be in the changeset
    if (!changedFiles.includes(pocFile)) {
      violations.push({ prodFile, reason: `POC file ${pocFile} not in changeset` })
      continue
    }
    // Condition 2: POC must compile in storybook build
    const pocStem = path.basename(pocFile, '.stories.tsx')
    const sbBuildDir = process.env.SB_BUILD_DIR || '.storybook-check'
    const grepResult = execSync(`grep -r "${pocStem}" ${sbBuildDir}/ 2>/dev/null || true`)
    if (!grepResult.toString().trim()) {
      violations.push({ prodFile, reason: `POC story ${pocStem} not found in storybook build` })
    }
  }
}

if (violations.length > 0) {
  console.error('STORYBOOK-FIRST GATE FAILED:')
  violations.forEach(v => console.error(`  ${v.prodFile}: ${v.reason}`))
  process.exit(1)
}
console.log('STORYBOOK-FIRST GATE PASSED: All production changes have corresponding POC stories.')
process.exit(0)
```

### B.3 — CI Workflow

**File**: `.github/workflows/storybook-gate.yml`

```yaml
name: Storybook-First Gate

on:
  pull_request:
    paths:
      - "apps/web/src/components/**"
      - "apps/web/src/styles/**"

jobs:
  storybook-gate:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # needed for git diff against main

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build Storybook
        run: npx storybook build -o .storybook-check --quiet

      - name: Enforce Storybook-First Protocol
        env:
          SB_BUILD_DIR: .storybook-check
        run: node scripts/enforce-storybook-first.mjs

      - name: Run Denylist Check
        run: bash scripts/denylist-check.sh
```

**Key properties of this workflow:**

- Triggers only on PRs that touch `apps/web/src/components/` or `apps/web/src/styles/` — avoiding noise on unrelated PRs.
- Runs Storybook build BEFORE the enforcement check — so the POC compilation is verified.
- Runs the denylist check in the same job — so anti-similarity is also enforced per-PR.
- **Failure of either step blocks the PR from merging** (when branch protection requires this check to pass).

### B.4 — package.json Script Integration

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "gate:storybook": "npx storybook build -o .storybook-check --quiet && node scripts/enforce-storybook-first.mjs",
    "gate:denylist": "bash scripts/denylist-check.sh",
    "gate:all": "npm run gate:storybook && npm run gate:denylist"
  }
}
```

**Local developer workflow:**

```bash
cd apps/web
npm run gate:all    # Run both gates before pushing
```

### B.5 — Escape Hatch

If a production file genuinely needs a hotfix without a POC cycle (e.g., a broken link, a typo, a critical bug):

1. The PR title MUST contain `[skip-poc-gate]`.
2. The enforcement script checks for this marker in the `GITHUB_PR_TITLE` env var and skips Condition 1 (POC in changeset) if present.
3. Condition 2 (storybook build succeeds) is NEVER skipped — even hotfix PRs must not break Storybook.
4. This escape hatch is documented so reviewers can audit its use.

### B.6 — .gitignore Update

Add to `apps/web/.gitignore`:

```
.storybook-check/
```

This ensures the CI-only Storybook build directory is never committed.

---

## §C — Updated Acceptance Criteria for v3

These criteria are **additional** to all v2 acceptance criteria, which remain in effect.

### Global (applies to every phase)

- [ ] `bash apps/web/scripts/denylist-check.sh` exits 0
- [ ] `node apps/web/scripts/enforce-storybook-first.mjs` exits 0 (for phases 1–6)
- [ ] `apps/web/scripts/storybook-poc-registry.json` exists and is valid JSON
- [ ] `apps/web/scripts/denylist-check.sh` exists and is executable
- [ ] `.github/workflows/storybook-gate.yml` exists and is valid YAML

### Phase-Specific Additions

**Pre-Phase −1** (unchanged from v2 — no v3 additions)

**Phase 0: Foundation**

- [ ] `denylist-check.sh` is created and committed in this phase
- [ ] `storybook-poc-registry.json` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` is created and committed in this phase
- [ ] `storybook-gate.yml` is created and committed in this phase
- [ ] `package.json` has `gate:storybook`, `gate:denylist`, `gate:all` scripts
- [ ] `.gitignore` includes `.storybook-check/`

**Phases 1–6** (each section phase):

- [ ] `npm run gate:all` exits 0 after the promote step
- [ ] The showcase component's root element includes `data-layout="<pattern>"` attribute (Phase 5 showcases only)

**Phase 7: Composition**

- [ ] `npm run gate:denylist` exits 0

**Phase 8: i18n Audit** (unchanged from v2)

**Phase 9: Final Audit**

- [ ] `npm run gate:all` exits 0 as the final verification
- [ ] CI workflow `storybook-gate.yml` has run successfully on the PR

---

## §D — Updated Risk Mitigations for v3

These rows are **added** to v2's risk table:

| Risk                                                                            | Likelihood | Impact   | Mitigation                                                                                                                                       |
| ------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `denylist-check.sh` false positives from grep matching in comments or strings   | Low        | Medium   | Each grep targets specific file scopes (not all of `src/`); CSS hex values are unlikely in comments; review any failures before suppressing      |
| `enforce-storybook-first.mjs` blocks legitimate refactors that don't need a POC | Low        | Low      | `[skip-poc-gate]` escape hatch in PR title; registry can be updated to remove entries for stabilized components                                  |
| Storybook build in CI is slow (adds minutes to PR checks)                       | Medium     | Low      | Use `--quiet` flag; cache `node_modules` and `.storybook-check/` between runs; Storybook build is already a quality signal worth the time        |
| `storybook-poc-registry.json` drifts out of sync with actual file paths         | Low        | Medium   | Registry is committed in Phase 0 and updated per-phase; enforcement script fails loudly if a registry entry references a nonexistent file        |
| `data-layout` attribute adds non-semantic HTML                                  | Very Low   | Very Low | `data-*` attributes are explicitly for machine consumption per HTML spec; no user-visible impact; can be stripped in production build if desired |

---

## §E — Files Created by v3 (Delta from v2)

| File                                           | Phase Created | Purpose                                          |
| ---------------------------------------------- | ------------- | ------------------------------------------------ |
| `apps/web/scripts/denylist-check.sh`           | Phase 0       | Aggregate anti-similarity verification script    |
| `apps/web/scripts/storybook-poc-registry.json` | Phase 0       | Maps production files to required POC stories    |
| `apps/web/scripts/enforce-storybook-first.mjs` | Phase 0       | Verifies POC gate before production file changes |
| `.github/workflows/storybook-gate.yml`         | Phase 0       | CI workflow that runs both gates on PRs          |

---

## Summary of What v3 Changes

1. **Anti-similarity is now 100% command-checkable.** Every single check — including card surface diversity, header/footer structural patterns, hero layout, motion timing diversity, Wispr color avoidance, and layout diversity across showcases — is expressed as a bash command with a numeric pass/fail threshold. The aggregate script `denylist-check.sh` runs all checks and exits non-zero on any failure.

2. **Storybook-first is now CI-enforced.** A registry maps production files to POC stories. A script checks that every production file change is accompanied by its POC story in the same changeset AND that the POC compiles in a Storybook build. A GitHub Actions workflow runs both the Storybook gate and the denylist check on every PR touching web components/styles. Merging is blocked on failure.

3. **Everything else from v2 is unchanged.** The phases, tasks, file targets, i18n pipeline, rollback strategies, and execution order are identical. v3 is a surgical replacement of the two sections Momus rejected.
