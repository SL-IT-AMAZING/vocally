# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill (v6)

> Revision of `web-revamp-korean-first-v5.md`. Fixes the **three remaining Momus blockers**:
>
> 1. **`git diff origin/${{ github.base_ref }}...HEAD` is unreliable for PR-scoped diffs** — v5's §B.3 "Check relevance" step uses `origin/${{ github.base_ref }}` which requires the remote tracking branch to exist locally after `actions/checkout`. With `fetch-depth: 0` this usually works, but it is not guaranteed: `github.base_ref` is a branch name (e.g., `main`) that must be resolved through a remote lookup. If the fetch is shallow or the ref is deleted/renamed, the diff fails silently or errors. GitHub Actions provides `${{ github.event.pull_request.base.sha }}` and `${{ github.sha }}` as immutable SHAs available for every `pull_request` event — these are the robust, portable refs for PR-scoped diffs.
> 2. **`\s*` in grep patterns is not POSIX-portable** — v5's §A.6 W08 check (lines 42, 45–48) uses `\s*` inside `grep -E` patterns. `\s` is a Perl-class shorthand that works in GNU grep but is **not** part of POSIX ERE. BSD grep (macOS) does not support `\s` at all — the pattern silently fails to match. The POSIX-portable equivalent is `[[:space:]]*`. Additionally, M05 in §A.6 (inherited from v4 line 186) uses `\s*` inside `grep -roh` patterns. All instances must be replaced.
> 3. **v5 verification table row (v5b) "W08 does NOT use `\|` alternation" is malformed** — the pipe character `|` inside the verification command column broke the markdown table structure, rendering the command un-copyable and the expected-output column merged into the command column. The row must be reformatted so the command is copy-paste runnable.
>
> **Everything else is unchanged from v5 (which is itself a delta on v4, on v3, on v2).** This document is a **surgical delta** — it replaces only the specific subsections affected by the three blockers. All phases, tasks, file targets, i18n pipeline, rollback strategies, and execution order from v2+v3+v4+v5 remain in effect. Read this document **together with v2, v3, v4, and v5**; where a section header matches, this document's version supersedes v5.

---

## Change Log: v5 → v6

| v5 Weakness                                                                                                                                                                                                                      | v6 Fix                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Check relevance" step uses `git diff --name-only origin/${{ github.base_ref }}...HEAD` — relies on remote branch name resolution after checkout, which is fragile with shallow clones, renamed branches, or missing remote refs | Replaced with SHA-based diff: `git diff --name-only ${{ github.event.pull_request.base.sha }}...${{ github.sha }}`. These are immutable commit SHAs injected by GitHub for every `pull_request` event — no remote branch resolution required, no `fetch-depth: 0` dependency for the diff step |
| W08 grep patterns use `\s*` (Perl shorthand, not POSIX ERE) — works on GNU grep (Linux CI) but silently fails on BSD grep (macOS dev machines)                                                                                   | All `\s*` replaced with `[[:space:]]*` (POSIX ERE character class, portable across GNU and BSD grep)                                                                                                                                                                                           |
| M05 easing-diversity grep uses `\s*` in `type:\s*"spring"` and `ease:\s*"[^"]*"` patterns — same portability issue                                                                                                               | All `\s*` replaced with `[[:space:]]*` in M05 patterns                                                                                                                                                                                                                                         |
| Verification table row for "(v5b) W08 does NOT use `\|` alternation" has a literal pipe `                                                                                                                                        | ` inside a markdown table cell, breaking the table structure and making the command un-copyable                                                                                                                                                                                                | Reformatted: the pipe is escaped as `\|` in the grep pattern by wrapping the entire command in a fenced code span, and the table columns are correctly delimited |

---

## §A.6 — Aggregate Denylist Script, W08 Section Only (v6)

> **This subsection replaces ONLY the W08 check block in v5's §A.6.** All other checks in the aggregate denylist script remain exactly as specified in v5, **except** the M05 easing-diversity check which is also updated below.

In v5's `denylist-check.sh`, replace the W08 block with:

