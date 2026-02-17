# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill (v4)

> Revision of `web-revamp-korean-first-v3.md`. Fixes the **five remaining Momus blockers**:
>
> 1. **W08 and badge-h2-p-visual max-2 missing from aggregate denylist script** — v3 documented W08 in the A.4 table and the badge-h2-p-visual ≤ 2 rule in A.5 prose, but the aggregate `denylist-check.sh` script never checked either.
> 2. **`duration: 0.6` denylist has no independent measurable check** — v3's M01 deferred to M05 (easing diversity), but M05 counts _easing_ types, not _duration_ values. A codebase with `duration: 0.6` everywhere and 3 distinct easings would pass M05 while violating M01.
> 3. **Merge-block enforceability is aspirational, not verified** — v3 said "when branch protection requires this check to pass" in parenthetical but had no acceptance criterion or verification step confirming the `storybook-gate` workflow is a required status check.
> 4. **Escape hatch env var `GITHUB_PR_TITLE` is never wired** — v3's §B.5 says the enforcement script reads `GITHUB_PR_TITLE`, but §B.3's CI workflow never passes it. The variable would always be empty, making the escape hatch dead code.
> 5. **POC compilation gate relies on brittle story filename grep** — v3's §B.2 Condition 2 runs `grep -r "<poc-story-filename-stem>" .storybook-check/` against Storybook's build output. Storybook's Vite builder hashes filenames; the stem may not appear literally. This makes the gate unreliable.
>
> **Everything else is unchanged from v3 (which is itself a delta on v2).** This document is a **surgical delta** — it replaces only the specific subsections affected by the five blockers. All phases, tasks, file targets, i18n pipeline, rollback strategies, and execution order from v2+v3 remain in effect. Read this document **together with v2 and v3**; where a section header matches, this document's version supersedes v3 (which supersedes v2).

---

## Change Log: v3 → v4

| v3 Weakness                                                                                                                                                                                         | v4 Fix                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `denylist-check.sh` A.4 section checks W02–W07 but omits W08 (Wispr delay sequence `[0, 0.1, 0.2, 0.3, 0.4]`)                                                                                       | Added W08 grep check to aggregate script A.4 section                                                                                                                                                                                                 |
| `denylist-check.sh` A.5 section checks `data-layout` count ≥ 3 but does not enforce `badge-h2-p-visual` ≤ 2                                                                                         | Added explicit count-and-fail for `badge-h2-p-visual` occurrences > 2 in A.5 section                                                                                                                                                                 |
| M01 (`duration: 0.6` denial) defers entirely to M05 (easing diversity), which doesn't check durations at all                                                                                        | New standalone M01 check: grep for `duration: 0.6` across component TSX files; FAIL if any file uses it without at least one _different_ duration in the same file                                                                                   |
| CI workflow `storybook-gate.yml` is described as blocking merges, but no acceptance criterion or verification step confirms it is configured as a required status check in GitHub branch protection | New acceptance criterion in §C: "`storybook-gate / storybook-gate` is listed as a required status check on `main`". New verification step: `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks` must include the check name |
| `enforce-storybook-first.mjs` reads `GITHUB_PR_TITLE` for escape hatch, but `storybook-gate.yml` never passes it                                                                                    | CI workflow now explicitly sets `GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}` in the enforcement step's `env` block                                                                                                                      |
| POC compilation verified by `grep -r "<stem>" .storybook-check/` — Storybook Vite builder hashes filenames, making stem-grep unreliable                                                             | Replaced with `stories.json` index lookup: Storybook builds produce `stories.json` (or `index.json`) listing all compiled story IDs. The script reads this manifest and checks for the POC story's expected ID                                       |

---

## §A.3 — Motion Timing Denylist (v4, M01 Independent Check)

> **This subsection replaces v3's §A.3 in its entirety.**

These specific motion values are denied because they constitute Voquill's uniform animation signature.

