# Project Map

Current checkout:

- `src/`: React TypeScript source for the current Vite app.
- `public/`: static assets served by the web app.
- `scripts/`: standalone scripts. Harness scripts live under `scripts/harness/`.
- `docs/`: harness, architecture, debugging, decisions, and specs.
- `.agent/`: reusable agent workflows and recovery state.

Target SafeExit areas not present yet:

- `app/`: Expo Router routes.
- `components/`: shared React Native UI.
- `hooks/`: reusable app hooks.
- `data/`: fallback facility data and fixtures.
- `supabase/`: Edge Functions and public-data proxy code.
- `tests/`: Jest tests and fixtures.

Agents must mark absent folders as absent instead of inventing implementation details.
