#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Run terser minification
terser draftback.js -c -m -o draftback.min.js --config-file terser.config.js
terser background.js -c -m -o background.min.js --config-file terser.config.js

# Create new manifest with updated file names
jq '(.content_scripts[0].js[] | select(. == "draftback.js")) |= "draftback.min.js" | .background.service_worker = "background.min.js"' manifest.json > dist/manifest.json

# Copy minified files to dist
cp draftback.min.js background.min.js dist/

# Copy all other files except specified ones
find . -maxdepth 1 -type f \
  ! -name 'draftback.js' \
  ! -name 'background.js' \
  ! -name 'terser.config.js' \
  ! -name 'draftback.min.js' \
  ! -name 'background.min.js' \
  ! -name 'manifest.json' \
  -exec cp {} dist/ \;

# Copy directories
cp -r images dist/

rm draftback.min.js
rm background.min.js