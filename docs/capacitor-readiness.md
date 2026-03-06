# Project Barn Capacitor Readiness (Phase 9)

## Current readiness status

Project Barn remains deployed as a split Next.js + Flask app behind Traefik, but the frontend now includes mobile-webview hardening work to reduce risk before native wrapping.

## What is already compatible

- In-app shell uses consistent CSS variables for header and bottom nav sizing.
- Safe-area insets are used for top and bottom fixed bars.
- Main content padding is derived from shell variables to prevent overlap under fixed bars.
- Primary high-touch list routes now show clear loading, error, and retry UI for transient failures.
- Upload logic is centralized in `frontend/lib/uploads.ts` with shared validation by upload type.
- API path origin assumptions are centralized in `frontend/lib/runtimeConfig.ts` and used by `frontend/lib/api.ts`.

## Flows prepared for future camera/file-picker swap

The following flows already use the centralized upload helper and can be redirected later to Capacitor Camera/Filesystem selection with minimal UI churn:

- profile avatar uploads
- project hero uploads
- project media uploads
- expense receipt uploads

## Remaining work before real Capacitor conversion

- Replace remaining `window.prompt` / direct browser dialogs in feature pages with in-app modal components.
- Add native-aware file open/download behavior for all report/export routes where a browser tab assumption still exists.
- Add a dedicated mobile offline queue for writes (current work improves retries but not background sync).
- Add explicit webview keyboard handling and viewport resize polish for all long forms.
- Validate push notifications, camera permissions, and native storage fallback in an actual Capacitor shell.

## Known non-blocking gaps

- Some route-level pages outside the highest-touch flows still rely on basic one-shot loading patterns.
- Browser print actions remain optional browser affordances and should be hidden/adjusted in native builds.
