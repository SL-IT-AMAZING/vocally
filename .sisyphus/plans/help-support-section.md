# Plan: Help & Support Section + Email Updates

## Requirements Summary

- Add a "Help & Support" section to the desktop app's Settings page with "Report a Bug" and "Send Feedback" mailto links
- Update the web marketing site footer contact email from `support@vocally.so` to `slit.amazing@gmail.com`
- Update all stale email references across the codebase (`support@vocally.so` in error messages, `sales@vocally.so` in enterprise contact)
- Zero new files, zero new dependencies, zero architectural changes

## Scope & Constraints

### In Scope

- Desktop: New "Help & Support" section in `SettingsPage.tsx`
- Desktop: Update `support@vocally.so` in subscription portal error message
- Desktop: Update `sales@vocally.so` in enterprise contact message
- Web: Update footer `mailto:` link email
- Desktop i18n locale files: Will need re-extraction after source changes (automated via existing `i18n:extract` and `i18n:sync` scripts)

### Out of Scope

- No backend/server changes
- No new components or files
- No changes to `apps/web/content/refund.md` (legal content — user should update separately if desired)
- No git commit or push (user tests locally first)

### Technical Constraints

- Must use existing `openUrl()` from `@tauri-apps/plugin-opener` (already imported at line 36)
- Must use existing `Section` + `ListTile` component pattern
- Must use `FormattedMessage` with `defaultMessage` only (no manual IDs) for all new strings
- Must use `getVersion()` (async, from `@tauri-apps/api/app`) and `getPlatform()` (sync, from `../../utils/platform.utils`)
- TypeScript must compile cleanly

## Implementation Steps

### Step 1: Desktop — Add imports to SettingsPage.tsx

**File**: `apps/desktop/src/components/settings/SettingsPage.tsx`

Add two new MUI icon imports to the existing icon import block (lines 1–22):

```typescript
// Add to the @mui/icons-material import block (alphabetical order):
BugReportOutlined,
FeedbackOutlined,
```

The full import becomes (add between existing alphabetical entries):

- `BugReportOutlined` — after `ArrowOutwardRounded`
- `FeedbackOutlined` — after `DescriptionOutlined`

Add `getVersion` import:

```typescript
import { getVersion } from "@tauri-apps/api/app";
```

Add `getPlatform` import:

```typescript
import { getPlatform } from "../../utils/platform.utils";
```

**Note**: `openUrl` is already imported at line 36. `useEffect` will need to be added to the React import at line 37 (currently only `ChangeEvent, useState`).

### Step 2: Desktop — Add version state and fetch logic

**File**: `apps/desktop/src/components/settings/SettingsPage.tsx`

