# Verification — 2 October 2026

- Production build: passed (TypeScript + Vite 8.3.2).
- Validation, API, caching, geometry, and embedded PostgreSQL: 24 checks passed.
- Desktop/mobile browser flows: 9 passed; 1 desktop-only skip for the touch-mode test.
- Desktop, tablet, mobile screenshot inspection: all original local assets loaded,
  no runtime errors, no horizontal page overflow.
- Netlify Functions: all four endpoints bundled successfully.
- Application dependency audit: 0 known vulnerabilities after the final dependency update.
- Frontend bundle: no temporary Figma URLs or Supabase server-key references.
- Build output: approximately 77 KB gzipped JavaScript and 4.4 KB gzipped CSS,
  plus the original Figma assets and local fonts.

The browser checks exercise explicit local demo data. Live Supabase and Netlify
credentials were not supplied; deployed API connectivity and separate-connection
concurrency checks remain part of the setup guide.

Licensed Gilroy faces are still needed for exact typography. Cormorant Infant,
the original imagery/vectors, textured background, and the four emoji symbols are
included locally. The source design's light pink/cream and white/pink display text
is preserved; those combinations need contrast adjustments before claiming full
WCAG AA compliance. The new controls and reader use dark foreground text.

The optional Netlify local-development CLI is invoked on demand by dev:api rather
than bundled into the application dependency tree. Its current image-development
tools have upstream security advisories; they are not part of this site's deployed
frontend or native-fetch functions. Use the local preview bound to localhost.