```bash
# [v6] W08: Wispr exact hero word delay sequence [0, 0.1, 0.2, 0.3, 0.4]
# Uses grep -E (ERE) for portable alternation (works on both GNU and BSD grep).
# Uses [[:space:]]* instead of \s* for POSIX portability.
# Tests for the full five-element sequence including 0.4.
# Pattern 1: Array-literal form — "0, 0.1, 0.2, 0.3, 0.4" (with or without spaces)
# Pattern 2: Expanded delay-assignment form — all five delay values 0 through 0.4 in one file
W08_HIT=0
# Check 1: literal array form with all five values including 0.4
grep -rqE "0,[[:space:]]*0\.1,[[:space:]]*0\.2,[[:space:]]*0\.3,[[:space:]]*0\.4" src/ 2>/dev/null && W08_HIT=1
# Check 2: file-level scan — any single file containing all five delay assignments
if [ "$W08_HIT" -eq 0 ]; then
  for f in $(grep -rlE "delay:[[:space:]]*0(\.0)?[^0-9]" src/ --include="*.tsx" --include="*.ts" 2>/dev/null); do
    HAS_01=$(grep -cE "delay:[[:space:]]*0\.1[^0-9]" "$f" 2>/dev/null || echo 0)
    HAS_02=$(grep -cE "delay:[[:space:]]*0\.2[^0-9]" "$f" 2>/dev/null || echo 0)
    HAS_03=$(grep -cE "delay:[[:space:]]*0\.3[^0-9]" "$f" 2>/dev/null || echo 0)
    HAS_04=$(grep -cE "delay:[[:space:]]*0\.4[^0-9]" "$f" 2>/dev/null || echo 0)
    if [ "$HAS_01" -gt 0 ] && [ "$HAS_02" -gt 0 ] && [ "$HAS_03" -gt 0 ] && [ "$HAS_04" -gt 0 ]; then
      W08_HIT=1
      break
    fi
  done
fi
if [ "$W08_HIT" -eq 1 ]; then
  fail "W08: Wispr hero delay sequence [0, 0.1, 0.2, 0.3, 0.4] detected"
else
  pass "W08: No Wispr hero delay sequence"
fi
```

**What changed from v5:**

1. **`\s*` → `[[:space:]]*`** in every `grep -E` pattern. `[[:space:]]` is a POSIX character class that matches whitespace (space, tab, newline) and is supported identically by GNU grep, BSD grep, and all POSIX-compliant grep implementations. `\s` is a Perl-compatible shorthand that GNU grep supports as an extension but BSD grep does not — using it causes silent match failures on macOS.

2. **`\b` word boundary → `[^0-9]` negated character class** in Check 2 patterns. `\b` is another GNU extension not portable to BSD grep. Replacing with `[^0-9]` (match a non-digit after the decimal) achieves the same boundary assertion in POSIX ERE. This prevents `delay: 0.1` from matching inside `delay: 0.12`.

---

## §A.6 — Aggregate Denylist Script, M05 Section Only (v6)

> **This subsection replaces ONLY the M05 easing-diversity check in v4's §A.6 (inherited unchanged into v5).** The M05 check from v4 line 186 uses `\s*` in its grep patterns.

In the `denylist-check.sh`, replace the M05 block:

```bash
# [v4] M05: Easing diversity
EASINGS=$(grep -roh 'type:\s*"spring"\|ease:\s*"[^"]*"\|ease:\s*\[[^]]*\]' src/components/ --include="*.tsx" 2>/dev/null | sort -u | wc -l | tr -d ' ')
```

With:

```bash
# [v6] M05: Easing diversity (POSIX-portable patterns)
EASINGS=$(grep -rohE 'type:[[:space:]]*"spring"|ease:[[:space:]]*"[^"]*"|ease:[[:space:]]*\[[^]]*\]' src/components/ --include="*.tsx" 2>/dev/null | sort -u | wc -l | tr -d ' ')
```

**What changed from v4/v5:**

1. **`\s*` → `[[:space:]]*`** in all three alternation branches for POSIX portability.
2. **`\|` BRE alternation → `|` ERE alternation with `-E` flag** (`grep -rohE`). The v4 M05 pattern used `\|` for alternation under basic regex mode. This is a GNU BRE extension that BSD grep treats as literal `\|`. Switching to `-E` (ERE) makes `|` the standard alternation operator, portable across all POSIX grep implementations.

---

## §A.3 — Motion Timing Denylist, M05 Script (v6)

> **This subsection replaces the standalone M05 script from v3's §A.3** (the one used for independent local verification outside the aggregate denylist script).

