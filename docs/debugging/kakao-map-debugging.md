# Kakao Map, WebView, and Expo Debugging

Use this guide for Kakao Map SDK loading, Expo WebView map rendering, and fallback facility list issues.

## Key and origin rules

- The Kakao JavaScript key should come from `EXPO_PUBLIC_KAKAO_MAP_JS_KEY`.
- Do not hardcode the key in source, HTML, logs, or docs.
- The runtime WebView origin must be registered in Kakao Developers JavaScript SDK domains.
- Never test the Kakao JavaScript SDK from `file://`.
- If using `public/kakao-map.html`, serve it through HTTP or HTTPS.

## How to test origins

- Local browser: use `http://localhost:<port>`.
- Local device WebView: use the LAN URL, for example `http://<local-ip>:<port>`, and register that exact origin if needed.
- Deployed app: use the deployed HTTPS origin.
- If Expo environment variables change, fully restart/reload Expo so the new value is bundled.

## WebView logging labels

Use structured logs for debugging:

```txt
[SafeExit KakaoMapWebView message]
[SafeExit KakaoMapWebView error]
[SafeExit KakaoMapWebView origin]
[SafeExit KakaoMapWebView SDK onload]
[SafeExit KakaoMapWebView SDK onerror]
```

Include:

- `type`
- `reason`
- `origin.href`
- `origin.origin`
- `origin.protocol`
- `referrer`
- relevant URL
- fallback state

Example payload:

```json
{
  "type": "sdk-load-failed",
  "reason": "domain-not-allowed",
  "origin": {
    "href": "http://localhost:8081/kakao-map.html",
    "origin": "http://localhost:8081",
    "protocol": "http:"
  },
  "referrer": "",
  "url": "https://dapi.kakao.com/v2/maps/sdk.js",
  "fallbackState": "facility-list-visible"
}
```

## Distinguishing common failures

| Reason | Meaning | Next action |
| --- | --- | --- |
| `sdk-load-failed` | Script failed to load | Check network, script URL, key injection, and origin |
| `kakao-not-defined` | Script loaded path completed but `window.kakao` is missing | Check SDK URL, autoload handling, and WebView script execution |
| `domain-not-allowed` | Kakao rejected the runtime origin | Register the exact HTTP/HTTPS origin in Kakao Developers |
| `file-origin` | HTML was opened with `file://` | Serve `public/kakao-map.html` through HTTP/HTTPS |

## Fallback behavior

When map loading fails:

- The fallback facility list should remain visible.
- The user-facing error should explain that map loading failed and nearby support information is still available.
- Do not silently fall back without recording the reason in gated or documented logs.

## Production logging rules

- Debug logs should be gated behind DEV or documented as intentional.
- Do not leave noisy logs in production paths.
- Do not log full keys, bearer tokens, private data, or raw `.env` contents.
