# Vocally Desktop i18n Missing Translations - Comprehensive Report

## Executive Summary

**Date:** February 11, 2026  
**Locale:** Korean (ko)  
**Impact:** Users with Korean language setting will see English text for these strings  
**Severity:** HIGH - Multiple UI elements will display in English

---

## 1. HARDCODED STRINGS IN JSX (NOT USING FormattedMessage)

### 1.1 Empty State Messages - `VirtualizedListPage.tsx`

**File:** `apps/desktop/src/components/common/VirtualizedListPage.tsx`  
**Lines:** 185, 188

```tsx
<Typography variant="h6" color="text.secondary">
  It's quiet in here
</Typography>
<Typography variant="body2" color="text.secondary">
  There are no items to display.
</Typography>
```

**Impact:** These strings appear in ANY empty list view across the app (Transcriptions, Dictionary, etc.)  
**Status:** ⚠️ HARDCODED - NO TRANSLATION AVAILABLE

---

## 2. HARDCODED PLACEHOLDER TEXT (English only)

### 2.1 OpenRouterModelPicker.tsx

**File:** `apps/desktop/src/components/settings/OpenRouterModelPicker.tsx`  
**Line:** 299

```tsx
placeholder="Search models..."
```

**Status:** ⚠️ HARDCODED PLACEHOLDER

---

### 2.2 ToneEditorDialog.tsx

**File:** `apps/desktop/src/components/tones/ToneEditorDialog.tsx`  
**Lines:** 213, 224

```tsx
placeholder="Casual, Formal, Business..."
placeholder="Make it sound like a professional but friendly email. Use jargon and fun words."
```

**Status:** ⚠️ HARDCODED PLACEHOLDER

---

### 2.3 ApiKeyList.tsx

**File:** `apps/desktop/src/components/settings/ApiKeyList.tsx`  
**Lines:** 235, 250, 262, 276, 288, 303

```tsx
placeholder="Paste your Azure subscription key"           // Line 235
placeholder="https://my-resource.openai.azure.com"       // Line 250
placeholder="Paste your Azure OpenAI API key"            // Line 262
placeholder={OLLAMA_DEFAULT_URL}                         // Line 276 (constant)
placeholder="Leave empty if not required"                // Line 288
placeholder="Paste your API key"                         // Line 303
```

**Status:** ⚠️ HARDCODED PLACEHOLDERS

---

## 3. HARDCODED ARIA-LABELS (Accessibility text)

### 3.1 AIPostProcessingDialog.tsx

**File:** `apps/desktop/src/components/settings/AIPostProcessingDialog.tsx`  
**Line:** 35

```tsx
aria-label="Close"
```

**Impact:** Screen reader users will hear English text  
**Status:** ⚠️ HARDCODED ARIA-LABEL

---

### 3.2 AIAgentModeDialog.tsx

**File:** `apps/desktop/src/components/settings/AIAgentModeDialog.tsx`  
**Line:** 35

```tsx
aria-label="Close"
```

**Status:** ⚠️ HARDCODED ARIA-LABEL

---

### 3.3 AITranscriptionDialog.tsx

**File:** `apps/desktop/src/components/settings/AITranscriptionDialog.tsx`  
**Line:** 30

```tsx
aria-label="Close"
```

**Status:** ⚠️ HARDCODED ARIA-LABEL

---

### 3.4 HotkeySetting.tsx

**File:** `apps/desktop/src/components/settings/HotkeySetting.tsx`  
**Lines:** 155, 174

```tsx
aria-label="Disable hotkey"
aria-label="Revert to default hotkey"
```

**Status:** ⚠️ HARDCODED ARIA-LABELS

---

## 4. VERIFIED TRANSLATION STATUS

### The User-Mentioned Strings - Status Check

#### ✅ STRING 1: Dictionary Help Text
**Key:** `voquill_may_misunderstand_you_on_occasion_if_you_see_certain`  
**Component:** `apps/desktop/src/components/dictionary/DictionaryPage.tsx`  
**Line:** 91

```tsx
<FormattedMessage defaultMessage="Vocally may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically." />
```

**English:** "Vocally may misunderstand you on occasion. If you see certain words being missed frequently, you can define a replacement rule here to fix the spelling automatically."

**Korean:** "Vocally은 가끔 잘못 이해할 수 있습니다. 특정 단어가 자주 누락되는 경우 여기에서 대체 규칙을 정의하여 철자를 자동으로 수정할 수 있습니다."

**Status:** ✅ TRANSLATED - Using FormattedMessage correctly

---

#### ❌ STRINGS 2 & 3: Empty State Messages
**Keys:** Not translated  
**Component:** `apps/desktop/src/components/common/VirtualizedListPage.tsx`  
**Lines:** 185, 188

**English:** 
- "It's quiet in here"
- "There are no items to display."

**Korean:** MISSING

**Status:** ❌ HARDCODED - NO TRANSLATION

---

## 5. LOCALE FILE COMPARISON

**File:** `apps/desktop/src/i18n/locales/`

| Locale | File | Lines | Status |
|--------|------|-------|--------|
| English | `en.json` | 449 | Complete |
| Korean | `ko.json` | 449 | **Missing 2+ strings** |

**Observation:** Line counts are identical, BUT Korean file is missing hardcoded strings that don't use FormattedMessage.

---

## 6. FILES REQUIRING FIXES

### Critical (Empty State - High Visibility)

