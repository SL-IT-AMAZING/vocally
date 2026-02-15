# Hotkey Troubleshooting Guide

Quick reference for fixing hotkey issues, especially the Fn key on macOS.

## Problem: Fn Key Not Working on macOS

### Quick Diagnosis

Run this command in Terminal to see what the keyboard listener receives:

```bash
VOQUILL_DEBUG_KEYS=1 /Applications/Vocally.app/Contents/MacOS/Vocally 2>&1 | grep "\[keys\]"
```

Press the Fn key. You should see:
```
[keys] event: KeyPress(Function)
[keys] event: KeyRelease(Function)
```

**If you see nothing or see `Unknown(63)` instead:** The key is being mapped differently on your keyboard.

### Checklist

- [ ] **Step 1:** Restart Vocally completely (quit + reopen)
- [ ] **Step 2:** Check Settings → Shortcuts → make sure "Dictate" hotkey is set
- [ ] **Step 3:** Check macOS permissions:
  - System Settings → Privacy & Security → **Accessibility** → Vocally (should be checked)
  - System Settings → Privacy & Security → **Input Monitoring** → Vocally (should be present)
- [ ] **Step 4:** Try resetting hotkeys to default (Settings → Reset Hotkeys)
- [ ] **Step 5:** Restart computer completely (not just app)

### If Debug Shows Unknown(63)

Your keyboard maps Fn to a different code. Use this workaround:

1. Edit the database:
   ```bash
   sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db
   ```

2. Check what's stored:
   ```sql
   SELECT id, action_name, keys FROM hotkeys WHERE action_name='dictate';
   ```

3. If it shows `["Unknown(63)"]`, that's correct! The issue is your keyboard mapping.

4. Try adding support for this key code. Contact support with the unknown code number.

### If Permissions Are Missing

You need to explicitly grant permissions:

1. **Accessibility Permission:**
   - System Settings → Privacy & Security → Accessibility
   - Click the lock to unlock
   - Click "+" and add Vocally.app
   - Lock again and restart Vocally

2. **Input Monitoring Permission:**
   - System Settings → Privacy & Security → Input Monitoring  
   - Click the lock to unlock
   - Click "+" and add Vocally.app
   - Lock again and restart Vocally

**This is required for Fn key listening to work!**

---

## Problem: Hotkey Fires Randomly / Re-triggers While Pasting

### Cause

The synthetic keyboard events generated when pasting text are triggering the hotkey again.

### Solution

**Windows:** Already fixed (scans for `scan_code == 0` to detect injected events)

**macOS/Linux:** Workaround is to change your hotkey combination to something more complex:
- Instead of: `Fn` alone
- Try: `Fn + Shift` or `Fn + Control`

Or use a different hotkey entirely:
- Settings → Shortcuts → Edit "Dictate" hotkey
- Choose a multi-key combination less likely to be triggered by pastes

---

## Problem: Changes to Hotkeys Not Taking Effect

### Solution

1. Open Settings → Shortcuts
2. Edit your hotkey
3. **Save the hotkey** (make sure you see a confirmation)
4. **Completely quit and reopen Vocally** (don't just close the window)
5. Test the new hotkey

If this doesn't work:

```bash
# Reset all hotkeys to defaults
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "DELETE FROM hotkeys; DELETE FROM sqlite_sequence WHERE name='hotkeys';"

# Restart Vocally
```

Then go to Settings → Reset Hotkeys and reconfigure.

---

## Problem: Multiple Hotkeys Configured, Only Some Work

### Common Cause

You may have multiple hotkey entries for the same action. The system loads them all and tries to match any of them.

### Debug This

```bash
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "SELECT id, action_name, keys FROM hotkeys ORDER BY action_name;"
```

You should see:
```
dictate-1|dictate|["Function"]
language-switch-1|language-switch|["ControlLeft","ShiftLeft","KeyL"]
```

If you see duplicates with the same `action_name`, that's the problem:
```
dictate-1|dictate|["Function"]
dictate-2|dictate|["Fn"]         <-- DUPLICATE!
```

### Fix Duplicates

Delete the conflicting entries:
```bash
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db
DELETE FROM hotkeys WHERE id='dictate-2';
```

Then restart Vocally.

---

## Key Label Reference

When editing hotkeys or looking at debug logs, these are the key labels that will appear:

### macOS Defaults
- `Function` - Fn key (the physical Fn key on Apple keyboards)
- `LeftCommand` - Left Command key (⌘)
- `RightCommand` - Right Command key
- `LeftControl` - Left Control key (⌃)
- `RightControl` - Right Control key  
- `LeftShift` - Left Shift key (⇧)
- `RightShift` - Right Shift key
- `LeftOption` - Left Option/Alt key (⌥)
- `RightOption` - Right Option/Alt key

### Windows/Linux Defaults
- `MetaLeft` - Left Super/Windows key (⊞)
- `MetaRight` - Right Super/Windows key
- `ControlLeft` - Left Control key (Ctrl)
- `ControlRight` - Right Control key
- `ShiftLeft` - Left Shift key
- `ShiftRight` - Right Shift key
- `AltLeft` - Left Alt key
- `AltRight` - Right Alt key

### Other Common Keys
- `KeyA` - Letter A (same for B-Z)
- `Digit1` - Number 1 (same for 0-9)
- `Return` - Enter key
- `Space` - Spacebar
- `Tab` - Tab key
- `Escape` - Escape key
- `Backspace` - Backspace
- `Delete` - Delete key
- `Home` - Home key
- `End` - End key
- `PageUp` - Page Up
- `PageDown` - Page Down
- `UpArrow` - Up arrow key
- `DownArrow` - Down arrow key
- `LeftArrow` - Left arrow key
- `RightArrow` - Right arrow key

---

## Emergency Reset

If hotkeys are completely broken:

```bash
# Back up your database first
cp ~/Library/Application\ Support/com.vocally.app/Vocally.db \
   ~/Library/Application\ Support/com.vocally.app/Vocally.db.backup

# Clear hotkeys table
sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
  "DELETE FROM hotkeys; DELETE FROM sqlite_sequence WHERE name='hotkeys';"

# Restart Vocally - it will recreate defaults
```

Then go to Settings → Reset Hotkeys and reconfigure your preferences.

---

## Still Broken? Debug Mode

To see detailed keyboard listener logs:

**macOS/Linux:**
```bash
VOQUILL_DEBUG_KEYS=1 open -a Vocally
```

**Windows (PowerShell):**
```powershell
$env:VOQUILL_DEBUG_KEYS = "1"
& "C:\Program Files\Vocally\Vocally.exe"
```

Watch for messages like:
```
[keys] event: KeyPress(Function)
[keys] event: KeyRelease(Function)
Keyboard listener thread join failed: ...
Failed to bind keyboard listener socket: ...
```

The error messages will tell you exactly what's wrong.

---

## Still Need Help?

Provide this information when reporting an issue:

1. Output from `VOQUILL_DEBUG_KEYS=1` showing what keys are being received
2. Contents of your hotkey database:
   ```bash
   sqlite3 ~/Library/Application\ Support/com.vocally.app/Vocally.db \
     "SELECT * FROM hotkeys;"
   ```
3. Your macOS version (if on Mac): `System Settings → General → About`
4. Whether you just upgraded Vocally or if this is a fresh install
5. Whether it worked before - if so, when did it break?

