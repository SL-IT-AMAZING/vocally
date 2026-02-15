# Vocally Hotkey System - Comprehensive Analysis

## Executive Summary

The hotkey system uses **rdev** (a cross-platform keyboard listener library) running in a separate child process. Users report that the Fn key sometimes doesn't work, especially on macOS. The issue stems from how rdev maps keys to key labels and how the matching algorithm normalizes them.

---

## 1. HOW HOTKEYS ARE REGISTERED

### Location: `apps/desktop/src-tauri/src/platform/keyboard.rs`

**Two-Process Architecture:**

1. **Main Tauri Process** - Manages UI and spawns/monitors the keyboard listener
   - File: `start_key_listener()` (line 100-117)
   - Creates TCP socket and spawns external listener process
   - Runs in separate thread listening for connections

2. **External Listener Process** - Runs keyboard event capture
   - File: `run_listener_process()` (line 395-446)  
   - Spawned with environment variables: `VOQUILL_KEYBOARD_LISTENER=1` and `VOQUILL_KEYBOARD_PORT=<port>`
   - Uses `rdev::listen()` to capture all keyboard events globally
   - Serializes events to JSON and sends over TCP

### Entry Point: `main.rs` (lines 35-42)

```rust
if std::env::var("VOQUILL_KEYBOARD_LISTENER").as_deref() == Ok("1") {
    eprintln!("[startup] Running in keyboard listener mode");
    if let Err(err) = desktop_lib::platform::keyboard::run_listener_process() {
        eprintln!("[startup] ERROR: Keyboard listener process failed: {err}");
        std::process::exit(1);
    }
    return;
}
```

### Commands: `apps/desktop/src-tauri/src/commands.rs` (lines 1124-1131)

```rust
#[tauri::command]
pub fn start_key_listener(app: AppHandle) -> Result<(), String> {
    crate::platform::keyboard::start_key_listener(&app)
}

#[tauri::command]
pub fn stop_key_listener() -> Result<(), String> {
    crate::platform::keyboard::stop_key_listener()
}
```

**Key Registration Flow:**
1. App loads hotkeys from SQLite via `loadHotkeys()` 
2. Hotkeys stored in Zustand state: `hotkeyById` map
3. On startup, `RootSideEffects` calls `invoke("start_key_listener")`
4. Keyboard listener process starts and sends key events to main process
5. Events emitted as `EVT_KEYS_HELD` events with list of currently pressed keys
6. React hooks compare pressed keys against configured hotkey combos

---

## 2. HOTKEY CONFIGURATION - USER SETUP

### TypeScript Configuration: `apps/desktop/src/utils/keyboard.utils.ts`

**Default Hotkey Combos:**
```typescript
export const DEFAULT_HOTKEY_COMBOS: Record<string, PlatformHotkeyCombos> = {
  [DICTATE_HOTKEY]: {
    macos: [["Function"]],        // Single Fn key on macOS
    windows: [["MetaLeft", "ControlLeft"]],  // Win+Ctrl
    linux: [["MetaLeft", "ControlLeft"]],    // Super+Ctrl
  },
  [LANGUAGE_SWITCH_HOTKEY]: {
    macos: [["controlLeft", "ShiftLeft", "KeyL"]],
    windows: [["ControlLeft", "ShiftLeft", "KeyL"]],
    linux: [["ControlLeft", "ShiftLeft", "KeyL"]],
  },
};
```

**Hotkey Storage:**
- Stored in SQLite database via `hotkey_queries.rs`
- Schema: `(id, action_name, keys)` where `keys` is JSON array of key names
- Example: `{ "id": "dictate-1", "actionName": "dictate", "keys": ["Function"] }`

### Database Queries: `apps/desktop/src-tauri/src/db/hotkey_queries.rs`

```rust
pub async fn upsert_hotkey(pool: SqlitePool, hotkey: &Hotkey) -> Result<Hotkey, sqlx::Error>
pub async fn fetch_hotkeys(pool: SqlitePool) -> Result<Vec<Hotkey>, sqlx::Error>
pub async fn delete_hotkey(pool: SqlitePool, id: &str) -> Result<(), sqlx::Error>
```

