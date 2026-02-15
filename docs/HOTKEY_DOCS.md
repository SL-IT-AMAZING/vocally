# Hotkey System Documentation Index

Complete documentation for the Vocally hotkey system, including architecture, troubleshooting, and debugging guides.

## 📚 Documents

### 1. [hotkey-system-analysis.md](./hotkey-system-analysis.md)
**For:** Developers, architects, code reviewers

Complete technical analysis of how the hotkey system works:
- How hotkeys are registered (two-process architecture with rdev)
- User configuration and database schema
- Keyboard listener implementation details
- Fn key handling and known issues
- Platform-specific code (macOS/Windows/Linux)
- Hotkey matching algorithm in React
- Step-by-step debugging procedures
- High and medium priority fixes
- Code snippets and file references

**Length:** 725 lines | **Sections:** 10

### 2. [hotkey-troubleshooting.md](./hotkey-troubleshooting.md)
**For:** Support team, end users, on-call engineers

Quick reference guide for fixing hotkey issues:
- Fn key not working (diagnostic checklist)
- macOS permission setup (Accessibility + Input Monitoring)
- Hotkey re-triggering while pasting
- Changes to hotkeys not taking effect
- Multiple hotkey configuration conflicts
- Complete key label reference table
- Emergency reset procedures
- Debug mode instructions
- What to include in bug reports

**Length:** 257 lines | **Sections:** 10

### 3. [hotkey-architecture.txt](./hotkey-architecture.txt)
**For:** Quick reference, on-call debugging, architecture reviews

Visual ASCII diagrams and flowcharts:
- Complete data flow (keyboard → Tauri → React)
- Six-step event processing pipeline
- Key configuration flow (UI → Database → Matching)
- Permission requirements by OS
- Five critical gotchas and how they work
- String normalization edge cases

**Length:** 241 lines | **Diagrams:** 5

---

## 🎯 Quick Start

### I need to...

**Fix a user's Fn key issue**
→ Read: [hotkey-troubleshooting.md](./hotkey-troubleshooting.md) "Problem: Fn Key Not Working"

**Understand the system architecture**
→ Read: [hotkey-architecture.txt](./hotkey-architecture.txt)

**Debug hotkey matching logic**
→ Read: [hotkey-system-analysis.md](./hotkey-system-analysis.md) "Section 7: Hotkey Matching Flow"

**Check if there are known issues**
→ Read: [hotkey-system-analysis.md](./hotkey-system-analysis.md) "Section 5: Known Issues & Workarounds"

**Add a new hotkey feature**
→ Read: [hotkey-system-analysis.md](./hotkey-system-analysis.md) entire document, then sections 9-10

**Enable debug logging**
→ Run: `VOQUILL_DEBUG_KEYS=1 /Applications/Vocally.app/Contents/MacOS/Vocally`

---

## 🔑 Key Findings

### Root Cause of Fn Key Issues
1. **Inconsistent key naming** - "Function" (rdev) vs "Fn" (UI) vs "function" (case)
2. **Missing macOS permissions** - Input Monitoring permission not checked
3. **Platform-specific mapping** - rdev sometimes reports as Unknown(63)
4. **Database validation** - No validation when saving hotkey names

### What Works Well ✅
- Two-process architecture (isolated, robust)
- TCP-based event streaming (reliable)
- Windows injected event filtering (prevents re-triggering)
- Case-insensitive key matching logic
- Default hotkey combinations

### Critical Gaps ⚠️
- No Input Monitoring permission check on macOS (HIGH)
- Fn key name inconsistency in database (HIGH)
- No scan_code filtering on macOS/Linux (MEDIUM)
- Brute-force key lookup instead of HashMap (MEDIUM)

---

## 📋 File Map

| Component | File | Lines |
|-----------|------|-------|
| Keyboard Listener (Rust) | `src-tauri/src/platform/keyboard.rs` | 447 |
| Main Entry Point | `src-tauri/src/main.rs` | 92 |
| Tauri Commands | `src-tauri/src/commands.rs` | ~50 |
| Domain Models | `src-tauri/src/domain/{hotkey,keyboard}.rs` | 19 |
| Database Layer | `src-tauri/src/db/hotkey_queries.rs` | 60 |
| Frontend Utils | `src/utils/keyboard.utils.ts` | 90 |
| Hotkey Hooks | `src/hooks/hotkey.hooks.ts` | 129 |
| Side Effects | `src/components/root/RootSideEffects.ts` | ~200 |
| Repository | `src/repos/hotkey.repo.ts` | 24 |

