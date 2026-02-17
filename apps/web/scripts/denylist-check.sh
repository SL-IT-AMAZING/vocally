#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf '%s\n' "[denylist] FAIL: $1" >&2
  exit 1
}

check_no_match() {
  local pattern="$1"
  local path="$2"
  if grep -rqE "$pattern" "$path"; then
    fail "Pattern '$pattern' matched in $path"
  fi
}

check_no_match "@import[[:space:]]+url\(\"https://fonts.googleapis.com/css2\?family=Inter" "src/styles/global.css"

W08_HIT=0
if grep -rqE "0,[[:space:]]*0\.1,[[:space:]]*0\.2,[[:space:]]*0\.3,[[:space:]]*0\.4" src/components/ 2>/dev/null; then
  W08_HIT=1
fi

if [ "$W08_HIT" -eq 0 ]; then
  for file in $(grep -rlE "delay:[[:space:]]*0([[:space:]]*[,}]|\.[0-9])" src/components/ --include="*.tsx" || true); do
    has_00=$(grep -cE "delay:[[:space:]]*0([^0-9.]|$)" "$file" || true)
    has_01=$(grep -cE "delay:[[:space:]]*0\.1([^0-9]|$)" "$file" || true)
    has_02=$(grep -cE "delay:[[:space:]]*0\.2([^0-9]|$)" "$file" || true)
    has_03=$(grep -cE "delay:[[:space:]]*0\.3([^0-9]|$)" "$file" || true)
    has_04=$(grep -cE "delay:[[:space:]]*0\.4([^0-9]|$)" "$file" || true)
    if [ "$has_00" -gt 0 ] && [ "$has_01" -gt 0 ] && [ "$has_02" -gt 0 ] && [ "$has_03" -gt 0 ] && [ "$has_04" -gt 0 ]; then
      W08_HIT=1
      break
    fi
  done
fi

if [ "$W08_HIT" -eq 1 ]; then
  fail "Detected denied five-step delay sequence (0..0.4)."
fi

for file in $(grep -rlE "duration:[[:space:]]*0\.6([^0-9]|$)" src/components/ --include="*.tsx" || true); do
  unique_count=$(grep -rohE "duration:[[:space:]]*[0-9]+(\.[0-9]+)?" "$file" | sort -u | wc -l | tr -d ' ')
  if [ "$unique_count" -lt 2 ]; then
    fail "Single-duration component detected ($file): duration 0.6 used without variation."
  fi
done

echo "[denylist] PASS"
