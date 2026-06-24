> Migrated from `docs/technical-architecture.md` on 2026-06-24.
> Owner: SDKWork maintainers

# SDKWork Browser technical architecture

Authoritative architecture decision: [`adr/ADR-001-dual-browser-runtime.md`](./adr/ADR-001-dual-browser-runtime.md).

## Dual runtime

```text
Applications (PC / H5 / Flutter)
        │
Browser Abstraction Layer (sdkwork-browser-abstraction-service)
        │
   ┌────┴────┐
WebView     Native
(tauri)     (CEF)
```

Factory: `sdkwork-browser-service-host::BrowserRuntimeFactory`

## Application surfaces (SDKWork standard)

| Product name | SDKWork app root | Runtime |
| --- | --- | --- |
| Desktop | `apps/sdkwork-browser-pc` | Tauri 2 + React |
| Mobile H5 | `apps/sdkwork-browser-h5` | React |
| Mobile Flutter | `apps/sdkwork-browser-flutter-mobile` | Flutter |

## Rust crates (`crates/`)

See [`../crates/README.md`](../crates/README.md) for the full responsibility matrix.

## SDK families (`sdks/`)

| Family | Purpose |
| --- | --- |
| `sdkwork-browser-app-sdk` | App-api generated clients |
| `sdkwork-browser-backend-sdk` | Backend-api generated clients |

Node/Java/Python SDK workspaces will be generated from the same OpenAPI authorities when APIs are materialized.

## PC UI stack

- React + TypeScript
- TanStack Router
- Zustand
- TailwindCSS v4