### Repository Layer: `apps/desktop/src/repos/hotkey.repo.ts`

```typescript
export class LocalHotkeyRepo extends BaseHotkeyRepo {
  async listHotkeys(): Promise<Hotkey[]> {
    return invoke<Hotkey[]>("hotkey_list");
  }

  async saveHotkey(hotkey: Hotkey): Promise<Hotkey> {
    return invoke<Hotkey>("hotkey_save", { hotkey });
  }

  async deleteHotkey(id: string): Promise<void> {
    await invoke<void>("hotkey_delete", { id });
  }
}
```

**Display Names:** `keyboard.utils.ts` (lines 8-35)
```typescript
export const getPrettyKeyName = (key: string): string => {
  if (lower.startsWith("function")) {
    return "Fn";  // Function key displays as "Fn"
  }
  // ... other mappings for Ctrl, Alt, Shift, Cmd, etc.
};
```

---

## 3. KEYBOARD LISTENER IMPLEMENTATION

### Location: `apps/desktop/src-tauri/src/platform/keyboard.rs`

**Architecture Diagram:**
```
┌─────────────────────────────────────────────────┐
│  Main Tauri Process                            │
│  ┌─────────────────────────────────────────┐  │
│  │ KeyEventEmitter                         │  │
│  │ - pressed_keys: HashSet<String>         │  │
│  │ - emit EVT_KEYS_HELD events             │  │
│  └─────────────────────────────────────────┘  │
│                    △                           │
│                    │ TCP                       │
│                    │                           │
│           ┌────────▼───────┐                  │
│           │ run_listener_   │                  │
│           │ thread()        │                  │
│           └────────┬────────┘                  │
└────────────────────┼──────────────────────────┘
                     │
                     │ spawns
                     △
┌─────────────────────────────────────────────────┐
│  Child Process (run_listener_process)           │
│  rdev::listen() → KeyboardEventPayload (JSON)  │
│  Sends over TCP: Press/Release events           │
└─────────────────────────────────────────────────┘
```

### Key Event Flow:

1. **Event Capture** (`run_listener_process()`, line 409)
   ```rust
   let result = rdev::listen({
       let writer = writer.clone();
       move |event| {
           let payload = match event.event_type {
               EventType::KeyPress(key) => Some(KeyboardEventPayload {
                   kind: WireEventKind::Press,
                   key_label: key_to_label(key),
                   raw_code: key_raw_code(key),
                   scan_code: event.position_code,  // Important for Windows!
               }),
               EventType::KeyRelease(key) => Some(...),
               _ => None,
           };
           // Send as JSON over TCP
       }
   });
   ```

2. **Key Label Conversion** (`key_to_label()`, line 381-386)
   ```rust
   fn key_to_label(key: RdevKey) -> String {
       match key {
           RdevKey::Unknown(code) => format!("Unknown({code})"),
           _ => format!("{key:?}"),  // Debug format of enum variant
       }
   }
   ```

3. **Event Transmission**
   - Serializes to JSON and writes over TCP to main process
   - Main process reads line-by-line in `pump_stream()`

4. **Event Reception** (`pump_stream()`, line 295-333)
   - Receives JSON, deserializes to `KeyboardEventPayload`
   - **Windows-specific filter** (line 313-322): Ignores events with `scan_code == 0` (injected events)
   - Converts payload back to Event and calls `emitter.handle_event()`

5. **Key State Tracking** (`update_pressed_keys()`, line 47-66)
   ```rust
   fn update_pressed_keys(&self, key: RdevKey, is_pressed: bool) {
       let key_label = key_to_label(key);
       let mut guard = self.pressed_keys.lock().unwrap();
       
       let changed = if is_pressed {
           guard.insert(key_label.clone())
       } else {
           guard.remove(&key_label)
       };
       
       if changed {
           let mut snapshot: Vec<String> = guard.iter().cloned().collect();
           snapshot.sort_unstable();
           drop(guard);
           self.emit(keys_payload(snapshot));  // Send keys_held event
       }
   }
   ```

6. **Frontend Updates** - Emits `EVT_KEYS_HELD` event with `KeysHeldPayload { keys: Vec<String> }`

### Key Label Mapping:

