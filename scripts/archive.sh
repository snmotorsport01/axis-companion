#!/usr/bin/env bash
# =====================================================================
#  archive.sh — one-shot iOS build + archive + IPA export for TestFlight.
#
#  Why this exists: doing this by hand in Xcode means clicking through
#  Product → Archive → Organizer → Distribute App → App Store Connect →
#  Upload every release. This script collapses that into:
#
#      ./scripts/archive.sh            # build + export (no upload)
#      ./scripts/archive.sh upload     # also upload to App Store Connect
#
#  Requirements:
#    • Xcode 15+ installed (xcodebuild + xcrun on PATH)
#    • Apple ID with App Store Connect access (see APPLE_ID below)
#    • App-specific password generated at appleid.apple.com → Security
#      → "App-Specific Passwords" — store in keychain item named below
#      (the `--apple-id` / `--password` flags also work for one-off
#      uploads if you'd rather not keychain it)
#    • One time: open the project in Xcode and pick a signing team so
#      the provisioning profile is provisioned. After that this script
#      reuses the same automatic-signing config every run.
#
#  Output:
#    build/AxisCompanion-<build>.xcarchive     (the archive bundle)
#    build/AxisCompanion-<build>.ipa           (the upload artifact)
#
#  The build number is auto-incremented from CFBundleVersion in
#  Info.plist before each archive so App Store Connect never sees a
#  duplicate build (it rejects identical Version + Build pairs).
# =====================================================================

set -euo pipefail

# ---- Knobs you might tweak per-release -------------------------------
SCHEME="App"
WORKSPACE_PATH="ios/App/App.xcworkspace"
EXPORT_OPTIONS="scripts/ExportOptions.plist"
APPLE_ID="${APPLE_ID:-}"                      # set in env or below
KEYCHAIN_PROFILE="${KEYCHAIN_PROFILE:-axis-altool}"  # `xcrun notarytool store-credentials` profile name

# ---- Resolve paths ---------------------------------------------------
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

INFO_PLIST="ios/App/App/Info.plist"
BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

# ---- Sync latest web assets into the iOS bundle ---------------------
# Capacitor's iOS public/ folder is a stale snapshot until we rebuild
# the device target + sync. Doing this here keeps "what's about to be
# archived" always = "what's on github.io/dist-device main".
echo "[1/5] Building web bundle + syncing Capacitor"
npm run build:device
npx cap sync ios

# ---- Bump CFBundleVersion (build number) -----------------------------
# Marketing version (CFBundleShortVersionString) stays put; only the
# internal build number bumps so we can re-upload patches under the
# same human-facing version.
CUR_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST")
NEW_BUILD=$((CUR_BUILD + 1))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD" "$INFO_PLIST"
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$INFO_PLIST")
echo "[2/5] Archiving $SCHEME v$VERSION ($CUR_BUILD → $NEW_BUILD)"

ARCHIVE_PATH="$BUILD_DIR/AxisCompanion-$NEW_BUILD.xcarchive"
IPA_DIR="$BUILD_DIR/AxisCompanion-$NEW_BUILD"

# ---- Archive ---------------------------------------------------------
# CODE_SIGN_STYLE=Automatic + DEVELOPMENT_TEAM env var picks the team
# without baking the team ID into project.pbxproj. Set DEVELOPMENT_TEAM
# once in your shell rc and it carries across every release.
xcodebuild \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  CODE_SIGN_STYLE=Automatic \
  archive | xcpretty || true   # xcpretty optional; never fail the run on it

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "[!] archive failed — see Xcode log above" >&2
  exit 1
fi

# ---- Export IPA ------------------------------------------------------
echo "[3/5] Exporting IPA"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$IPA_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" | xcpretty || true

IPA_FILE=$(find "$IPA_DIR" -maxdepth 2 -name "*.ipa" | head -1)
if [ -z "$IPA_FILE" ] || [ ! -f "$IPA_FILE" ]; then
  echo "[!] no .ipa produced — check ExportOptions.plist" >&2
  exit 1
fi
echo "[4/5] IPA ready: $IPA_FILE"

# ---- Optional upload -------------------------------------------------
if [ "${1:-}" = "upload" ]; then
  echo "[5/5] Uploading to App Store Connect"
  if [ -n "$APPLE_ID" ]; then
    # One-off path: needs an app-specific password env var ASC_PASSWORD.
    xcrun altool --upload-app \
      -f "$IPA_FILE" -t ios \
      --apple-id "$APPLE_ID" \
      --password "@env:ASC_PASSWORD"
  else
    # Preferred path: notarytool keychain profile holds the creds so
    # CI / re-runs don't need a password in the env. One-time setup:
    #   xcrun notarytool store-credentials axis-altool \
    #     --apple-id you@example.com --team-id ABCDE12345 \
    #     --password <app-specific-pw>
    xcrun altool --upload-app \
      -f "$IPA_FILE" -t ios \
      --keychain-profile "$KEYCHAIN_PROFILE"
  fi
  echo "[ok] uploaded — processing on App Store Connect (~10-30 min)"
else
  echo "[5/5] Skip upload. To push to TestFlight:"
  echo "      ./scripts/archive.sh upload"
fi
