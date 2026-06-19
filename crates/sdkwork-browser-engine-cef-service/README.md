# SDKWork Browser Engine CEF Service

Chromium Embedded Framework engine adapter for the browser runtime platform.

## Binding modes

| Mode | Cargo feature | Description |
| --- | --- | --- |
| Stub (default) | *(none)* | CI-safe scaffold; no CEF binaries required |
| cef-rs native | `cef` | Real [tauri-apps/cef-rs](https://github.com/tauri-apps/cef-rs) `initialize` / `shutdown` binding |

## Build with cef-rs

```bash
# Optional: pre-download CEF binaries (see cef-rs README)
export CEF_PATH="$HOME/.local/share/cef"

cargo build -p sdkwork-browser-engine-cef-service --features cef
cargo test -p sdkwork-browser-engine-cef-service --features cef
```

Default workspace `pnpm verify` uses the stub binding so CI does not require CEF artifacts.
