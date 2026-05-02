# WebView Debugging

Use this for WebView loading, message passing, and embedded HTML issues.

- Log WebView URL, origin, loading state, and error reason.
- Confirm whether content is loaded from `file://`, `http://`, or `https://`.
- Prefer HTTP/HTTPS for SDK-backed HTML.
- Keep fallback UI outside the WebView failure path.
- Do not hide WebView errors by silently showing fallback content without recording the reason.

Suggested message fields:

- `type`
- `reason`
- `url`
- `origin.href`
- `origin.origin`
- `origin.protocol`
- `fallbackState`
