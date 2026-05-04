# Performance Notes

## Seonbi Character Images

The judge screen should keep the current seonbi type responsive without preloading every character asset in the app.

Recommended asset guidelines:

- Prefer WebP for newly generated character images.
- Keep card display images around 600-800px on the longest visible side.
- Target 100-250KB per display image where visual quality allows.
- Keep original high-resolution source files outside the runtime `public/` bundle.
- Prefer a future nested structure such as `public/images/seonbi/{type}/{mode}.webp` when migrating assets.
- Keep a PNG fallback during migration so existing paths remain backward compatible.

Runtime guidance:

- Preload only the active seonbi type's mode images on `JudgePage`.
- Do not preload all types and all modes at startup.
- Use explicit image dimensions or a stable `aspect-ratio` on the visual card to prevent layout shift.
- Use a small fade-in after `onLoad`; avoid large motion or transforms for core content.