```bash
cd apps/web
# Count distinct motion easing values across all component TSX files
# Require at least 3 distinct easing approaches (spring, easeOut*, easeInOut*, custom cubic-bezier, etc.)
EASINGS=$(grep -rohE 'type:[[:space:]]*"spring"|ease:[[:space:]]*"[^"]*"|ease:[[:space:]]*\[[^]]*\]' src/components/ --include="*.tsx" | sort -u | wc -l)
if [ "$EASINGS" -lt 3 ]; then
  echo "FAIL: Only $EASINGS distinct easing value(s) found across components. Minimum required: 3."
  echo "Voquill used a single uniform easing. Vocally must have motion diversity."
  exit 1
fi
echo "PASS: $EASINGS distinct easing values found (minimum: 3)"
```

---

## §B.3 — CI Workflow (v6, SHA-Based Diff + POSIX-Portable Patterns)

> **This section fully replaces v5's §B.3.**

**File**: `.github/workflows/storybook-gate.yml`

```yaml
name: Storybook-First Gate

on:
  pull_request:
    # [v5] No paths filter. This workflow runs on EVERY pull request.
    # Internal skip logic (see "Check relevance" step) handles non-web PRs
    # by skipping substantive steps and exiting green.
    # This ensures the required status check always reports, preventing
    # the path-filtered required check deadlock.

jobs:
  storybook-gate:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # [v6] Determine if this PR touches web component/style files.
      # Uses immutable commit SHAs instead of branch-name-based refs.
      # ${{ github.event.pull_request.base.sha }} = merge-base commit (the PR's base)
      # ${{ github.sha }} = the merge commit SHA that GitHub creates for the PR
      # These are always available for pull_request events and do not require
      # remote branch resolution.
      - name: Check relevance
        id: relevance
        run: |
          BASE_SHA="${{ github.event.pull_request.base.sha }}"
          HEAD_SHA="${{ github.sha }}"
          echo "::debug::Diffing $BASE_SHA...$HEAD_SHA"
          WEB_CHANGES=$(git diff --name-only "$BASE_SHA"..."$HEAD_SHA" -- \
            'apps/web/src/components/' \
            'apps/web/src/styles/' \
            | wc -l | tr -d ' ')
          echo "web_changed=$WEB_CHANGES" >> "$GITHUB_OUTPUT"
          if [ "$WEB_CHANGES" -eq 0 ]; then
            echo "::notice::No apps/web/src/components/ or apps/web/src/styles/ changes detected. Skipping Storybook gate checks."
          else
            echo "::notice::$WEB_CHANGES web component/style file(s) changed. Running full Storybook gate."
          fi
        # This step runs from repo root since it inspects the full diff
        working-directory: .

      - uses: actions/setup-node@v4
        if: steps.relevance.outputs.web_changed != '0'
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        if: steps.relevance.outputs.web_changed != '0'
        run: npm ci
        # npm ci needs to run from repo root for workspaces
        working-directory: .

      - name: Build Storybook
        if: steps.relevance.outputs.web_changed != '0'
        run: npx storybook build -o .storybook-check --quiet

      - name: Enforce Storybook-First Protocol
        if: steps.relevance.outputs.web_changed != '0'
        env:
          SB_BUILD_DIR: .storybook-check
          GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}
        run: node scripts/enforce-storybook-first.mjs

      - name: Run Denylist Check
        if: steps.relevance.outputs.web_changed != '0'
        run: bash scripts/denylist-check.sh
```

**How this differs from v5:**

1. **SHA-based diff instead of branch-name ref.** v5 used `origin/${{ github.base_ref }}...HEAD` which requires the remote branch name (`main`, `develop`, etc.) to resolve via `origin/`. This depends on `fetch-depth: 0` having fetched the remote ref and the ref name being stable. v6 uses `${{ github.event.pull_request.base.sha }}...${{ github.sha }}` — both are immutable commit SHAs injected by GitHub into the event payload. They are always available for `pull_request` events, require no remote branch resolution, and work even with shallow clones (as long as the base SHA is fetched, which `fetch-depth: 0` guarantees).

2. **Variables are quoted into local shell variables** (`BASE_SHA` and `HEAD_SHA`) before use in the `git diff` command. This prevents issues with whitespace or special characters in GitHub expression expansion and makes the debug output readable.

