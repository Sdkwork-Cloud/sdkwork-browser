# Architecture alignment

See [`technical-architecture.md`](./technical-architecture.md) and [`adr/ADR-001-dual-browser-runtime.md`](./adr/ADR-001-dual-browser-runtime.md).

## Dual runtime (implemented V1)

- **WebView (default)**: `sdkwork-browser-tauri-host` — Tauri 2 + system WebView
- **Native (advanced)**: `sdkwork-browser-native-host` + `sdkwork-browser-engine-cef-service`
- **Factory**: `sdkwork-browser-service-host::BrowserRuntimeFactory`
- **Traits**: `sdkwork-browser-abstraction-service::{BrowserRuntime, BrowserNetwork, BrowserPlugin}`

## Surfaces

| Product | SDKWork app root |
| --- | --- |
| Desktop | `apps/sdkwork-browser-pc` |
| Mobile H5 | `apps/sdkwork-browser-h5` |
| Mobile Flutter | `apps/sdkwork-browser-flutter-mobile` |

## Next steps

1. Materialize OpenAPI under `apis/` and generate `sdks/sdkwork-browser-app-sdk`.
2. Enable CEF via `cef` feature on `sdkwork-browser-engine-cef-service` (`cef-rs`).
3. Wire `sdkwork-agent-runtime` and `sdkwork-mcp-runtime` into host commands.
4. Add Tauri platform icons for desktop CI packaging.

