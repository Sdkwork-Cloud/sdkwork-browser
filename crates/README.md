# SDKWork Browser crates

Browser Runtime Platform — PRD-aligned, SDKWork-compliant crate matrix.

## Engine Standard (PRD §5–§7)

| PRD | Crate | Role |
| --- | --- | --- |
| browser-engine-api | `sdkwork-browser-engine-api-service` | `BrowserEngine` trait |
| browser-engine-registry | `sdkwork-browser-engine-registry-service` | `register` / `get` |
| browser-engine-webview | `sdkwork-browser-engine-webview-service` | WebView2 / WKWebView / WebKitGTK |
| browser-engine-cef | `sdkwork-browser-engine-cef-service` | CEF + Chromium |
| browser-engine-servo | `sdkwork-browser-engine-servo-service` | Servo (V4) |

## Platform API (PRD §4)

| PRD | Crate | Role |
| --- | --- | --- |
| browser-core | `sdkwork-browser-platform-service` | `BrowserPlatform`, YAML config |
| browser-runtime | `sdkwork-browser-service-host` | Platform factory |

## Domain modules (PRD §9)

| Module | Crate |
| --- | --- |
| Tab | `sdkwork-browser-tab-service` |
| Bookmark | `sdkwork-browser-bookmark-service` |
| History | `sdkwork-browser-history-service` |
| Download | `sdkwork-browser-download-service` |
| Cookie | `sdkwork-browser-cookie-service` |
| Session | `sdkwork-browser-session-service` |
| Storage | `sdkwork-browser-storage-sqlx-rust` |
| Network | `sdkwork-browser-network-service` |
| Security | `sdkwork-browser-security-service` |

## Agent / MCP (PRD §10–§11)

| Module | Crate |
| --- | --- |
| Agent | `sdkwork-browser-agent-service` → `sdkwork-agent-runtime` |
| MCP | `sdkwork-browser-mcp-service` → `sdkwork-mcp-runtime` |
| Plugins | `sdkwork-browser-plugin-service` |

## Host adapters

| Crate | Role |
| --- | --- |
| `sdkwork-browser-tauri-host` | Tauri 2 shell + legacy WebView runtime adapter |
| `sdkwork-browser-native-host` | Native host bridge (CEF path) |
| `sdkwork-browser-abstraction-service` | Legacy runtime/network/plugin traits |

## API routes

| Crate | Role |
| --- | --- |
| `sdkwork-routes-browser-app-api` | App-api manifest |
| `sdkwork-routes-browser-backend-api` | Backend-api manifest |