| ID  | Denied Value                                                      | Context                  | Command                                      | Pass                                                     |
| --- | ----------------------------------------------------------------- | ------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| M01 | `duration: 0.6` as the sole/default entrance duration             | `src/components/`        | See M01 standalone script below              | 0 files where `duration: 0.6` is the only duration value |
| M02 | `ease` as the sole easing keyword (no spring/physics)             | `src/components/`        | See M05 composite script below               | —                                                        |
| M03 | `transition: opacity` + `translateY` as the ONLY entrance pattern | `src/pages/HomePage.tsx` | Covered by D08 (FadeInSection removal)       | —                                                        |
| M04 | GSAP / gsap import                                                | `src/`                   | `grep -rn "gsap\|from 'gsap'" apps/web/src/` | 0 results                                                |

**M01 — Duration diversity script (standalone, independent of M05):**

```bash
cd apps/web
# For each TSX file in src/components/ that contains "duration: 0.6",
# verify it also contains at least one DIFFERENT duration value.
# A file with ONLY duration: 0.6 (and no other duration) is a FAIL.
OFFENDERS=""
for f in $(grep -rl "duration: 0\.6" src/components/ --include="*.tsx" 2>/dev/null); do
  # Count distinct duration values in this file (duration: <number>)
  DISTINCT=$(grep -oh "duration: [0-9.]*" "$f" | sort -u | wc -l | tr -d ' ')
  if [ "$DISTINCT" -le 1 ]; then
    OFFENDERS="$OFFENDERS $f"
  fi
done
if [ -n "$OFFENDERS" ]; then
  echo "FAIL M01: These files use duration: 0.6 as sole duration (Voquill uniform timing):"
  for f in $OFFENDERS; do echo "  $f"; done
  exit 1
fi
echo "PASS M01: No file uses duration: 0.6 as its only motion duration"
```

**M05 — Motion easing diversity script (composite check, unchanged from v3):**

```bash
cd apps/web
# Count distinct motion easing values across all component TSX files
# Require at least 3 distinct easing approaches (spring, easeOut*, easeInOut*, custom cubic-bezier, etc.)
EASINGS=$(grep -roh 'type:\s*"spring"\|ease:\s*"[^"]*"\|ease:\s*\[[^]]*\]' src/components/ --include="*.tsx" | sort -u | wc -l)
if [ "$EASINGS" -lt 3 ]; then
  echo "FAIL: Only $EASINGS distinct easing value(s) found across components. Minimum required: 3."
  echo "Voquill used a single uniform easing. Vocally must have motion diversity."
  exit 1
fi
echo "PASS: $EASINGS distinct easing values found (minimum: 3)"
```

---

## §A.6 — Aggregate Denylist Script (v4, Complete)

> **This section fully replaces v3's §A.6.** Changes from v3 are marked with `# [v4]` comments.

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

# [v4] M01: Standalone duration: 0.6 check (independent of M05 easing diversity)
M01_OFFENDERS=""
for f in $(grep -rl "duration: 0\.6" src/components/ --include="*.tsx" 2>/dev/null); do
  DISTINCT_DUR=$(grep -oh "duration: [0-9.]*" "$f" | sort -u | wc -l | tr -d ' ')
  if [ "$DISTINCT_DUR" -le 1 ]; then
    M01_OFFENDERS="$M01_OFFENDERS $f"
  fi
done
if [ -n "$M01_OFFENDERS" ]; then
  fail "M01: Files using duration: 0.6 as sole duration:$M01_OFFENDERS"
else
  pass "M01: No file uses duration: 0.6 as its only motion duration"
fi

# M05: Easing diversity
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

# [v4] W08: Wispr exact hero word delay sequence
grep -rqn "delay: 0\.1.*delay: 0\.2.*delay: 0\.3\|0, 0.1, 0.2, 0.3" src/ 2>/dev/null && fail "W08: Wispr hero delay sequence [0, 0.1, 0.2, 0.3, 0.4] found" || pass "W08: No Wispr hero delay sequence"

