# SDKWork Browser PC - Agent Instructions

## Application Identity

- **Code**: `sdkwork-browser-pc`
- **Runtime**: PC browser / desktop / tablet (Tauri)
- **Framework**: React
- **Domain**: platform
- **Capability**: browser

## Required Specs

- `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../sdkwork-specs/DESKTOP_APP_ARCHITECTURE_SPEC.md`
- `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`
- `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`

## Package Structure

- `packages/sdkwork-browser-pc-core/` - runtime bootstrap and SDK wiring
- `packages/sdkwork-browser-pc-commons/` - shared PC utilities
- `packages/sdkwork-browser-pc-shell/` - application shell layout
- `packages/sdkwork-browser-pc-browser/` - browser capability UI module
- `packages/sdkwork-browser-pc-desktop/` - Tauri desktop host

## Verification

```powershell
pnpm typecheck
pnpm test:pc-browser
cargo test -p sdkwork-browser-tauri-host
```