The `key_to_label()` function uses Rust's Debug formatter on the rdev `Key` enum:

```rust
pub enum Key {
    AltGr,
    Backspace,
    CapsLock,
    Delete,
    DownArrow,
    End,
    Escape,
    F1, F2, ... F24,
    Function,        // <-- THE FN KEY!
    Home,
    LeftAlt,
    LeftControl,
    LeftMeta,
    LeftShift,
    PageDown,
    PageUp,
    RightAlt,
    RightControl,
    RightMeta,
    RightShift,
    Return,
    Space,
    Tab,
    UpArrow,
    Unknown(u32),
    // ... plus KeyLayout variants
}
```

**For Fn key**, rdev returns: `Key::Function` → Debug format → `"Function"`

---

## 4. FN KEY HANDLING - THE PROBLEM AREA

### Where Fn Key is Used:

**MacOS Default:**
```typescript
// apps/desktop/src/utils/keyboard.utils.ts line 45
[DICTATE_HOTKEY]: {
  macos: [["Function"]],  // Single Fn press activates dictation
}
```

### Key Label Processing:

**In Rust** (`keyboard.rs`):
- rdev maps Fn key to `Key::Function`
- Debug format produces string `"Function"`
- Sent as JSON: `{ "kind": "Press", "key_label": "Function", ... }`

**In TypeScript** (`hotkey.hooks.ts`, line 39-47):
```typescript
const normalize = (key: string) => key.toLowerCase();

const matchesCombo = (held: string[], combo: string[]) => {
    const uniqueHeld = Array.from(new Set(held.map((key) => normalize(key))));
    const required = Array.from(new Set(combo.map((key) => normalize(key))));
    
    if (uniqueHeld.length !== required.length) {
        return false;
    }
    
    const heldSet = new Set(uniqueHeld);
    return required.every((key) => heldSet.has(key));
};
```

### Known Issues with Fn Key:

1. **Case Sensitivity Handling:**
   - Config stored as `"Function"` (uppercase F)
   - Normalized to `"function"` (lowercase)
   - Comparison should work fine... BUT

2. **rdev Platform-Specific Behavior:**
   - On macOS, Fn key sometimes reported as `Unknown(<code>)` instead of `Function`
   - On some keyboard layouts, Fn might be mapped to different key codes
   - Some keyboards have Fn on the left, others on the right

3. **Debug Format Inconsistency:**
   - rdev enum variants have inconsistent Debug names
   - Example: `LeftControl` vs `controlLeft` in config
   - The `keyboard.utils.ts` has hardcoded mapping for pretty names but matching uses raw rdev output

### Pretty Key Names vs Raw Labels:

**Mismatch in keyboard.utils.ts:**
```typescript
export const getPrettyKeyName = (key: string): string => {
  const lower = key.toLowerCase();
  
  if (lower.startsWith("key")) {
    return key.slice(3).toUpperCase();  // "KeyA" -> "A"
  }
  if (lower.startsWith("function")) {
    return "Fn";  // Display as "Fn" in UI
  }
  // ... but doesn't handle all rdev enum variants!
};
```

The problem: `keyboard.utils.ts` uses pretty names for UI display but the matching in `hotkey.hooks.ts` line 39 compares against:
- Stored config: Could be `"Function"`, `"function"`, `"Fn"` (inconsistent!)
- Received keys: Always from rdev Debug format: `"Function"`, `"LeftControl"`, etc.

**Example Bug Scenario:**
1. User selects "Fn" key in UI → Stored as `"Fn"` in database
2. rdev sends `"Function"` (Debug format)
3. Normalization: `"Fn"` ≠ `"Function"` (case insensitive match fails if stored differently)

---

## 5. KNOWN ISSUES & WORKAROUNDS

### Issue #1: Fn Key Not Recognized

**Root Cause:**
- User might have set hotkey as `"Fn"` (pretty name) instead of `"Function"` (rdev name)
- rdev sometimes reports Fn as `Unknown(<code>)` on certain macOS/keyboard combinations

**Debugging:**
Set environment variable to see all key events:
```bash
VOQUILL_DEBUG_KEYS=1 /path/to/Vocally.app/Contents/MacOS/Vocally
```

