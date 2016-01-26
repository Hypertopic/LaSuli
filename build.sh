#!/bin/sh

LSXPI="lasuli.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp -r \
  install.rdf content defaults locale \
      modules icon.png chrome.manifest \
  build/
cd build

echo "Cleaning up unwanted files ..."
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;
find . -depth -name '*.psd' -exec rm -rf "{}" \;
find . -depth -name '.DS_Store' -exec rm -rf "{}" \;
find . -depth -name '.*.swp' -exec rm -rf "{}" \;
find . -depth -name 'test*' -exec rm -rf "{}" \;

echo "Gathering all locales into chrome.manifest ..."
for entry in locale/*; do
  entry=`basename $entry`
  if [ $entry != en-US ]; then
    echo "locale  lasuli  $entry  locale/$entry/" >> chrome.manifest
  fi
done


echo "Creating $LSXPI ..."
zip -qr9DX "../$LSXPI" *

echo "Cleaning up temporary files ..."
cd ..
rm -rf build

