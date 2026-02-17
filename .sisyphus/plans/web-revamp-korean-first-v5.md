# Plan: Vocally Web Full Revamp — Korean-First, Motion-Rich, Anti-Voquill (v5)

> Revision of `web-revamp-korean-first-v4.md`. Fixes the **two remaining Momus blockers**:
>
> 1. **Path-filtered required check deadlocks non-matching PRs** — v4's `storybook-gate.yml` uses `on.pull_request.paths` to trigger only on PRs touching `apps/web/src/components/**` or `apps/web/src/styles/**`. But §B.7 configures the `storybook-gate` job as a required status check on `main`. GitHub's behavior: when a required status check never runs (because the path filter excludes the PR), the check never reports any status, and the PR is **permanently blocked from merging**. This is the well-known path-filtered required check deadlock. Every non-web PR (docs, server, desktop, CI config) would be unable to merge.
> 2. **W08 grep does not match the full `[0, 0.1, 0.2, 0.3, 0.4]` sequence** — v4's W08 check (§A.6 line 204) uses `grep -rqn "delay: 0\.1.*delay: 0\.2.*delay: 0\.3\|0, 0.1, 0.2, 0.3"`. Two problems: (a) the pattern never tests for `0.4`, so the full five-element Wispr sequence `[0, 0.1, 0.2, 0.3, 0.4]` is not detected if only the `0.4` element is present alongside others, and (b) `\|` alternation in `grep` basic regex mode is a GNU extension — macOS BSD `grep` treats `\|` as a literal backslash-pipe, making the entire check silently pass on macOS CI runners or developer machines. The check is unreliable at the command level.
>
> **Everything else is unchanged from v4 (which is itself a delta on v3, which is a delta on v2).** This document is a **surgical delta** — it replaces only the specific subsections affected by the two blockers. All phases, tasks, file targets, i18n pipeline, rollback strategies, and execution order from v2+v3+v4 remain in effect. Read this document **together with v2, v3, and v4**; where a section header matches, this document's version supersedes v4.

---

## Change Log: v4 → v5

| v4 Weakness                                                                                                                                                                                                                                                        | v5 Fix                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storybook-gate.yml` uses `on.pull_request.paths` filter, but `storybook-gate` is a required status check — PRs that don't touch the filtered paths never trigger the workflow, so the required check never reports and the PR is permanently blocked from merging | Removed `paths` filter from workflow trigger. Workflow now runs on **every** PR. Inside the job, a new first step inspects the PR diff for `apps/web/src/components/` or `apps/web/src/styles/` changes. If none are found, remaining steps are skipped via step-level `if` conditions, and the job exits successfully — reporting a green status to GitHub. The required check always runs and always reports. |
| W08 grep uses `\|` alternation (GNU BRE extension, silent no-op on macOS BSD grep) and omits `0.4` from the match pattern, so the full five-element Wispr delay sequence `[0, 0.1, 0.2, 0.3, 0.4]` is not reliably detected                                        | Replaced single grep with a dedicated bash function that uses `grep -E` (ERE, portable across GNU and BSD) and tests for the **full five-element sequence** `0, 0.1, 0.2, 0.3, 0.4` as well as the expanded form with all five individual `delay:` assignments (0 through 0.4). Both patterns must include `0.4` to match.                                                                                      |

---

## §A.6 — Aggregate Denylist Script, W08 Section Only (v5)

> **This subsection replaces ONLY the W08 check block (lines 203–204) in v4's §A.6.** All other checks in the aggregate denylist script remain exactly as specified in v4.

In v4's `denylist-check.sh`, replace the W08 block:

```bash
# [v4] W08: Wispr exact hero word delay sequence
grep -rqn "delay: 0\.1.*delay: 0\.2.*delay: 0\.3\|0, 0.1, 0.2, 0.3" src/ 2>/dev/null && fail "W08: Wispr hero delay sequence [0, 0.1, 0.2, 0.3, 0.4] found" || pass "W08: No Wispr hero delay sequence"
```

With this block:

```bash
# [v5] W08: Wispr exact hero word delay sequence [0, 0.1, 0.2, 0.3, 0.4]
# Uses grep -E (ERE) for portable alternation (works on both GNU and BSD grep).
# Tests for the full five-element sequence including 0.4.
# Pattern 1: Array-literal form — "0, 0.1, 0.2, 0.3, 0.4" (with or without spaces)
# Pattern 2: Expanded delay-assignment form — all five delay values 0 through 0.4 in one file
W08_HIT=0
# Check 1: literal array form with all five values including 0.4
grep -rqE "0,\s*0\.1,\s*0\.2,\s*0\.3,\s*0\.4" src/ 2>/dev/null && W08_HIT=1
# Check 2: file-level scan — any single file containing all five delay assignments
if [ "$W08_HIT" -eq 0 ]; then
  for f in $(grep -rlE "delay:\s*0(\.0)?\b" src/ --include="*.tsx" --include="*.ts" 2>/dev/null); do
    HAS_01=$(grep -cE "delay:\s*0\.1\b" "$f" 2>/dev/null || echo 0)
    HAS_02=$(grep -cE "delay:\s*0\.2\b" "$f" 2>/dev/null || echo 0)
    HAS_03=$(grep -cE "delay:\s*0\.3\b" "$f" 2>/dev/null || echo 0)
    HAS_04=$(grep -cE "delay:\s*0\.4\b" "$f" 2>/dev/null || echo 0)
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

