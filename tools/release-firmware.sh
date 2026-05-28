#!/usr/bin/env bash
# =====================================================================
#  release-firmware.sh
#
#  Stage a new firmware release into axis-companion/public/firmware/.
#  After running, git-commit + push and GitHub Pages re-deploys; the
#  PWA's OTA → Releases tab will pick it up.
#
#  Usage:
#    tools/release-firmware.sh <version> <bin-path> [notes]
#
#  Example:
#    tools/release-firmware.sh v0.3.0 \
#      "/Users/me/Desktop/SN Motorsports/AXIS/smart_knob_shifter/build/smart_knob_shifter.ino.bin" \
#      "P5: brand panel + screensaver upload"
# =====================================================================
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <version> <bin-path> [notes]" >&2
  echo "       version must look like vX.Y.Z" >&2
  exit 1
fi

VERSION="$1"
BIN_SRC="$2"
NOTES="${3:-}"

# Resolve repo root from this script's location.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FW_DIR="$ROOT/public/firmware"
MANIFEST="$FW_DIR/index.json"

[ -f "$BIN_SRC" ] || { echo "bin not found: $BIN_SRC" >&2; exit 1; }
[ -f "$MANIFEST" ] || { echo "manifest missing: $MANIFEST" >&2; exit 1; }

# Sanity-check the version tag — must start with v and be safe for URLs.
if ! [[ "$VERSION" =~ ^v[0-9A-Za-z._-]+$ ]]; then
  echo "version must start with 'v' and only contain letters/digits/._-" >&2
  exit 1
fi

# Copy the binary in.
BIN_NAME="smart_knob_shifter-${VERSION}.bin"
BIN_DST="$FW_DIR/$BIN_NAME"
cp "$BIN_SRC" "$BIN_DST"
SIZE=$(stat -f%z "$BIN_DST" 2>/dev/null || stat -c%s "$BIN_DST")
DATE=$(date +%Y-%m-%d)

echo "Staged $BIN_DST ($SIZE bytes)"

# Prepend a new entry to the manifest's releases array. Uses node since we
# already require it for the PWA build — keeps the script dependency-free
# beyond that.
node - "$VERSION" "$DATE" "$NOTES" "$BIN_NAME" "$SIZE" "$MANIFEST" <<'NODE'
const fs = require('fs');
const [,, version, date, notes, file, sizeStr, path] = process.argv;
const m = JSON.parse(fs.readFileSync(path, 'utf8'));
m.releases = m.releases || [];
// Replace existing entry for this version (if any), then prepend.
m.releases = m.releases.filter(r => r.version !== version);
m.releases.unshift({
  version,
  date,
  notes,
  url:        `firmware/${file}`,
  size_bytes: Number(sizeStr)
});
fs.writeFileSync(path, JSON.stringify(m, null, 2) + '\n');
console.log(`Manifest updated: ${path}`);
NODE

echo
echo "Next steps:"
echo "  cd '$ROOT'"
echo "  git add public/firmware/$BIN_NAME public/firmware/index.json"
echo "  git commit -m 'firmware: release $VERSION'"
echo "  git push"
echo
echo "GitHub Pages will auto-redeploy; the PWA's OTA tab picks up the new"
echo "release within a minute."
