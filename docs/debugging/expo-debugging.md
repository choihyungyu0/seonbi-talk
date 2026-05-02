# Expo Debugging

Use this when runtime behavior changes in the future Expo app.

- Capture the exact error message before editing.
- Identify whether the failure is bundling, module resolution, runtime, WebView, environment, or API-related.
- Avoid random dependency upgrades.
- Expo public environment variable changes require a full reload/restart.
- Runtime verification should use `npx.cmd expo start -c` on Windows or `npx expo start -c` elsewhere when needed.
- Report whether verification was done on browser, simulator, emulator, or physical device.
