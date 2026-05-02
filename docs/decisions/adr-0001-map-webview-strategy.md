# ADR 0001: Map WebView Strategy

## Status

Proposed.

## Context

SafeExit needs Kakao Map JavaScript SDK behavior inside a mobile app. Kakao SDK domain registration and browser origin rules make direct local-file loading unreliable.

## Decision

Map SDK content should be served over HTTP or HTTPS and rendered inside WebView. Fallback facility information must remain outside the map loading path so users still see support information when the SDK, network, or domain registration fails.

## Consequences

- `file://` is not a valid Kakao SDK test path.
- WebView logs must include origin and SDK loading state.
- Local device tests may need LAN origins registered in Kakao Developers.
- Fallback UI is safety-critical and cannot be removed without approval.
