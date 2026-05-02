# Frontend Boundaries

SafeExit frontend work should preserve these boundaries:

- Screen/routes own navigation and page-level composition.
- Components own reusable UI and should not fetch public data directly unless already established.
- Hooks own stateful logic and side effects.
- Data transformation should live in utility modules with fixture tests.
- Map WebView code should be isolated from fallback list rendering so map failures do not remove safety information.

Do not move logic across these boundaries during a small fix unless the task explicitly asks for a refactor.