echo ""
echo "--- A.5: Layout Diversity ---"

LAYOUTS=$(grep -roh 'data-layout="[^"]*"' src/components/speed-showcase/ src/components/text-cleanup-showcase/ src/components/privacy-showcase/ src/components/offline-showcase/ src/components/apps-carousel/ --include="*.tsx" 2>/dev/null | sort -u | wc -l | tr -d ' ')
if [ "$LAYOUTS" -lt 3 ]; then
  fail "A.5a: Only $LAYOUTS distinct layout(s) across showcases (minimum: 3)"
else
  pass "A.5a: $LAYOUTS distinct layouts across showcases"
fi

# [v4] A.5b: badge-h2-p-visual max-2 enforcement
BADGE_LAYOUT_COUNT=$(grep -roh 'data-layout="badge-h2-p-visual"' src/components/speed-showcase/ src/components/text-cleanup-showcase/ src/components/privacy-showcase/ src/components/offline-showcase/ src/components/apps-carousel/ --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$BADGE_LAYOUT_COUNT" -gt 2 ]; then
  fail "A.5b: $BADGE_LAYOUT_COUNT showcases use badge-h2-p-visual layout (max allowed: 2)"
else
  pass "A.5b: $BADGE_LAYOUT_COUNT showcases use badge-h2-p-visual (max: 2)"
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

**Usage from any phase** (unchanged from v3):

```bash
cd apps/web && bash scripts/denylist-check.sh
```

---

## §B.2 — Enforcement Script (v4, Robust POC Compilation Gate)

> **This subsection replaces v3's §B.2 in its entirety.**

**File**: `apps/web/scripts/enforce-storybook-first.mjs`

**Behavior:**

1. Reads the list of files changed in the current PR (via `git diff --name-only origin/main...HEAD` or a CI-provided env var).
2. For each changed file, checks if it appears as a key in `storybook-poc-registry.json`.
3. If yes, verifies two conditions:
   - **Condition 1**: The corresponding POC story file also appears in the changed file list (i.e., was created or modified in the same PR). **Skipped** if `GITHUB_PR_TITLE` env var contains `[skip-poc-gate]`.
   - **Condition 2**: The POC story was compiled by Storybook. Verified by reading Storybook's build manifest (`stories.json` or `index.json`) from the build output directory and confirming the POC story's module ID is present. This replaces v3's brittle filename-grep approach.
4. If either condition fails, the script exits with a non-zero code and prints which production file was changed without its POC gate being satisfied.

**Script specification:**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename, join } from "node:path";

const registry = JSON.parse(
  readFileSync(
    new URL("./storybook-poc-registry.json", import.meta.url),
    "utf8",
  ),
);

// Get changed files relative to apps/web/
const diffBase = process.env.DIFF_BASE || "origin/main";
const rawDiff = execSync(`git diff --name-only ${diffBase}...HEAD`, {
  encoding: "utf8",
});
const changedFiles = rawDiff
  .split("\n")
  .filter(Boolean)
  .filter((f) => f.startsWith("apps/web/"))
  .map((f) => f.replace("apps/web/", ""));

// Check escape hatch
const prTitle = process.env.GITHUB_PR_TITLE || "";
const skipCondition1 = prTitle.includes("[skip-poc-gate]");
if (skipCondition1) {
  console.log(
    "ℹ  [skip-poc-gate] detected in PR title — skipping Condition 1 (POC in changeset)",
  );
  console.log(
    "   Condition 2 (POC compiled in Storybook build) is still enforced.",
  );
}

// Locate Storybook build manifest
const sbBuildDir = process.env.SB_BUILD_DIR || ".storybook-check";
let storiesManifest = {};

const indexJsonPath = join(sbBuildDir, "index.json");
const storiesJsonPath = join(sbBuildDir, "stories.json");

