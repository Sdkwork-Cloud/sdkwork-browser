# ADR-001: Dual Browser Runtime Architecture

- Status: accepted
- Date: 2026-06-19
- Scope: SDKWork Browser Rust + client architecture

## Context

SDKWork Browser must support both lightweight embedded WebView shells and full native browser engines for AI/enterprise scenarios, while remaining compliant with `sdkwork-specs` naming and crate responsibility rules.

## Decision

1. **Abstraction layer** lives in `sdkwork-browser-abstraction-service` with `BrowserRuntime`, `BrowserNetwork`, and `BrowserPlugin` traits.
2. **Runtime composition** lives in `sdkwork-browser-service-host` via `BrowserRuntimeFactory`.
3. **WebView runtime (default)** is implemented by `sdkwork-browser-tauri-host` (Tauri 2 + system WebView2/WKWebView/WebKitGTK).
4. **Native runtime (advanced)** is implemented by `sdkwork-browser-native-host` backed by `sdkwork-browser-engine-cef-service` (CEF stub in V1).
5. **Future Servo** is isolated in `sdkwork-browser-engine-servo-service` and explicitly not V1.
6. **Agent/MCP** integrate through `sdkwork-browser-agent-service` and `sdkwork-browser-mcp-service`, registered by `sdkwork-browser-plugin-service`.
7. **Client surfaces** remain SDKWork-standard app roots:
   - Desktop → `apps/sdkwork-browser-pc`
   - Mobile H5 → `apps/sdkwork-browser-h5`
   - Mobile Flutter → `apps/sdkwork-browser-flutter-mobile`

## Naming compliance

Forbidden crate names (`browser-core`, `browser-runtime`, etc.) are mapped to responsibility-specific crates per `RUST_CODE_SPEC.md` and `NAMING_SPEC.md`.

| Concept in product spec | SDKWork crate |
| --- | --- |
| browser-core / unified API | `sdkwork-browser-abstraction-service` |
| browser-runtime factory | `sdkwork-browser-service-host` |
| browser-webview | `sdkwork-browser-tauri-host` |
| browser-native | `sdkwork-browser-native-host` |
| browser-engine-cef | `sdkwork-browser-engine-cef-service` |
| browser-engine-servo | `sdkwork-browser-engine-servo-service` |
| browser-agent | `sdkwork-browser-agent-service` |
| browser-mcp | `sdkwork-browser-mcp-service` |

## Consequences

- Upper layers switch runtime via `BrowserRuntimeProfile::WebView | Native` without UI rewrites.
- CEF binding (`cef-rs`) ships behind the `cef` feature on `sdkwork-browser-engine-cef-service`.
- PC UI uses React + TypeScript + TanStack Router + Zustand + TailwindCSS per product standard.
