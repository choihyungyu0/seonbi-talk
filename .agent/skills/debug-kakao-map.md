---
name: debug-kakao-map
description: Debug Kakao Map SDK loading in Expo React Native WebView without guessing.
---

# Purpose

Find the real cause of Kakao Map loading failures while preserving fallback facility behavior.

# When to use

Use for Kakao Map SDK, WebView origin, map HTML, domain registration, or fallback map behavior issues.

# Steps

1. Identify whether the issue is key loading, domain registration, SDK script loading, WebView origin, or map rendering.
2. Check `EXPO_PUBLIC_KAKAO_MAP_JS_KEY` is referenced through environment access, not hardcoded.
3. Check current WebView origin from logs.
4. Compare the origin with Kakao Developers JavaScript SDK domains.
5. Verify whether the map HTML is loaded via `file://`, `http://`, or `https://`.
6. Never test Kakao SDK using `file://`.
7. If using `public/kakao-map.html`, load it through an HTTP or HTTPS server.
8. Preserve fallback UI and surrounding facility list behavior.
9. Add or inspect structured logs only if needed.
10. Run typecheck and lint.
11. Report the exact error reason and next action.

# Required verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- Manual Expo test if WebView behavior changed.
- WebView log check if map loading changed.

# Reporting checklist

- Exact failure reason.
- Runtime origin and protocol.
- Whether fallback remained visible.
- Commands run and results.
- Next action.