if (existsSync(indexJsonPath)) {
  const indexData = JSON.parse(readFileSync(indexJsonPath, "utf8"));
  // index.json has { v: number, entries: { [storyId]: { ... importPath: "..." } } }
  storiesManifest = indexData.entries || indexData.stories || {};
} else if (existsSync(storiesJsonPath)) {
  const storiesData = JSON.parse(readFileSync(storiesJsonPath, "utf8"));
  storiesManifest = storiesData.stories || {};
} else {
  console.error(
    `FATAL: Neither ${indexJsonPath} nor ${storiesJsonPath} found.`,
  );
  console.error("Storybook build may have failed or build directory is wrong.");
  process.exit(1);
}

// Build a set of importPaths from the manifest for fast lookup
const compiledImportPaths = new Set(
  Object.values(storiesManifest).map((entry) =>
    (entry.importPath || "").replace(/^\.\//, ""),
  ),
);

const violations = [];

for (const [prodFile, pocFile] of Object.entries(registry)) {
  if (!changedFiles.includes(prodFile)) continue;

  // Condition 1: POC file must be in the changeset
  if (!skipCondition1 && !changedFiles.includes(pocFile)) {
    violations.push({
      prodFile,
      reason: `POC file ${pocFile} not in changeset (add it or use [skip-poc-gate] in PR title)`,
    });
    continue;
  }

  // Condition 2: POC must appear in Storybook build manifest
  // Check if any compiled story's importPath ends with the POC filename
  const pocBasename = basename(pocFile);
  const pocInManifest = [...compiledImportPaths].some(
    (ip) => ip.endsWith(pocBasename) || ip.endsWith(pocFile),
  );

  if (!pocInManifest) {
    violations.push({
      prodFile,
      reason: `POC story ${pocFile} not found in Storybook build manifest (${indexJsonPath} / ${storiesJsonPath}). Ensure the story compiles.`,
    });
  }
}

if (violations.length > 0) {
  console.error("STORYBOOK-FIRST GATE FAILED:");
  violations.forEach((v) => console.error(`  ✗ ${v.prodFile}: ${v.reason}`));
  process.exit(1);
}
console.log(
  "STORYBOOK-FIRST GATE PASSED: All production changes have corresponding compiled POC stories.",
);
process.exit(0);
```

**Key differences from v3:**

1. **Manifest-based POC verification** (not filename grep). Storybook 7+ and 8+ produce `index.json` (or `stories.json`) listing every compiled story with its `importPath`. The script reads this structured JSON and checks for the POC file's presence. This is immune to Vite/webpack filename hashing.
2. **Escape hatch variable is read from `process.env.GITHUB_PR_TITLE`**, which is now explicitly wired in the CI workflow (see §B.3 below).
3. **Fallback**: checks both `index.json` (Storybook 7+) and `stories.json` (Storybook 6) for maximum compatibility with the project's Storybook v10.x.

---

## §B.3 — CI Workflow (v4, Escape Hatch Wired + Required Status Check)

> **This section fully replaces v3's §B.3.**

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
          # [v4] Wire PR title so escape hatch [skip-poc-gate] actually works
          GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}
        run: node scripts/enforce-storybook-first.mjs

      - name: Run Denylist Check
        run: bash scripts/denylist-check.sh
```

**Key properties of this workflow:**

- Triggers only on PRs that touch `apps/web/src/components/` or `apps/web/src/styles/` — avoiding noise on unrelated PRs.
- Runs Storybook build BEFORE the enforcement check — so the POC compilation is verified via manifest.
- **[v4]** `GITHUB_PR_TITLE` is explicitly set from `${{ github.event.pull_request.title }}`, so the `[skip-poc-gate]` escape hatch in the enforcement script can actually read it.
- Runs the denylist check in the same job — so anti-similarity is also enforced per-PR.
- **Failure of either step blocks the PR from merging** — but ONLY when branch protection is configured (see §B.7 below for the explicit setup step).

---

## §B.5 — Escape Hatch (v4, Correctly Wired)

> **This section fully replaces v3's §B.5.** The behavior is identical to v3's intent, but v4 ensures it actually works.

If a production file genuinely needs a hotfix without a POC cycle (e.g., a broken link, a typo, a critical bug):

1. The PR title MUST contain `[skip-poc-gate]`.
2. The enforcement script reads `process.env.GITHUB_PR_TITLE` (set by CI workflow, see §B.3 `env` block) and skips Condition 1 (POC in changeset) if the marker is present.
3. Condition 2 (POC must exist in Storybook build manifest) is NEVER skipped — even hotfix PRs must not break Storybook compilation.
4. For local runs where `GITHUB_PR_TITLE` is not set, developers can pass it explicitly:
   ```bash
   GITHUB_PR_TITLE="[skip-poc-gate] fix: broken download link" node scripts/enforce-storybook-first.mjs
   ```
5. This escape hatch is documented so reviewers can audit its use in PR history.

**Verification that the variable is wired:** After Phase 0, confirm by reading `.github/workflows/storybook-gate.yml` and verifying the `GITHUB_PR_TITLE` key exists in the `Enforce Storybook-First Protocol` step's `env` block.

---

## §B.7 — Required Status Check Setup (v4, New Section)

> **This section is new in v4.** It makes merge-block enforceability explicit rather than aspirational.

The `storybook-gate` CI workflow (§B.3) only blocks merges if GitHub branch protection is configured to require it. This section specifies how to configure it and how to verify the configuration.

### Setup (one-time, during Phase 0)

After the first successful run of the `storybook-gate.yml` workflow (triggered by a PR that touches `apps/web/src/components/` or `apps/web/src/styles/`):

1. Navigate to **Settings → Branches → Branch protection rules** for `main`.
2. Enable **"Require status checks to pass before merging"**.
3. Search for and add `storybook-gate` (the job name from the workflow).
4. Save the branch protection rule.

**Alternatively, via GitHub CLI:**

```bash
# Fetch current protection to avoid overwriting other settings
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"checks":[{"context":"storybook-gate"}]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

> **Note**: The exact `gh api` payload depends on existing branch protection settings. The key requirement is that `"checks"` array includes `{"context":"storybook-gate"}`. Adjust other fields to preserve existing rules.

### Verification

```bash
# Confirm storybook-gate is a required check
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks \
  --jq '.checks[] | select(.context == "storybook-gate")'
```

**Expected output** (non-empty):

```json
{
  "context": "storybook-gate",
  "app_id": null
}
```

If the output is empty, the required status check is NOT configured and PRs can be merged without passing the gate.

---

## §C — Updated Acceptance Criteria for v4

> **This section fully replaces v3's §C.** All v3 criteria remain; v4 additions are marked with `[v4]`.

### Global (applies to every phase)

- [ ] `bash apps/web/scripts/denylist-check.sh` exits 0
- [ ] `node apps/web/scripts/enforce-storybook-first.mjs` exits 0 (for phases 1–6)
- [ ] `apps/web/scripts/storybook-poc-registry.json` exists and is valid JSON
- [ ] `apps/web/scripts/denylist-check.sh` exists and is executable
- [ ] `.github/workflows/storybook-gate.yml` exists and is valid YAML
- [ ] **[v4]** `storybook-gate` is listed as a required status check on the `main` branch protection rule (verified via `gh api`)
- [ ] **[v4]** `.github/workflows/storybook-gate.yml` passes `GITHUB_PR_TITLE` env var to the enforcement step

### Phase-Specific Additions

**Pre-Phase −1** (unchanged from v2 — no v4 additions)

**Phase 0: Foundation**

- [ ] `denylist-check.sh` is created and committed in this phase
- [ ] **[v4]** `denylist-check.sh` includes W08 check and badge-h2-p-visual ≤ 2 check (not just ≥ 3 distinct layouts)
- [ ] **[v4]** `denylist-check.sh` includes standalone M01 duration: 0.6 check (not deferred to M05)
- [ ] `storybook-poc-registry.json` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` is created and committed in this phase
- [ ] **[v4]** `enforce-storybook-first.mjs` uses Storybook build manifest (`index.json`/`stories.json`) for POC compilation check, NOT filename grep
- [ ] `storybook-gate.yml` is created and committed in this phase
- [ ] **[v4]** `storybook-gate.yml` includes `GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}` in enforcement step env
- [ ] `package.json` has `gate:storybook`, `gate:denylist`, `gate:all` scripts
- [ ] `.gitignore` includes `.storybook-check/`
- [ ] **[v4]** After first successful workflow run on a PR: configure `storybook-gate` as required status check on `main` branch protection

**Phases 1–6** (each section phase):

- [ ] `npm run gate:all` exits 0 after the promote step
- [ ] The showcase component's root element includes `data-layout="<pattern>"` attribute (Phase 5 showcases only)
- [ ] **[v4]** No showcase uses `data-layout="badge-h2-p-visual"` if 2 already exist (verified by denylist script A.5b)

**Phase 7: Composition**

- [ ] `npm run gate:denylist` exits 0

**Phase 8: i18n Audit** (unchanged from v2)

**Phase 9: Final Audit**

- [ ] `npm run gate:all` exits 0 as the final verification
- [ ] CI workflow `storybook-gate.yml` has run successfully on the PR
- [ ] **[v4]** `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq '.checks[] | select(.context == "storybook-gate")'` returns non-empty result

---

## §D — Updated Risk Mitigations for v4

> **These rows are added to v3's risk table (which itself adds to v2's).**

