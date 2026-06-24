> Migrated from `docs/adr/ADR-005-pc-package-family-alignment.md` on 2026-06-24.
> Owner: SDKWork maintainers

# ADR-005: PC Application Package Family Alignment

Status: accepted  
Owner: sdkwork-browser-pc  
Date: 2026-06-21  
Specs: APP_PC_ARCHITECTURE_SPEC.md, APP_PC_REACT_UI_SPEC.md

## Context

PC browser UI and bootstrap code lived in the application root `src/` and a legacy `sdkwork-browser-pc-react` package name.

## Decision

Adopt canonical PC package taxonomy:

| Package | Role |
| --- | --- |
| `sdkwork-browser-pc-core` | SDK clients, gateway transport, IAM/bootstrap |
| `sdkwork-browser-pc-commons` | Shared navigation and host utilities |
| `sdkwork-browser-pc-shell` | Application shell layout export surface |
| `sdkwork-browser-pc-browser` | Browser capability module (replaces `pc-react`) |
| `sdkwork-browser-pc-desktop` | Tauri native host (unchanged) |

Root `src/` retains thin entry (`main.tsx`, `App.tsx`, `router.tsx`, styles) only.

## Verification

- `pnpm verify`
- `pnpm run test:governance`