**Why this fixes both sub-problems:**

1. **Full sequence including `0.4`**: Check 1 matches the literal comma-separated form `0, 0.1, 0.2, 0.3, 0.4` — all five elements. Check 2 scans individual files for all five `delay:` assignments (0 through 0.4), requiring all five to be present in the same file. Neither check can pass without matching `0.4`.

2. **Portable regex**: Every `grep` call uses `-E` (extended regex), which is POSIX-standard and works identically on GNU grep (Linux CI runners) and BSD grep (macOS developer machines). No `\|` BRE alternation is used anywhere.

3. **No false positives**: Check 2 requires all five delay values in a **single file** — a project with `delay: 0.1` in one file and `delay: 0.4` in an unrelated file does not trigger. Check 1 only matches the literal five-element comma sequence.

---

## §B.3 — CI Workflow (v5, Always-Running with Internal Skip Logic)

> **This section fully replaces v4's §B.3.**

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

      # [v5] Determine if this PR touches web component/style files.
      # If not, all subsequent steps are skipped and the job reports success.
      - name: Check relevance
        id: relevance
        run: |
          WEB_CHANGES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD -- \
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

**How this solves the deadlock:**

1. **No `paths` filter on the trigger.** The workflow fires on every `pull_request` event regardless of which files changed.
2. **The `storybook-gate` job always runs.** It always starts, always reaches completion, and always reports a status back to GitHub.
3. **Internal relevance check.** The first step after checkout diffs the PR against the base branch for `apps/web/src/components/` and `apps/web/src/styles/` changes. It writes the count to `$GITHUB_OUTPUT`.
4. **Step-level `if` guards.** Every subsequent step (setup-node, npm ci, storybook build, enforcement, denylist) has `if: steps.relevance.outputs.web_changed != '0'`. When the PR has no relevant changes, these steps are skipped — they show as grey "skipped" in the Actions UI, and the job completes with a green checkmark.
5. **Required status check always resolves.** Since the job runs and reports success for non-web PRs, GitHub branch protection sees a passing `storybook-gate` check on every PR. No PR is ever deadlocked.
6. **Web PRs still get full enforcement.** When the diff does include component or style changes, all steps run exactly as in v4 — Storybook build, manifest-based POC verification, and denylist checks all execute and can fail the PR.
7. **Cost of running on all PRs is minimal.** Non-web PRs only execute checkout + a single `git diff | wc -l` command (~2 seconds). No npm install, no Storybook build.

---

## §B.7 — Required Status Check Setup (v5, Updated)

> **This section replaces v4's §B.7.** The setup procedure is the same, but the rationale is updated to reflect the always-running workflow design.

The `storybook-gate` CI workflow (§B.3) only blocks merges if GitHub branch protection is configured to require it. Because v5's workflow runs on **every** PR (not just path-filtered ones), the required status check can be configured immediately — there is no deadlock risk.

### Setup (one-time, during Phase 0)

After the `storybook-gate.yml` file is committed and a PR is opened (any PR — the workflow no longer needs specific file paths to trigger):

1. Navigate to **Settings → Branches → Branch protection rules** for `main`.
2. Enable **"Require status checks to pass before merging"**.
3. Search for and add `storybook-gate` (the job name from the workflow).
4. Save the branch protection rule.

**Alternatively, via GitHub CLI:**