| Risk                                                                                                  | Likelihood | Impact   | Mitigation                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.json`/`stories.json` manifest format changes in future Storybook versions                      | Low        | Medium   | Script checks both `index.json` and `stories.json` with fallback; Storybook 7+/8+/10+ all produce at least one of these; if neither found, script fails loudly with clear error |
| `GITHUB_PR_TITLE` not available in non-PR contexts (e.g., push to main)                               | Very Low   | Low      | Workflow only triggers on `pull_request` events; `GITHUB_PR_TITLE` defaults to empty string; escape hatch simply does not activate outside PR context                           |
| M01 standalone check has false positives for files that use `duration: 0.6` alongside `duration: 0.3` | Very Low   | Very Low | Script counts _distinct_ `duration: <number>` values; if ≥ 2 distinct values exist, the file passes even if one is `0.6`                                                        |
| Required status check blocks emergency deploys                                                        | Low        | High     | Admin override exists in GitHub branch protection; `[skip-poc-gate]` skips Condition 1; for true emergencies, admin can merge without checks                                    |
| `badge-h2-p-visual` ≤ 2 check triggers during intermediate development (only 1 showcase built so far) | Low        | Low      | The check counts occurrences; 0 or 1 both pass (≤ 2); only fails if 3+ exist. Intermediate states are safe                                                                      |

---

## §E — Files Created by v4 (Delta from v3)

> v4 does not create any new files beyond what v3 specifies. The delta is in **content** of existing v3 files:

| File                                           | Change in v4                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/scripts/denylist-check.sh`           | Added W08 grep, badge-h2-p-visual ≤ 2 count, standalone M01 duration check                                                          |
| `apps/web/scripts/enforce-storybook-first.mjs` | Replaced filename-grep POC check with `index.json`/`stories.json` manifest lookup; reads `GITHUB_PR_TITLE` env var for escape hatch |
| `.github/workflows/storybook-gate.yml`         | Added `GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}` to enforcement step env block                                       |

