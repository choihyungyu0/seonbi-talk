# Safe Map Feature Spec

SafeExit map features must support:

- Loading nearby support facilities.
- Showing map-based context when Kakao Map loads successfully.
- Showing fallback facility information when map loading fails.
- Reporting actionable map/WebView error reasons for debugging.

Non-goals for small fixes:

- Rewriting public-data ingestion.
- Changing Supabase response shapes.
- Removing list-based fallback behavior.
- Changing production URLs, keys, or deployment settings.
