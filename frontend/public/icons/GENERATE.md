# Generate PWA icons from the brand logo

Run these commands from the repo root:

```bash
mkdir -p frontend/public/icons
magick frontend/public/brand/barn-logo.png -resize 192x192 -background none -gravity center -extent 192x192 frontend/public/icons/icon-192.png
magick frontend/public/brand/barn-logo.png -resize 512x512 -background none -gravity center -extent 512x512 frontend/public/icons/icon-512.png
# optional favicon
magick frontend/public/brand/barn-logo.png -resize 64x64 frontend/public/favicon.ico
```

If `magick` is unavailable, install ImageMagick first.