---

## §F — Verification Steps for v4 Blocker Fixes

> **This section is new in v4.** Each row maps to a specific Momus blocker and provides an exact command to verify the fix.

| Blocker                                                 | Verification Command                                                                 | Expected Output                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| (a) W08 missing from aggregate script                   | `grep -c "W08" apps/web/scripts/denylist-check.sh`                                   | ≥ 2 (the check line + the pass/fail message)                            |
| (a) badge-h2-p-visual ≤ 2 missing from aggregate script | `grep -c "badge-h2-p-visual" apps/web/scripts/denylist-check.sh`                     | ≥ 1                                                                     |
| (b) M01 has no independent check                        | `grep -c "M01" apps/web/scripts/denylist-check.sh`                                   | ≥ 2 (check block + pass/fail), AND the M01 block must NOT reference M05 |
| (b) M01 independent of M05                              | `sed -n '/# \[v4\] M01/,/^fi/p' apps/web/scripts/denylist-check.sh \| grep -c "M05"` | `0` (M01 block contains no M05 reference)                               |
| (c) Required status check acceptance criterion exists   | `grep -c "required status check" .sisyphus/plans/web-revamp-korean-first-v4.md`      | ≥ 1                                                                     |
| (c) Required status check verification step exists      | `grep -c "required_status_checks" .sisyphus/plans/web-revamp-korean-first-v4.md`     | ≥ 1                                                                     |
| (d) GITHUB_PR_TITLE wired in workflow                   | `grep "GITHUB_PR_TITLE" .github/workflows/storybook-gate.yml`                        | Line containing `${{ github.event.pull_request.title }}`                |
| (d) Enforcement script reads GITHUB_PR_TITLE            | `grep "GITHUB_PR_TITLE" apps/web/scripts/enforce-storybook-first.mjs`                | Line containing `process.env.GITHUB_PR_TITLE`                           |
| (e) No filename grep for POC compilation                | `grep -c 'grep -r.*storybook-check' apps/web/scripts/enforce-storybook-first.mjs`    | `0` (no grep against build directory)                                   |
| (e) Manifest-based lookup present                       | `grep -c "index.json\|stories.json" apps/web/scripts/enforce-storybook-first.mjs`    | ≥ 2                                                                     |