This prints:
```
[keys] event: KeyPress(Function)
[keys] event: KeyRelease(Function)
```

**Workaround:**
1. Open Settings → Shortcuts → Reset to Default for Dictate
2. System should re-save with correct `"Function"` label
3. If still broken, manually edit database:
   ```sql
   UPDATE hotkeys SET keys = '["Function"]' WHERE action_name = 'dictate';
   ```

### Issue #2: Injected Input Events on Windows

**Problem:** When Vocally pastes text, the synthetic key events can trigger the hotkey again

**Solution** (line 313-322):
```rust
#[cfg(target_os = "windows")]
if payload.scan_code == 0 {  // scan_code == 0 indicates injected event
    if debug_keys_enabled() {
        eprintln!("[keys] Ignoring injected event (scan_code=0): {:?} {}", 
                  payload.kind, payload.key_label);
    }
    continue;  // Skip injected events
}
```

**Note:** Not implemented on macOS/Linux - may need to add similar protection

### Issue #3: X11 Threading on Linux

**Critical for stability** (`main.rs` line 14-17):
```rust
#[cfg(target_os = "linux")]
fn init_x11_threads() {
    unsafe {
        x11::xlib::XInitThreads();  // MUST be called before X11 operations
    }
}
```

**Problem:** Without this, concurrent X11 access from Tauri/GTK, rdev, and CPAL causes crashes

### Issue #4: Accessibility Permissions on macOS

**For keyboard listening to work on macOS:**
- App must have "Input Monitoring" permission (under Privacy & Security)
- Also needs "Accessibility" permission
- See: `apps/desktop/src-tauri/src/platform/macos/permissions.rs`

**Current Status:**
- `check_accessibility_permission()` (line 200-210)
- `request_accessibility_permission()` (line 219-270)
- Opens System Settings privacy pane if needed

**IMPORTANT:** Fn key listening specifically may require Input Monitoring permission in addition to Accessibility

---

## 6. PLATFORM-SPECIFIC KEYBOARD HANDLING

### macOS: `apps/desktop/src-tauri/src/platform/macos/input.rs`

Used for **pasting text** (not hotkey listening):
```rust
fn simulate_cmd_v() -> Result<(), String> {
    let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState)?;
    
    let key_down = CGEvent::new_keyboard_event(source.clone(), KEY_V, true)?;
    key_down.set_flags(CGEventFlags::CGEventFlagCommand);
    key_down.post(CGEventTapLocation::HID);
    
    thread::sleep(Duration::from_millis(10));
    
    let key_up = CGEvent::new_keyboard_event(source, KEY_V, false)?;
    key_up.set_flags(CGEventFlags::CGEventFlagCommand);
    key_up.post(CGEventTapLocation::HID);
    
    Ok(())
}
```

**Note:** This is separate from hotkey listening (which uses rdev)

### Windows: `apps/desktop/src-tauri/src/platform/windows/input.rs`

Used for pasting text and modifier key management:
```rust
fn release_modifier_keys() {
    let modifiers = [
        VK_SHIFT, VK_CONTROL, VK_MENU,  // Left/right variants
        VK_LSHIFT, VK_RSHIFT, VK_LCONTROL, VK_RCONTROL, 
        VK_LMENU, VK_RMENU, VK_LWIN, VK_RWIN,
    ];
    
    for vk in modifiers {
        if is_key_pressed(vk) {
            send_key_up(vk);  // Release stuck modifiers
        }
    }
}
```

**Note:** Releases stuck modifier keys before pasting to avoid interference

### Linux: `apps/desktop/src-tauri/src/platform/linux/input.rs`

Uses `enigo` crate for keyboard input:
```rust
fn paste_via_clipboard(text: &str, keybind: Option<&str>) -> Result<(), String> {
    let mut enigo = Enigo::new();
    enigo.key_up(Key::Shift);
    enigo.key_up(Key::Control);
    enigo.key_up(Key::Alt);
    thread::sleep(Duration::from_millis(30));
    
    enigo.key_down(Key::Control);
    enigo.key_down(Key::Layout('v'));
    thread::sleep(Duration::from_millis(15));
    enigo.key_up(Key::Layout('v'));
    enigo.key_up(Key::Control);
}
```