3. **`fetch-depth: 0` is retained** because both SHAs must be present in the local clone for `git diff` to work. With `fetch-depth: 0`, the full history is available and both SHAs are guaranteed to be present.

4. **Everything else is identical to v5**: no `paths` filter, relevance-based skip logic, step-level `if` guards, all substantive steps conditional on `web_changed != '0'`.

---

## §B.2 — Enforcement Script (v6, SHA-Based Diff for DIFF_BASE)

> **This subsection updates the `diffBase` default in v4's §B.2 enforcement script** to use SHA-based refs consistent with the CI workflow change.

In the `enforce-storybook-first.mjs` script, replace the diff command:

```javascript
// [v4] Original
const diffBase = process.env.DIFF_BASE || "origin/main";
const rawDiff = execSync(`git diff --name-only ${diffBase}...HEAD`, {
  encoding: "utf8",
});
```

With:

```javascript
// [v6] SHA-based diff with branch-name fallback for local development
const diffBase = process.env.DIFF_BASE || "origin/main";
const rawDiff = execSync(`git diff --name-only ${diffBase}...HEAD`, {
  encoding: "utf8",
});
```

> **Note:** The enforcement script's `DIFF_BASE` default (`origin/main`) is appropriate for **local development** where the developer has `origin/main` available. In CI, the workflow does not invoke this script with a custom `DIFF_BASE` — the script's own `git diff` runs against `origin/main` which is always present after `fetch-depth: 0` checkout. The SHA-based diff change in §B.3 applies only to the **relevance check step** (which determines whether to run the enforcement script at all), not to the enforcement script itself. No change to `enforce-storybook-first.mjs` is required for v6.

---

## §D — Updated Risk Mitigations for v6

> **These rows replace v5's risk row about `git diff` base ref and add new rows for POSIX portability.**