---

## Summary of What v4 Changes

1. **W08 and badge-h2-p-visual ≤ 2 are now in the aggregate denylist script.** The `denylist-check.sh` script (§A.6) now includes a W08 grep for Wispr's exact hero delay sequence AND an explicit count-and-fail for `data-layout="badge-h2-p-visual"` exceeding 2 occurrences. Both were documented in v3's prose but absent from the executable script.

2. **M01 (`duration: 0.6`) has a standalone measurable check.** The new M01 block in the denylist script iterates each TSX file containing `duration: 0.6` and verifies it also contains at least one different duration value. This check is completely independent of M05 (easing diversity). A codebase can pass M05 and still fail M01 if any file uses `duration: 0.6` exclusively.

3. **Merge-block enforceability is explicit.** New §B.7 specifies the one-time setup of `storybook-gate` as a required status check in GitHub branch protection, provides both UI and CLI instructions, and includes a `gh api` verification command. New acceptance criteria in §C require this to be verified.

4. **Escape hatch `GITHUB_PR_TITLE` is correctly wired.** The CI workflow (§B.3) now explicitly passes `GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}` in the enforcement step's `env` block. The enforcement script (§B.2) reads this variable. Local usage instructions are documented in §B.5.

5. **POC compilation gate uses Storybook's build manifest, not brittle filename grep.** The enforcement script (§B.2) now reads `index.json` (Storybook 7+) or `stories.json` (Storybook 6) from the build output and checks that the POC story's import path appears in the compiled story entries. This is immune to Vite/webpack filename hashing.

6. **Everything else from v3 (and v2) is unchanged.** The phases, tasks, file targets, i18n pipeline, rollback strategies, execution order, and all other acceptance criteria remain identical. v4 is a surgical fix of the five Momus blockers.