**Note:** Also releases stuck modifiers

---

## 7. HOTKEY MATCHING FLOW

### Frontend Hook: `apps/desktop/src/hooks/hotkey.hooks.ts`

**Two Hook Types:**

1. **useHotkeyHold()** - For press-and-hold actions (dictation)
   ```typescript
   useEffect(() => {
       if (availableCombos.length === 0) {
           wasPressedRef.current = false;
           controller.reset();
           return;
       }
       
       const isPressed = availableCombos.some((combo) =>
           matchesCombo(keysHeld, combo),
       );
       const wasPressed = wasPressedRef.current;
       
       if (isPressed && !wasPressed) {
           controller.handlePress();  // Start recording
       } else if (!isPressed && wasPressed) {
           controller.handleRelease();  // Stop recording
       }
       
       wasPressedRef.current = isPressed;
   }, [keysHeld, availableCombos, controller]);
   ```

2. **useHotkeyFire()** - For single-press actions (language switch)
   ```typescript
   useEffect(() => {
       const wasComboPressed = availableCombos.some((combo) => {
           // Check if combo transitioned from not-pressed to pressed
           const allKeysNowHeld = normalizedCombo.every((key) =>
               normalizedKeysHeld.includes(key),
           );
           const notAllKeysPreviouslyHeld = !normalizedCombo.every((key) =>
               normalizedPreviousKeysHeld.includes(key),
           );
           return allKeysNowHeld && notAllKeysPreviouslyHeld;
       });
       
       if (wasComboPressed) {
           args.onFire?.();
       }
   }, [keysHeld, availableCombos, args]);
   ```

### Integration: `apps/desktop/src/components/root/RootSideEffects.ts`

```typescript
// Listen for keys held event from Rust
useTauriListen<KeysHeldPayload>("keys_held", (event) => {
    produceAppState((draft) => {
        draft.keysHeld = event.payload.keys;
    });
});

// Dictation hotkey (hold)
const dictationController = useMemo(
    () => getOrCreateController("dictation", ...),
    [],
);
useHotkeyHold({
    actionName: DICTATE_HOTKEY,
    controller: dictationController,
});

// Language switch (fire)
useHotkeyFire({
    actionName: LANGUAGE_SWITCH_HOTKEY,
    onFire: () => {
        // Toggle language
    },
});
```

---

## 8. DEBUGGING THE Fn KEY ISSUE

### Step 1: Enable Debug Logging

On macOS, run from terminal with debug env var:
```bash
VOQUILL_DEBUG_KEYS=1 open -a Vocally
```

Watch console output for:
```
[keys] event: KeyPress(Function)
[keys] event: KeyRelease(Function)
```

If you DON'T see `Function`, try:
```
[keys] event: KeyPress(Unknown(63))  # Fn key as unknown code
```

### Step 2: Check Stored Configuration

Query the database:
```bash
# macOS/Linux
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "SELECT id, action_name, keys FROM hotkeys WHERE action_name='dictate';"

# Windows
sqlite3 %APPDATA%\Vocally\Vocally.db \
  "SELECT id, action_name, keys FROM hotkeys WHERE action_name='dictate';"
```

Expected output:
```
dictate-macos|dictate|["Function"]
```

If you see `["Fn"]` or `["function"]` - that's the problem!

### Step 3: Fix the Configuration

Reset hotkeys to default:
1. In app: Settings → Reset Hotkeys
2. Or via SQL:
   ```bash
   UPDATE hotkeys SET keys = '["Function"]' 
   WHERE action_name = 'dictate' AND id LIKE '%macos%';
   ```
3. Restart app

### Step 4: Check Permissions

**macOS only:**
```bash
# Check if app has accessibility permission
sqlite3 /var/db/TCC/TCC.db \
  "SELECT client, service, allowed FROM access WHERE service='kTCCServiceAccessibility' AND client LIKE '%vocally%';"

# Should show: allowed=1

# Also check Input Monitoring
sqlite3 /var/db/TCC/TCC.db \
  "SELECT client, service, allowed FROM access WHERE service='kTCCServiceInputMonitoring';"
```