---

## 🚀 Implementation Roadmap

### Short Term (1-2 weeks)
- [ ] Add macOS Input Monitoring permission check
- [ ] Validate hotkey names on save (must be rdev format)
- [ ] Create user-facing troubleshooting guide

### Medium Term (1-2 months)
- [ ] Add scan_code filtering on macOS/Linux
- [ ] Replace string-based keys with typed Key enum
- [ ] Centralize key label mapping

### Long Term (3+ months)
- [ ] Performance: Use HashMap for key lookup
- [ ] UX: In-app troubleshooting for Fn key
- [ ] Safety: Hotkey conflict detection
- [ ] Testing: Integration tests for matching logic

---

## 🔧 Common Operations

### Check Current Hotkeys
```bash
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "SELECT id, action_name, keys FROM hotkeys;"
```

### Fix Fn Key (macOS)
```bash
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "UPDATE hotkeys SET keys = '[\"Function\"]' WHERE action_name='dictate';"
```

### Enable Debug Logging
```bash
VOQUILL_DEBUG_KEYS=1 /Applications/Vocally.app/Contents/MacOS/Vocally
```

### Clear All Hotkeys
```bash
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "DELETE FROM hotkeys; DELETE FROM sqlite_sequence WHERE name='hotkeys';"
```

---

## 📍 Default Hotkey Configuration

**macOS:**
```typescript
dictate: ["Function"]  // Single Fn key
language-switch: ["ControlLeft", "ShiftLeft", "KeyL"]
```

**Windows/Linux:**
```typescript
dictate: ["MetaLeft", "ControlLeft"]  // Super/Windows + Ctrl
language-switch: ["ControlLeft", "ShiftLeft", "KeyL"]
```

---

## 🐛 Known Issues & Workarounds

| Issue | Cause | Workaround | Reference |
|-------|-------|-----------|-----------|
| Fn key not recognized | Missing permission or mapping | Grant Input Monitoring + restart | hotkey-troubleshooting.md |
| Hotkey re-triggers while typing | Injected events not filtered | Use multi-key combo (Fn+Shift) | hotkey-troubleshooting.md |
| Changes don't take effect | Cache not refreshed | Restart app completely | hotkey-troubleshooting.md |
| Multiple hotkeys conflict | Duplicate DB entries | Check and remove duplicates | hotkey-troubleshooting.md |

---

## 📞 Support Resources

**For end users:**
- See [hotkey-troubleshooting.md](./hotkey-troubleshooting.md)
- Run: `VOQUILL_DEBUG_KEYS=1`
- Check: System Settings → Privacy & Security

**For developers:**
- Start: [hotkey-system-analysis.md](./hotkey-system-analysis.md)
- Visualize: [hotkey-architecture.txt](./hotkey-architecture.txt)
- Code locations: [hotkey-system-analysis.md](./hotkey-system-analysis.md) Section 10

**For on-call engineers:**
- Quick ref: [hotkey-architecture.txt](./hotkey-architecture.txt)
- Checklist: [hotkey-troubleshooting.md](./hotkey-troubleshooting.md)
- Debug: Database queries above

---

## 📊 Statistics

- **Total documentation:** 1,223 lines
- **Files analyzed:** 19 (11 Rust, 8 TypeScript)
- **Code snippets:** 50+
- **ASCII diagrams:** 5
- **Quick references:** 3
- **Known issues:** 5
- **Priority fixes:** 8 (3 HIGH, 5 MEDIUM)

---

## ✅ Checklist for New Team Members

- [ ] Read hotkey-architecture.txt for visual overview
- [ ] Read hotkey-system-analysis.md sections 1-4 for basics
- [ ] Understand keyboard listener entry points (keyboard.rs:100, :395)
- [ ] Know default hotkey configuration for your platform
- [ ] Bookmark database location for your OS
- [ ] Know how to enable debug mode: `VOQUILL_DEBUG_KEYS=1`
- [ ] Save hotkey-troubleshooting.md for user support
- [ ] Review "Known Gotchas" section before modifying code

---

## 🔗 Related Documentation

- `docs/desktop-architecture.md` - Overall desktop app architecture
- `README.md` - Project overview
- `AGENTS.md` - Contribution guidelines

---

**Last Updated:** February 15, 2024
**Scope:** Vocally hotkey system (cross-platform: macOS, Windows, Linux)
**Status:** Complete & Ready for Use

