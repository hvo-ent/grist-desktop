#!/bin/bash
# Collects the electron-builder "dir" output into dist/GristPortable-<os>-<arch>.zip:
#   GristPortable/
#     <program>          (Grist Desktop.exe + files | grist-desktop + files | Grist Desktop.app)
#     GristData/docs/    (your .grist documents)
#     GristData/settings.env
set -e
cd "$(dirname "$0")/.."

arch="${TARGET_ARCH:-x64}"
case "$OSTYPE" in
  msys*|cygwin*) os=win;   src=$(ls -d dist/win*-unpacked | head -1) ;;
  darwin*)       os=mac;   src=$(ls -d dist/mac*/*.app | head -1) ;;
  *)             os=linux; src=$(ls -d dist/linux*-unpacked | head -1) ;;
esac
[ -n "$src" ] || { echo "No electron-builder dir output found in dist/"; exit 1; }

out=dist/GristPortable
rm -rf "$out"
mkdir -p "$out/GristData/docs"
if [ "$os" = mac ]; then
  cp -R "$src" "$out/"
else
  cp -R "$src"/. "$out/"
fi

cat > "$out/GristData/settings.env" <<'ENV'
# Grist Portable settings. Uncomment to change.
# GRIST_DEFAULT_USERNAME=You
# GRIST_DEFAULT_EMAIL=you@example.com
# GRIST_DESKTOP_AUTH=strict
ENV

zipname="GristPortable-$os-$arch.zip"
rm -f "dist/$zipname"
if [ "$os" = win ]; then
  (cd dist && powershell -NoProfile -Command "Compress-Archive -Path GristPortable -DestinationPath $zipname")
elif [ "$os" = mac ]; then
  (cd dist && ditto -c -k --keepParent GristPortable "$zipname")   # keeps the .app symlinks intact
else
  (cd dist && zip -qry "$zipname" GristPortable)
fi
echo "Built dist/$zipname"