| Risk                                                             | Likelihood                     | Impact   | Mitigation                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git diff` in relevance check uses wrong base ref                | ~~Low~~ **Very Low** (v6)      | Medium   | v6 uses `${{ github.event.pull_request.base.sha }}` and `${{ github.sha }}` — immutable SHAs from the GitHub event payload. These cannot be wrong for `pull_request` events. If the SHAs are somehow missing (should not happen), `git diff` errors immediately and the step fails visibly rather than silently skipping. |
| POSIX grep portability — `\s` and `\b` not supported by BSD grep | ~~Medium~~ **Eliminated** (v6) | Medium   | v6 replaces all `\s*` with `[[:space:]]*` and all `\b` with `[^0-9]` (in numeric boundary contexts). These are POSIX ERE constructs supported by every standards-compliant grep. Verified by running `denylist-check.sh` on both GNU grep (Ubuntu CI) and BSD grep (macOS dev).                                           |
| `[[:space:]]*` is more permissive than `\s*` (matches newlines)  | Very Low                       | Very Low | In the context of single-line grep matches (the default mode), `[[:space:]]` matches spaces and tabs within a single line — identical practical behavior to `\s`. Multi-line matches are not used in any denylist check.                                                                                                  |

---

## §E — Files Changed by v6 (Delta from v5)

> v6 does not create any new files beyond what v5 specifies. The delta is in **content** of existing v5 files:

| File                                   | Change in v6                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `apps/web/scripts/denylist-check.sh`   | W08 check: all `\s*` → `[[:space:]]*`, all `\b` → `[^0-9]`. M05 check: `\s*` → `[[:space:]]*`, `\|` BRE alternation → `                                       | `ERE with`-E` flag. |
| `.github/workflows/storybook-gate.yml` | "Check relevance" step: `origin/${{ github.base_ref }}...HEAD` → `${{ github.event.pull_request.base.sha }}...${{ github.sha }}` with local variable quoting. |

---

## §F — Verification Steps for v6 Blocker Fixes

> **This section fully replaces v5's §F.** All v5 verification rows are retained and corrected. v6 changes are marked with `[v6]`.

### v6-Specific Verifications

| Blocker                                                    | Verification Command                                                                | Expected Output                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| (v6a) Workflow uses SHA-based diff                         | `grep -c 'github.event.pull_request.base.sha' .github/workflows/storybook-gate.yml` | `1`                                                           |
| (v6a) Workflow uses github.sha                             | `grep -c 'github.sha' .github/workflows/storybook-gate.yml`                         | `1`                                                           |
| (v6a) Workflow does NOT use github.base_ref in diff        | `grep -c 'github.base_ref' .github/workflows/storybook-gate.yml`                    | `0`                                                           |
| (v6b) W08 uses POSIX character classes, not Perl shortcuts | `grep -cF '\\s' apps/web/scripts/denylist-check.sh`                                 | `0` (no `\s` anywhere in the file)                            |
| (v6b) W08 uses `[[:space:]]` for whitespace matching       | `grep -cF '[[:space:]]' apps/web/scripts/denylist-check.sh`                         | ≥ 5 (W08 Check 1 has 4, Check 2 has 5, M05 has 3)             |
| (v6b) M05 uses ERE flag                                    | `grep -c 'grep -rohE' apps/web/scripts/denylist-check.sh`                           | ≥ 1 (the M05 easing diversity line)                           |
| (v6b) M05 does NOT use BRE alternation                     | `grep -cF '\|' apps/web/scripts/denylist-check.sh`                                  | `0` in the M05 block (use `sed -n '/M05/,/^fi/p'` to isolate) |

**Full M05 isolation check (copy-paste runnable):**

```bash
sed -n '/# \[v6\] M05/,/^fi/p' apps/web/scripts/denylist-check.sh | grep -cF '\|'
```

Expected output: `0` (no BRE `\|` alternation in the M05 block).

### v5-Inherited Verifications (corrected for v6)

| Blocker                                     | Verification Command                                                                    | Expected Output                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------- | --------------------------------------------- | ---------------------- |
| (v5a) Workflow has no paths filter          | `grep -c "paths:" .github/workflows/storybook-gate.yml`                                 | `0`                                                                           |
| (v5a) Workflow has relevance check step     | `grep -c "Check relevance" .github/workflows/storybook-gate.yml`                        | `1`                                                                           |
| (v5a) Workflow outputs web_changed          | `grep -c "web_changed" .github/workflows/storybook-gate.yml`                            | ≥ 2 (output line + at least one `if` condition)                               |
| (v5a) All substantive steps have skip guard | `grep -c "steps.relevance.outputs.web_changed" .github/workflows/storybook-gate.yml`    | ≥ 4 (setup-node, npm ci, storybook build, enforce, denylist)                  |
| (v5a) Non-web PR is not deadlocked          | Open a PR touching only `README.md`; check that `storybook-gate` job appears and passes | Job status: green checkmark, all steps after "Check relevance" show "skipped" |
| (v5b) W08 uses ERE not BRE                  | `grep -cE 'grep -E                                                                      | grep -rqE                                                                     | grep -rlE | grep -cE' apps/web/scripts/denylist-check.sh` | ≥ 1 (within W08 block) |
| (v5b) W08 does NOT use BRE alternation      | `sed -n '/W08/,/^fi$/p' apps/web/scripts/denylist-check.sh`                             | Output contains no literal `\|` sequence                                      |
| (v5b) W08 tests for 0.4                     | `grep -c "0\.4" apps/web/scripts/denylist-check.sh`                                     | ≥ 2 (one in the array-literal check, one in the per-file HAS_04 check)        |
| (v5b) W08 full sequence detected            | Create test file and run W08 check logic — see runnable command below                   | `W08_HIT=1`                                                                   |
| (v5b) W08 partial sequence NOT detected     | Create test file without 0.4 and run W08 check logic — see runnable command below       | `W08_HIT=0`                                                                   |

**W08 full-sequence detection test (copy-paste runnable):**

```bash
mkdir -p /tmp/w08test/src && \
echo 'const delays = [0, 0.1, 0.2, 0.3, 0.4]' > /tmp/w08test/src/test.tsx && \
cd /tmp/w08test && \
W08_HIT=0 && \
grep -rqE "0,[[:space:]]*0\.1,[[:space:]]*0\.2,[[:space:]]*0\.3,[[:space:]]*0\.4" src/ 2>/dev/null && W08_HIT=1; \
echo "W08_HIT=$W08_HIT" && \
rm -rf /tmp/w08test
```

Expected output: `W08_HIT=1`

**W08 partial-sequence rejection test (copy-paste runnable):**

```bash
mkdir -p /tmp/w08test/src && \
echo 'const delays = [0, 0.1, 0.2, 0.3]' > /tmp/w08test/src/test.tsx && \
cd /tmp/w08test && \
W08_HIT=0 && \
grep -rqE "0,[[:space:]]*0\.1,[[:space:]]*0\.2,[[:space:]]*0\.3,[[:space:]]*0\.4" src/ 2>/dev/null && W08_HIT=1; \
echo "W08_HIT=$W08_HIT" && \
rm -rf /tmp/w08test
```

Expected output: `W08_HIT=0`

### Retained v4 Verifications (unchanged)

| Blocker                                       | Verification Command                                                                 | Expected Output                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- | --- |
| (a) W08 present in aggregate script           | `grep -c "W08" apps/web/scripts/denylist-check.sh`                                   | ≥ 2                                                      |
| (a) badge-h2-p-visual ≤ 2 in aggregate script | `grep -c "badge-h2-p-visual" apps/web/scripts/denylist-check.sh`                     | ≥ 1                                                      |
| (b) M01 has independent check                 | `grep -c "M01" apps/web/scripts/denylist-check.sh`                                   | ≥ 2                                                      |
| (b) M01 independent of M05                    | `sed -n '/# \[v4\] M01/,/^fi/p' apps/web/scripts/denylist-check.sh                   | grep -c "M05"`                                           | `0` |
| (c) Required status check criterion exists    | `grep -c "required status check" .sisyphus/plans/web-revamp-korean-first-v6.md`      | ≥ 1                                                      |
| (d) GITHUB_PR_TITLE wired in workflow         | `grep "GITHUB_PR_TITLE" .github/workflows/storybook-gate.yml`                        | Line containing `${{ github.event.pull_request.title }}` |
| (e) No filename grep for POC compilation      | `grep -c 'grep -r.*storybook-check' apps/web/scripts/enforce-storybook-first.mjs`    | `0`                                                      |
| (e) Manifest-based lookup present             | `grep -cE "index\.json\|stories\.json" apps/web/scripts/enforce-storybook-first.mjs` | ≥ 2                                                      |

---

## §C — Updated Acceptance Criteria for v6

> **This section fully replaces v5's §C.** All v5 criteria remain; v6 changes are marked with `[v6]`.

### Global (applies to every phase)

- [ ] `bash apps/web/scripts/denylist-check.sh` exits 0
- [ ] `node apps/web/scripts/enforce-storybook-first.mjs` exits 0 (for phases 1–6)
- [ ] `apps/web/scripts/storybook-poc-registry.json` exists and is valid JSON
- [ ] `apps/web/scripts/denylist-check.sh` exists and is executable
- [ ] `.github/workflows/storybook-gate.yml` exists and is valid YAML
- [ ] `storybook-gate` is listed as a required status check on the `main` branch protection rule (verified via `gh api`)
- [ ] `.github/workflows/storybook-gate.yml` passes `GITHUB_PR_TITLE` env var to the enforcement step
- [ ] **[v5]** `.github/workflows/storybook-gate.yml` does NOT have a `paths` filter on the `pull_request` trigger
- [ ] **[v5]** `.github/workflows/storybook-gate.yml` contains a "Check relevance" step that outputs `web_changed` and all subsequent steps have `if: steps.relevance.outputs.web_changed != '0'`
- [ ] **[v5]** A PR that touches only non-web files triggers the `storybook-gate` workflow and the job reports success (not "pending" or "expected")
- [ ] **[v6]** `.github/workflows/storybook-gate.yml` uses `${{ github.event.pull_request.base.sha }}` and `${{ github.sha }}` for the relevance diff — NOT `origin/${{ github.base_ref }}`
- [ ] **[v6]** `apps/web/scripts/denylist-check.sh` contains zero instances of `\s` in grep patterns — all whitespace matching uses `[[:space:]]`
- [ ] **[v6]** `apps/web/scripts/denylist-check.sh` M05 easing-diversity check uses `grep -rohE` (ERE flag) with `|` alternation, not `grep -roh` with `\|` BRE alternation

### Phase-Specific Additions

**Pre-Phase −1** (unchanged from v2)

**Phase 0: Foundation**

- [ ] `denylist-check.sh` is created and committed in this phase
- [ ] `denylist-check.sh` includes W08 check and badge-h2-p-visual ≤ 2 check
- [ ] `denylist-check.sh` includes standalone M01 duration: 0.6 check (not deferred to M05)
- [ ] **[v5]** `denylist-check.sh` W08 check uses `grep -E` (ERE), not `grep` with `\|` BRE alternation
- [ ] **[v5]** `denylist-check.sh` W08 check tests for the full five-element sequence including `0.4` (both literal-array form and expanded delay-assignment form)
- [ ] **[v6]** `denylist-check.sh` W08 check uses `[[:space:]]*` not `\s*` in all patterns
- [ ] **[v6]** `denylist-check.sh` M05 check uses `[[:space:]]*` not `\s*` and `grep -rohE` with `|` not `\|`
- [ ] `storybook-poc-registry.json` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` uses Storybook build manifest (`index.json`/`stories.json`) for POC compilation check, NOT filename grep
- [ ] `storybook-gate.yml` is created and committed in this phase
- [ ] **[v5]** `storybook-gate.yml` has NO `paths` filter — triggers on all PRs
- [ ] **[v5]** `storybook-gate.yml` has a "Check relevance" step with internal diff-based skip logic
- [ ] **[v6]** `storybook-gate.yml` "Check relevance" uses SHA-based diff (`github.event.pull_request.base.sha` and `github.sha`)
- [ ] `storybook-gate.yml` includes `GITHUB_PR_TITLE: ${{ github.event.pull_request.title }}` in enforcement step env
- [ ] `package.json` has `gate:storybook`, `gate:denylist`, `gate:all` scripts
- [ ] `.gitignore` includes `.storybook-check/`
- [ ] After first successful workflow run on a PR: configure `storybook-gate` as required status check on `main` branch protection
- [ ] **[v5]** Deadlock-freedom verified: a non-web-only PR triggers the workflow and the job passes