```bash
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

### Deadlock-Freedom Verification

To confirm that the always-running workflow design prevents deadlock, open a PR that touches **only** a non-web file (e.g., `README.md` or `apps/desktop/`). Verify:

1. The `storybook-gate` job appears in the PR's checks.
2. The job completes with a green checkmark (not "Expected — Waiting for status to be reported").
3. The "Check relevance" step shows `web_changed=0` in its output.
4. All subsequent steps show "skipped" status.
5. The PR is **not blocked** from merging by the `storybook-gate` check.

---

## §C — Updated Acceptance Criteria for v5

> **This section fully replaces v4's §C.** All v4 criteria remain; v5 changes are marked with `[v5]`.

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

### Phase-Specific Additions

**Pre-Phase −1** (unchanged from v2)

**Phase 0: Foundation**

- [ ] `denylist-check.sh` is created and committed in this phase
- [ ] `denylist-check.sh` includes W08 check and badge-h2-p-visual ≤ 2 check
- [ ] `denylist-check.sh` includes standalone M01 duration: 0.6 check (not deferred to M05)
- [ ] **[v5]** `denylist-check.sh` W08 check uses `grep -E` (ERE), not `grep` with `\|` BRE alternation
- [ ] **[v5]** `denylist-check.sh` W08 check tests for the full five-element sequence including `0.4` (both literal-array form and expanded delay-assignment form)
- [ ] `storybook-poc-registry.json` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` is created and committed in this phase
- [ ] `enforce-storybook-first.mjs` uses Storybook build manifest (`index.json`/`stories.json`) for POC compilation check, NOT filename grep
- [ ] `storybook-gate.yml` is created and committed in this phase
- [ ] **[v5]** `storybook-gate.yml` has NO `paths` filter — triggers on all PRs
- [ ] **[v5]** `storybook-gate.yml` has a "Check relevance" step with internal diff-based skip logic
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

---

## §D — Updated Risk Mitigations for v5

> **These rows are added to v4's risk table.**

| Risk                                                                                                                     | Likelihood | Impact   | Mitigation                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Always-running workflow adds CI minutes on non-web PRs                                                                   | Medium     | Very Low | Non-web PRs only execute `checkout` + `git diff \| wc -l` (~2 seconds, no npm install, no build). At GitHub Actions free-tier rates this is negligible. If CI minutes become a concern, the relevance check could be moved to a separate lightweight job that the main job depends on, but this is not needed at current scale.                                                      |
| `git diff` in relevance check uses wrong base ref                                                                        | Low        | Medium   | Uses `origin/${{ github.base_ref }}` which GitHub populates for all `pull_request` events. This is the standard pattern for PR-scoped diffs. If `github.base_ref` is ever empty (should not happen for `pull_request` trigger), the diff would fail and the step would error, causing the job to fail visibly rather than silently skip.                                             |
| W08 Check 2 (per-file scan) has false negatives if delay values are in a shared constants file imported by the component | Low        | Low      | Check 1 (literal array form) catches the most common pattern. The per-file scan is a secondary net. If Wispr-style delays are defined in a constants file, they would appear as `0, 0.1, 0.2, 0.3, 0.4` in that file and be caught by Check 1. If spread across multiple constants files, the risk is accepted — the pattern is already sufficiently de-Wispr'd by being fragmented. |
| W08 `grep -E "delay:\s*0(\.0)?\b"` matches `delay: 0` in non-Wispr contexts (e.g., `delay: 0` meaning "no delay")        | Very Low   | Very Low | A single `delay: 0` alone is not a FAIL — the check requires ALL FIVE values (0, 0.1, 0.2, 0.3, 0.4) to be present in the same file. `delay: 0` in isolation (without the other four) does not trigger.                                                                                                                                                                              |

---

## §E — Files Changed by v5 (Delta from v4)

> v5 does not create any new files beyond what v4 specifies. The delta is in **content** of existing v4 files:

| File                                   | Change in v5                                                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/scripts/denylist-check.sh`   | W08 check block replaced: single unreliable `grep` with BRE `\|` → two-phase check using `grep -E` (ERE) that tests the full five-element sequence including `0.4`                                                       |
| `.github/workflows/storybook-gate.yml` | Removed `paths` filter from `on.pull_request` trigger; added "Check relevance" step with `git diff`-based detection and `$GITHUB_OUTPUT`; added `if: steps.relevance.outputs.web_changed != '0'` to all subsequent steps |

---

## §F — Verification Steps for v5 Blocker Fixes

> **This section replaces v4's §F.** v4's verification rows for blockers (a)–(e) are still valid. v5 adds rows for the two new blockers and updates the W08 row.

### v5-Specific Verifications

| Blocker                                     | Verification Command                                                                                                         | Expected Output                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| (v5a) Workflow has no paths filter          | `grep -c "paths:" .github/workflows/storybook-gate.yml`                                                                      | `0`                                                                           |
| (v5a) Workflow has relevance check step     | `grep -c "Check relevance" .github/workflows/storybook-gate.yml`                                                             | `1`                                                                           |
| (v5a) Workflow outputs web_changed          | `grep -c "web_changed" .github/workflows/storybook-gate.yml`                                                                 | ≥ 2 (output line + at least one `if` condition)                               |
| (v5a) All substantive steps have skip guard | `grep -c "steps.relevance.outputs.web_changed" .github/workflows/storybook-gate.yml`                                         | ≥ 4 (setup-node, npm ci, storybook build, enforce, denylist)                  |
| (v5a) Non-web PR is not deadlocked          | Open a PR touching only `README.md`; check that `storybook-gate` job appears and passes                                      | Job status: green checkmark, all steps after "Check relevance" show "skipped" |
| (v5b) W08 uses ERE not BRE                  | `grep -c 'grep -E' apps/web/scripts/denylist-check.sh` (within W08 block)                                                    | ≥ 1                                                                           |
| (v5b) W08 does NOT use `\|` alternation     | `grep -cE '\\                                                                                                                | ' apps/web/scripts/denylist-check.sh` (within W08 block only)                 | `0` (no BRE alternation in W08 block) |
| (v5b) W08 tests for 0.4                     | `grep -c "0\.4" apps/web/scripts/denylist-check.sh`                                                                          | ≥ 2 (one in the array-literal check, one in the per-file HAS_04 check)        |
| (v5b) W08 full sequence detected            | Create a test file `echo 'const delays = [0, 0.1, 0.2, 0.3, 0.4]' > /tmp/w08test.tsx` and run the W08 check logic against it | `W08_HIT=1`                                                                   |
| (v5b) W08 partial sequence NOT detected     | Create a test file `echo 'const delays = [0, 0.1, 0.2, 0.3]' > /tmp/w08partial.tsx` and run the W08 check logic against it   | `W08_HIT=0` (four-element sequence without 0.4 does not trigger)              |

### Retained v4 Verifications (unchanged)

| Blocker                                       | Verification Command                                                                 | Expected Output                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| (a) W08 present in aggregate script           | `grep -c "W08" apps/web/scripts/denylist-check.sh`                                   | ≥ 2                                                      |
| (a) badge-h2-p-visual ≤ 2 in aggregate script | `grep -c "badge-h2-p-visual" apps/web/scripts/denylist-check.sh`                     | ≥ 1                                                      |
| (b) M01 has independent check                 | `grep -c "M01" apps/web/scripts/denylist-check.sh`                                   | ≥ 2                                                      |
| (b) M01 independent of M05                    | `sed -n '/# \[v4\] M01/,/^fi/p' apps/web/scripts/denylist-check.sh \| grep -c "M05"` | `0`                                                      |
| (c) Required status check criterion exists    | `grep -c "required status check" .sisyphus/plans/web-revamp-korean-first-v5.md`      | ≥ 1                                                      |
| (d) GITHUB_PR_TITLE wired in workflow         | `grep "GITHUB_PR_TITLE" .github/workflows/storybook-gate.yml`                        | Line containing `${{ github.event.pull_request.title }}` |
| (e) No filename grep for POC compilation      | `grep -c 'grep -r.*storybook-check' apps/web/scripts/enforce-storybook-first.mjs`    | `0`                                                      |
| (e) Manifest-based lookup present             | `grep -c "index.json\|stories.json" apps/web/scripts/enforce-storybook-first.mjs`    | ≥ 2                                                      |

---

## Summary of What v5 Changes

1. **CI workflow no longer deadlocks non-web PRs.** The `paths` filter is removed from `storybook-gate.yml`. The workflow now triggers on every `pull_request` event. A new "Check relevance" step performs an internal `git diff` to detect whether `apps/web/src/components/` or `apps/web/src/styles/` files were changed. If no relevant files changed, all subsequent steps (Node setup, npm ci, Storybook build, enforcement script, denylist check) are skipped via step-level `if` conditions. The job completes successfully and reports a green status to GitHub. The required status check is always satisfied. Non-web PRs are never blocked.

2. **W08 detects the full five-element Wispr delay sequence `[0, 0.1, 0.2, 0.3, 0.4]` with command-level reliability.** The single unreliable `grep` with BRE `\|` alternation is replaced with a two-phase check: (1) a `grep -E` for the literal five-element comma-separated form including `0.4`, and (2) a per-file scan using `grep -E` that requires all five individual `delay:` assignments (0, 0.1, 0.2, 0.3, 0.4) in the same file. All regex uses ERE (`-E` flag), which is POSIX-standard and portable across GNU and BSD grep. The pattern cannot match without `0.4` being present.

3. **Everything else from v4 (and v3, and v2) is unchanged.** The phases, tasks, file targets, i18n pipeline, enforcement script logic, manifest-based POC verification, escape hatch wiring, M01 standalone check, badge-h2-p-visual ≤ 2 check, rollback strategies, execution order, and all other acceptance criteria remain identical. v5 is a surgical fix of the two remaining Momus blockers.