If missing:
1. System Settings → Privacy & Security → Input Monitoring
2. Add Vocally to the list
3. Restart app

---

## 9. KEY FINDINGS & RECOMMENDATIONS

### What Works Well:
✅ Two-process architecture isolates keyboard listener from UI  
✅ TCP-based IPC is robust  
✅ Event normalization (case-insensitive matching) is sound  
✅ Windows injected event filtering prevents re-triggering  
✅ Default configs are sensible  

### What Needs Attention:

🔴 **HIGH PRIORITY:**
1. **Fn key name inconsistency** - Store/compare using rdev Debug format consistently
   - Use `"Function"` everywhere, not `"Fn"` or `"function"`
   - Update `getPrettyKeyName()` and database defaults

2. **Missing macOS Input Monitoring permission**
   - Fn key listening may silently fail without it
   - App should check and request this permission
   - Add to `permissions.rs` with clear user messaging

3. **No scan_code filtering on macOS/Linux**
   - Windows has protection against injected events
   - Paste operations could re-trigger recording on Mac/Linux
   - Consider adding platform-agnostic filtering

🟡 **MEDIUM PRIORITY:**
1. Key label mapping should be centralized
   - Have single source of truth for key name conversions
   - Map rdev Debug format → pretty names → storage format
   - Prevent case/naming inconsistencies

2. Better user feedback when hotkeys fail
   - Show "Fn key not working?" prompt
   - Link to troubleshooting guide
   - Auto-suggest resetting to defaults

3. Hotkey validation on save
   - Prevent storing invalid key combinations
   - Warn if combo conflicts with system shortcuts
   - Test on all platforms before accepting

### Code Quality Issues:

⚠️ **Technical Debt:**
1. `key_from_payload()` function (line 357-374) uses brute-force iteration
   - Should use HashMap for O(1) lookup
   - Slow to iterate all 100+ rdev Key variants

2. String-based key representation fragile
   - Switch to typed Key enum instead of String vec
   - Would prevent case/naming bugs

3. Missing integration tests
   - Hotkey matching logic should have unit tests
   - Platform-specific tests for each OS

---

## 10. FILE LOCATIONS REFERENCE

| Component | Location |
|-----------|----------|
| Keyboard Listener (Rust) | `apps/desktop/src-tauri/src/platform/keyboard.rs` |
| Main Entry Point | `apps/desktop/src-tauri/src/main.rs` |
| Commands Bridge | `apps/desktop/src-tauri/src/commands.rs` (lines 1124-1131) |
| Domain Models | `apps/desktop/src-tauri/src/domain/hotkey.rs` and `keyboard.rs` |
| Database Queries | `apps/desktop/src-tauri/src/db/hotkey_queries.rs` |
| Repository Layer | `apps/desktop/src/repos/hotkey.repo.ts` |
| Frontend Utilities | `apps/desktop/src/utils/keyboard.utils.ts` |
| Hotkey Hooks | `apps/desktop/src/hooks/hotkey.hooks.ts` |
| Side Effects | `apps/desktop/src/components/root/RootSideEffects.ts` |
| macOS Input | `apps/desktop/src-tauri/src/platform/macos/input.rs` |
| Windows Input | `apps/desktop/src-tauri/src/platform/windows/input.rs` |
| Linux Input | `apps/desktop/src-tauri/src/platform/linux/input.rs` |
| macOS Accessibility | `apps/desktop/src-tauri/src/platform/macos/accessibility.rs` |
| macOS Permissions | `apps/desktop/src-tauri/src/platform/macos/permissions.rs` |

---

## Summary

The Vocally hotkey system is well-architected overall, but has a critical issue with **Fn key name consistency**. The system stores hotkey key names as strings from rdev's Debug formatter (e.g., `"Function"`), but the UI displays them as pretty names (e.g., `"Fn"`), and users can sometimes save the wrong format. Combined with potential macOS permissions issues and missing Input Monitoring permission checks, users on macOS may experience silent failures when trying to use the Fn key for voice activation.

**Quick Fix:** Ensure all Fn key configs are stored as `"Function"` (rdev format) and add explicit macOS Input Monitoring permission check before starting keyboard listener.

