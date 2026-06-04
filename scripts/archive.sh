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
# Capacitor 8.x uses Swift Package Manager, not CocoaPods, so there is
# no separate .xcworkspace — xcodebuild reads the .xcodeproj directly.
# (Older Capacitor docs still mention App.xcworkspace; ignore those.)
PROJECT_PATH="ios/App/App.xcodeproj"
EXPORT_OPTIONS="scripts/ExportOptions.plist"
APPLE_ID="${APPLE_ID:-}"                      # set in env or below
KEYCHAIN_PROFILE="${KEYCHAIN_PROFILE:-axis-altool}"  # `xcrun notarytool store-credentials` profile name

# v2.5.42 — fail fast if signing prerequisites are missing. xcodebuild
# would otherwise spend a couple of minutes building before failing in
# the codesign step with a noisy provisioning-profile error.
if [ -z "${DEVELOPMENT_TEAM:-}" ]; then
  echo "[!] DEVELOPMENT_TEAM env var not set." >&2
  echo "    Add 'export DEVELOPMENT_TEAM=ABCDE12345' to your shell rc" >&2
  echo "    (10-char Team ID from developer.apple.com → Membership)" >&2
  exit 1
fi

# ---- Resolve paths ---------------------------------------------------
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Defensive: Xcode (15+) sometimes auto-renames the .xcodeproj folder to
# match CFBundleDisplayName if the user accepts a "Modernize Project"
# prompt or hits F2 on the project node. Every external tool (Capacitor
# sync, this script, CI) expects the project to stay at App.xcodeproj.
# If we see the renamed copy, abort with recovery instructions rather
# than building against a half-broken layout.
if [ -d "ios/App/SN AXIS.xcodeproj" ] || [ ! -f "ios/App/App.xcodeproj/project.pbxproj" ]; then
  echo "[!] ios/App/App.xcodeproj is broken or has been renamed." >&2
  echo "    Probable cause: Xcode prompted to rename project — answer was 'Yes'." >&2
  echo "    To recover:" >&2
  echo "      1. Quit Xcode entirely (Cmd+Q)" >&2
  echo "      2. cd $(pwd)" >&2
  echo "      3. git restore --source=HEAD -- ios/App/App.xcodeproj/" >&2
  echo "      4. rm -rf 'ios/App/SN AXIS.xcodeproj'" >&2
  echo "      5. Reopen the project: open ios/App/App.xcodeproj" >&2
  echo "      6. If Xcode asks to rename — click 'Don't Rename'" >&2
  exit 1
fi

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
  -project "$PROJECT_PATH" \
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