Inside the `SettingsPage` component function (after line 77's `appLocale` state), add:

```typescript
const [appVersion, setAppVersion] = useState("");

useEffect(() => {
  void getVersion().then(setAppVersion);
}, []);
```

This fetches the app version once on mount. `getPlatform()` is synchronous and can be called inline when constructing the mailto URL.

### Step 3: Desktop — Create the "Help & Support" section variable

**File**: `apps/desktop/src/components/settings/SettingsPage.tsx`

Add a new section variable **after** the `advanced` section (after line 501's `);`) and **before** the `dangerZone` section (line 503):

```tsx
const helpAndSupport = (
  <Section
    title={<FormattedMessage defaultMessage="Help & Support" />}
    description={
      <FormattedMessage defaultMessage="Get help, report issues, or share your feedback." />
    }
  >
    <ListTile
      title={<FormattedMessage defaultMessage="Report a bug" />}
      subtitle={
        <FormattedMessage defaultMessage="Let us know about any issues you've encountered" />
      }
      leading={<BugReportOutlined />}
      trailing={<ArrowOutwardRounded />}
      onClick={() => {
        const platform = getPlatform();
        const subject = encodeURIComponent(
          `Bug Report - Vocally v${appVersion}`,
        );
        const body = encodeURIComponent(
          `Platform: ${platform}\nVersion: ${appVersion}\n\nDescribe the issue:\n`,
        );
        void openUrl(
          `mailto:slit.amazing@gmail.com?subject=${subject}&body=${body}`,
        );
      }}
    />
    <ListTile
      title={<FormattedMessage defaultMessage="Send feedback" />}
      subtitle={
        <FormattedMessage defaultMessage="Share ideas or suggestions to improve Vocally" />
      }
      leading={<FeedbackOutlined />}
      trailing={<ArrowOutwardRounded />}
      onClick={() => {
        const subject = encodeURIComponent(`Feedback - Vocally v${appVersion}`);
        void openUrl(`mailto:slit.amazing@gmail.com?subject=${subject}`);
      }}
    />
  </Section>
);
```

**Pattern notes**:

- Matches existing `advanced` and `dangerZone` sections exactly: `Section` with `title` + `description`, containing `ListTile` items
- Uses `ArrowOutwardRounded` trailing icon — same as "Terms & conditions" and "Privacy policy" links (lines 484, 490)
- Uses `void openUrl(...)` inline — same as Terms/Privacy onClick handlers (lines 483, 489)
- Uses `encodeURIComponent` for subject/body to handle special characters safely
- `getPlatform()` is synchronous (returns cached value), safe to call in onClick

### Step 4: Desktop — Render the new section in the return JSX

**File**: `apps/desktop/src/components/settings/SettingsPage.tsx`

In the return statement (lines 528–548), add the new section **between** the `advanced` Paper and the `dangerZone` Paper.

Current (lines 540–544):

```tsx
<Paper variant="flat" sx={{ p: 2, borderRadius: 3, mb: 3 }}>
  {advanced}
</Paper>
<Paper variant="flat" sx={{ p: 2, borderRadius: 3 }}>
  {dangerZone}
</Paper>
```

Change to:

```tsx
<Paper variant="flat" sx={{ p: 2, borderRadius: 3, mb: 3 }}>
  {advanced}
</Paper>
<Paper variant="flat" sx={{ p: 2, borderRadius: 3, mb: 3 }}>
  {helpAndSupport}
</Paper>
<Paper variant="flat" sx={{ p: 2, borderRadius: 3 }}>
  {dangerZone}
</Paper>
```

**Note**: The `advanced` Paper already has `mb: 3`. The new `helpAndSupport` Paper also needs `mb: 3`. The `dangerZone` Paper remains without `mb` (it's the last item — matches existing pattern).

### Step 5: Desktop — Update support email in subscription error message

**File**: `apps/desktop/src/components/settings/SettingsPage.tsx`

On line 219, change:

```
"Could not open subscription management. Please contact support@vocally.so.",
```

to:

```
"Could not open subscription management. Please contact slit.amazing@gmail.com.",
```

### Step 6: Desktop — Update sales email in PlanList enterprise message

**File**: `apps/desktop/src/components/pricing/PlanList.tsx`

On line 412, change:

```tsx
<FormattedMessage defaultMessage="Contact sales@vocally.so to get an enterprise account with dedicated support." />
```

to:

```tsx
<FormattedMessage defaultMessage="Contact slit.amazing@gmail.com to get an enterprise account with dedicated support." />
```

### Step 7: Web — Update footer contact email

**File**: `apps/web/src/components/site-footer.tsx`

On line 34, change:

```tsx
<a href="mailto:support@vocally.so">
```

to:

```tsx
<a href="mailto:slit.amazing@gmail.com">
```

### Step 8: Verify TypeScript compiles

Run from the monorepo root:

```bash
npx turbo check-types
```

This ensures no type errors were introduced. Expected: clean pass (no new types, no new dependencies, just JSX additions and string changes).

### Step 9: Verify build succeeds

Run from the monorepo root:

```bash
npx turbo build
```

### Step 10 (Optional): Re-extract i18n messages

Since we changed `defaultMessage` strings in both desktop and web apps, run extraction:

```bash
# Desktop
npm run i18n:extract --workspace apps/desktop
npm run i18n:sync --workspace apps/desktop

# Web
npm run i18n:extract --workspace apps/web
npm run i18n:sync --workspace apps/web
```

This regenerates the locale JSON files with the new/changed message IDs. The old `support@vocally.so` and `sales@vocally.so` message keys will be removed and replaced with new ones containing the updated email.

**Note**: The locale files (`es.json`, `ko.json`, `fr.json`, etc.) currently contain Korean text for all non-English locales for the enterprise contact message. The extraction will update the key; translations will need to be updated separately if desired.

## Files Changed Summary

| File                                                    | Change                                                                            | Lines Affected                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| `apps/desktop/src/components/settings/SettingsPage.tsx` | Add imports, version state, Help & Support section, render it, update error email | ~50 lines added, 1 line changed |
| `apps/desktop/src/components/pricing/PlanList.tsx`      | Update enterprise contact email                                                   | 1 line changed                  |
| `apps/web/src/components/site-footer.tsx`               | Update footer mailto href                                                         | 1 line changed                  |

## Acceptance Criteria

- [ ] Desktop Settings page shows a new "Help & Support" section between "Advanced" and "Danger Zone"
- [ ] "Report a Bug" tile opens the user's default email client with pre-filled subject (`Bug Report - Vocally v{version}`) and body (platform + version + prompt)
- [ ] "Send Feedback" tile opens the user's default email client with pre-filled subject (`Feedback - Vocally v{version}`)
- [ ] Both tiles show `BugReportOutlined` / `FeedbackOutlined` leading icons and `ArrowOutwardRounded` trailing icons
- [ ] The recipient email for both mailto links is `slit.amazing@gmail.com`
- [ ] Web footer "Contact" link points to `mailto:slit.amazing@gmail.com`
- [ ] Subscription portal error message references `slit.amazing@gmail.com` instead of `support@vocally.so`
- [ ] Enterprise contact message references `slit.amazing@gmail.com` instead of `sales@vocally.so`
- [ ] `npx turbo check-types` passes with zero errors
- [ ] `npx turbo build` succeeds
- [ ] No new files created
- [ ] No new npm dependencies added

## Risk Mitigations

| Risk                                                           | Mitigation                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `getVersion()` is async — could show empty string briefly      | Initialize state as `""` — mailto still works, just shows `v` without number. Version loads in <50ms so practically invisible.            |
| `encodeURIComponent` might double-encode on some email clients | Standard approach — `encodeURIComponent` is the correct encoding for mailto query params per RFC 6068.                                    |
| i18n extraction changes message IDs for updated strings        | Expected behavior — old keys are removed, new keys are added. Non-English translations will fall back to defaultMessage until translated. |
| `openUrl` might fail on systems without default email client   | Existing pattern — same risk as Terms/Privacy links. Tauri's opener handles gracefully.                                                   |
| Legal pages (`refund.md`) still reference `support@vocally.so` | Intentionally out of scope — flagged for user awareness. Legal content changes should be deliberate.                                      |

## Verification Steps

1. **Visual check**: Open the desktop app → Settings. Confirm "Help & Support" section appears between "Advanced" and "Danger Zone" with correct styling.
2. **Bug Report flow**: Click "Report a Bug" → Verify email client opens with:
   - To: `slit.amazing@gmail.com`
   - Subject: `Bug Report - Vocally v{actual version}`
   - Body contains platform name and version
3. **Feedback flow**: Click "Send Feedback" → Verify email client opens with:
   - To: `slit.amazing@gmail.com`
   - Subject: `Feedback - Vocally v{actual version}`
4. **Web footer**: Open the marketing site → Scroll to footer → Click "Contact" → Verify mailto opens to `slit.amazing@gmail.com`
5. **Error message**: (Hard to trigger naturally) Search codebase to confirm `support@vocally.so` no longer appears in `SettingsPage.tsx`
6. **Enterprise contact**: Open pricing/plan list → Confirm enterprise message shows `slit.amazing@gmail.com`
7. **Type check**: `npx turbo check-types` — zero errors
8. **Build**: `npx turbo build` — success

## Notes for Implementer

- The `useEffect` import needs to be added to the React import on line 37: change `ChangeEvent, useState` to `ChangeEvent, useEffect, useState`
- Keep icon imports in alphabetical order within the `@mui/icons-material` block
- The `getPlatform` import already exists in other files (`AppSideEffects.tsx`) — use the same import path: `../../utils/platform.utils`
- `getVersion` import path: `@tauri-apps/api/app` (same as `DashboardPage.tsx` line 2)
- All `openUrl` calls are wrapped in `void` to handle the Promise — follow this pattern
