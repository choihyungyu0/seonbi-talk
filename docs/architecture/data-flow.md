# Data Flow

Expected SafeExit data flow:

1. User opens facility or map experience.
2. App loads nearby facility data from public-data proxy or local fallback.
3. App renders list-based safety information regardless of map availability.
4. Map WebView loads Kakao SDK through an HTTP/HTTPS-served page.
5. WebView reports structured load, origin, SDK, and error messages to the native layer.
6. If map or public-data loading fails, fallback facility information remains visible.

Compatibility rules:

- Public-data parser output shape must remain stable unless explicitly changed.
- Supabase function response shape must remain backward-compatible unless explicitly changed.
- Fallback data must not be removed as part of map, SDK, or parser fixes.
