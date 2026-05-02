# SafeExit Agent Constitution

## Project Overview

SafeExit is intended to be a safety-support app that helps users find nearby support facilities, display map-based information, and keep usable fallback facility lists when map or public-data loading fails.

Current checkout: Vite React + TypeScript. Target architecture referenced by project scope: React Native, Expo, TypeScript, Expo Router, Supabase Edge Functions, Kakao Map JavaScript SDK in WebView, Jest, ESLint, and public-data proxy functions.

Important boundaries:

- App behavior and user-facing flows must be preserved unless the task explicitly asks for a behavior change.
- Map/WebView, public-data parsing, fallback facility lists, and Supabase response shapes are high-risk areas.
- Harness, docs, scripts, and `.agent` files may be changed without app behavior changes.

## Repository Map

- `app/`: not present yet; expected Expo Router screens when the app moves to Expo.
- `src/`: current React application source.
- `components/`: not present yet; expected shared UI components.
- `hooks/`: not present yet; expected shared hooks.
- `data/`: not present yet; expected local data, fixtures, or fallback facility lists.
- `public/`: static assets. If `public/kakao-map.html` is added later, serve it over HTTP/HTTPS, never `file://`.
- `supabase/`: not present yet; expected Edge Functions and public-data proxies.
- `tests/`: not present yet; expected Jest tests and fixtures.
- `scripts/`: standalone project scripts, including harness checks.
- `docs/`: project architecture, debugging, harness, and decision records.
- `.agent/`: reusable agent skills and task recovery state.

## Non-Negotiable Rules

- Do not remove fallback facility list behavior unless explicitly asked and approved.
- Do not hardcode secrets, API keys, IP addresses, bearer tokens, Supabase keys, or deployment URLs.
- Do not edit `.env` files or change environment variables without approval.
- Do not change unrelated files.
- Preserve current user-facing behavior unless the task says otherwise.
- For SDK/WebView issues, capture origin, URL, loading state, fallback state, and error reason.
- For map-related work, verify browser and mobile WebView behavior when possible.
- Never test the Kakao JavaScript SDK from `file://`.
- If using `public/kakao-map.html`, load it through HTTP or HTTPS.
- Expo environment variable changes require a full reload and must be documented.
- Run required verification commands before reporting completion.
- If a command fails or is unavailable, report that honestly.

## Human Approval Required Before

Ask for approval before:

- Deleting files.
- Editing `.env` files or changing environment variables.
- Adding, removing, or upgrading dependencies.
- Modifying `package.json`.
- Modifying `app.json`, EAS config, Supabase config, deployment config, or production URLs.
- Modifying authentication, authorization, or secrets.
- Pushing to `main`.
- Removing tests.
- Removing fallback behavior.
- Making broad refactors.
- Running destructive database commands.

## Required Verification Commands

Detected package scripts:

- `npm.cmd run build`: TypeScript project build plus Vite build.
- `npm.cmd run lint`: ESLint.
- `npm.cmd run dev`: Vite dev server.
- `npm.cmd run preview`: Vite preview server.

Safe checks for normal agent work on Windows:

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `node scripts/harness/check-no-skipped-tests.js`
- `node scripts/harness/check-no-secrets.js`
- `node scripts/harness/check-dangerous-diff.js`

Equivalent non-Windows commands:

- `npx tsc --noEmit`
- `npm run lint`
- `node scripts/harness/check-no-skipped-tests.js`
- `node scripts/harness/check-no-secrets.js`
- `node scripts/harness/check-dangerous-diff.js`

When runtime verification is required in a future Expo app:

- Windows: `npx.cmd expo start -c`
- Other shells: `npx expo start -c`

## Reporting Format

At the end of every task, report:

- Files changed.
- Why they were changed.
- Verification commands run.
- Results.
- Remaining warnings or risks.
- Next recommended step.

## Mapping Other Agent Tools

If `CLAUDE.md`, Cursor rules, `.cursorrules`, or Copilot instructions are added later, they should point back to this file as the central source of truth instead of duplicating divergent rules.
