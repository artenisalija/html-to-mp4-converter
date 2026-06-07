# HTML to MP4 Converter

Free browser app for converting AI-generated HTML into MP4, with 1x, 2x, or 4x output scaling.

## Live App

Use it here:

https://artenisalija.com/html-to-mp4-converter/

## Why This Exists

AI tools can generate HTML, CSS, and JavaScript for reels, animated visuals, landing-page concepts, and social video mockups. Instead of spending more tokens asking AI to convert that HTML into a video, paste or upload the HTML here and export an MP4 in your browser.

The app is static and runs on GitHub Pages. Rendering and encoding happen in the visitor's browser using free client-side tools:

- `html2canvas` for HTML frame capture.
- `@ffmpeg/ffmpeg` and `@ffmpeg/core` for MP4 encoding in WebAssembly.
- GitHub Actions for automatic deployment to GitHub Pages.

## Local Development

```powershell
pnpm install
pnpm dev
```

## Build

```powershell
pnpm build
```

## Limits

- Pasted HTML and uploaded `.html` files work best.
- External images/fonts must allow browser canvas capture through CORS, or they may be skipped.
- 4x videos are slower and use more memory in the browser.