1. **`apps/desktop/src/components/common/VirtualizedListPage.tsx`**
   - [ ] Wrap "It's quiet in here" in `<FormattedMessage>`
   - [ ] Wrap "There are no items to display." in `<FormattedMessage>`

### High Priority (User-Facing Text)

2. **`apps/desktop/src/components/settings/ApiKeyList.tsx`**
   - [ ] Move 6 placeholder strings to translations
   - [ ] Add i18n keys for Azure, Ollama, and generic API key placeholders

3. **`apps/desktop/src/components/tones/ToneEditorDialog.tsx`**
   - [ ] Move 2 placeholder strings to translations
   - [ ] Add i18n keys for tone name and prompt examples

4. **`apps/desktop/src/components/settings/OpenRouterModelPicker.tsx`**
   - [ ] Move "Search models..." placeholder to translations

### Medium Priority (Accessibility)

5. **`apps/desktop/src/components/settings/AIPostProcessingDialog.tsx`**
   - [ ] Replace "Close" aria-label with `<FormattedMessage>`

6. **`apps/desktop/src/components/settings/AIAgentModeDialog.tsx`**
   - [ ] Replace "Close" aria-label with `<FormattedMessage>`

7. **`apps/desktop/src/components/settings/AITranscriptionDialog.tsx`**
   - [ ] Replace "Close" aria-label with `<FormattedMessage>`

8. **`apps/desktop/src/components/settings/HotkeySetting.tsx`**
   - [ ] Replace 2 aria-labels with `<FormattedMessage>`

---

## 7. IMPACT ASSESSMENT

### Current User Experience (Korean Locale)

| Feature | Expected | Actual | Impact |
|---------|----------|--------|--------|
| Dictionary help text | Korean | Korean ✅ | None |
| Empty transcriptions list | Korean | **English** ❌ | Medium |
| Empty dictionary list | Korean | **English** ❌ | Medium |
| API key input placeholders | Korean | **English** ❌ | High |
| Tone editor placeholders | Korean | **English** ❌ | High |
| Dialog close buttons (a11y) | Korean | **English** ❌ | Low |
| Model search placeholder | Korean | **English** ❌ | Low |

**Overall:** 7+ UI elements will show in English to Korean users

---

## 8. FILES AFFECTED SUMMARY

```
apps/desktop/src/components/
├── common/
│   └── VirtualizedListPage.tsx          ❌ 2 strings
├── settings/
│   ├── ApiKeyList.tsx                   ❌ 6+ strings
│   ├── OpenRouterModelPicker.tsx        ❌ 1 string
│   ├── HotkeySetting.tsx                ❌ 2 aria-labels
│   ├── AIPostProcessingDialog.tsx       ❌ 1 aria-label
│   ├── AIAgentModeDialog.tsx            ❌ 1 aria-label
│   └── AITranscriptionDialog.tsx        ❌ 1 aria-label
├── tones/
│   └── ToneEditorDialog.tsx             ❌ 2 strings
└── dictionary/
    └── DictionaryPage.tsx               ✅ 1 string (OK)

Total Issues: 16+ hardcoded English strings
Total Files: 8 components need fixes
```

---

## 9. DETAILED FINDINGS

### All Hardcoded English Strings Found:

| # | File | Line | String | Type |
|---|------|------|--------|------|
| 1 | VirtualizedListPage.tsx | 185 | "It's quiet in here" | Text |
| 2 | VirtualizedListPage.tsx | 188 | "There are no items to display." | Text |
| 3 | OpenRouterModelPicker.tsx | 299 | "Search models..." | Placeholder |
| 4 | ToneEditorDialog.tsx | 213 | "Casual, Formal, Business..." | Placeholder |
| 5 | ToneEditorDialog.tsx | 224 | "Make it sound like a professional but friendly email. Use jargon and fun words." | Placeholder |
| 6 | ApiKeyList.tsx | 235 | "Paste your Azure subscription key" | Placeholder |
| 7 | ApiKeyList.tsx | 250 | "https://my-resource.openai.azure.com" | Placeholder |
| 8 | ApiKeyList.tsx | 262 | "Paste your Azure OpenAI API key" | Placeholder |
| 9 | ApiKeyList.tsx | 276 | OLLAMA_DEFAULT_URL constant | Placeholder |
| 10 | ApiKeyList.tsx | 288 | "Leave empty if not required" | Placeholder |
| 11 | ApiKeyList.tsx | 303 | "Paste your API key" | Placeholder |
| 12 | AIPostProcessingDialog.tsx | 35 | "Close" | Aria-label |
| 13 | AIAgentModeDialog.tsx | 35 | "Close" | Aria-label |
| 14 | AITranscriptionDialog.tsx | 30 | "Close" | Aria-label |
| 15 | HotkeySetting.tsx | 155 | "Disable hotkey" | Aria-label |
| 16 | HotkeySetting.tsx | 174 | "Revert to default hotkey" | Aria-label |

---

## 10. RECOMMENDATIONS

1. **Immediate:** Wrap hardcoded strings in `VirtualizedListPage.tsx` with FormattedMessage
2. **High Priority:** Refactor ApiKeyList and ToneEditorDialog to use i18n
3. **Update i18n files:** Run extraction/sync after code changes
4. **Testing:** Switch app to Korean locale and verify all strings display
5. **Validation:** Check screen readers for aria-label translations

---

## 11. PATH REFERENCES (Full)

All files are relative to: `/Users/jsup/Development Files/vocally/vocally/`

- Locale files: `apps/desktop/src/i18n/locales/{en,ko}.json`
- Components: `apps/desktop/src/components/`