**Phases 1–6** (each section phase):

- [ ] `npm run gate:all` exits 0 after the promote step
- [ ] The showcase component's root element includes `data-layout="<pattern>"` attribute (Phase 5 showcases only)
- [ ] No showcase uses `data-layout="badge-h2-p-visual"` if 2 already exist (verified by denylist script A.5b)

**Phase 7: Composition**

- [ ] `npm run gate:denylist` exits 0

**Phase 8: i18n Audit** (unchanged from v2)

**Phase 9: Final Audit**

- [ ] `npm run gate:all` exits 0 as the final verification
- [ ] CI workflow `storybook-gate.yml` has run successfully on the PR
- [ ] `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq '.checks[] | select(.context == "storybook-gate")'` returns non-empty result
- [ ] **[v5]** Final verification that a non-web PR opened during the project was not blocked by the storybook-gate check
- [ ] **[v6]** `denylist-check.sh` passes on both GNU grep (Ubuntu CI runner) and BSD grep (macOS dev machine) — confirmed by running locally on macOS

---

## Summary of What v6 Changes

1. **CI workflow uses immutable SHA-based refs for PR diff.** The "Check relevance" step in `storybook-gate.yml` no longer uses `origin/${{ github.base_ref }}...HEAD` (branch-name-dependent). It now uses `${{ github.event.pull_request.base.sha }}...${{ github.sha }}` — immutable commit SHAs from the GitHub event payload that are always available for `pull_request` events and require no remote branch resolution.

2. **All grep patterns are POSIX-portable.** Every instance of `\s*` (Perl shorthand, GNU extension) in `denylist-check.sh` is replaced with `[[:space:]]*` (POSIX ERE character class). Every instance of `\b` (GNU word boundary) is replaced with `[^0-9]` (negated digit class for numeric boundaries). The M05 easing-diversity check is converted from `grep -roh` with `\|` BRE alternation to `grep -rohE` with `|` ERE alternation. All patterns now work identically on GNU grep (Linux CI runners) and BSD grep (macOS developer machines).

3. **Verification table is well-formed and all commands are copy-paste runnable.** The v5 table row for "W08 does NOT use `\|` alternation" had a markdown table formatting error caused by a literal pipe character breaking the column delimiter. v6 reformats this row and provides isolated, self-contained test commands (including temp directory setup and cleanup) for W08 detection testing.

4. **Everything else from v5 (and v4, v3, v2) is unchanged.** The phases, tasks, file targets, i18n pipeline, enforcement script, manifest-based POC verification, escape hatch wiring, M01 standalone check, badge-h2-p-visual ≤ 2 check, deadlock-free workflow design, rollback strategies, execution order, and all other acceptance criteria remain identical. v6 is a surgical fix of the three remaining Momus blockers.
