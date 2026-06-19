# Generate SDKWork Browser Rust crate skeletons (SDKWork-compliant names)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$crates = @(
    @{ Name = "sdkwork-browser-abstraction-service"; Desc = "Unified BrowserRuntime, BrowserNetwork, and BrowserPlugin abstractions." },
    @{ Name = "sdkwork-browser-native-host"; Desc = "Native browser host (CEF) runtime adapter." },
    @{ Name = "sdkwork-browser-engine-cef-service"; Desc = "Chromium Embedded Framework integration service." },
    @{ Name = "sdkwork-browser-engine-servo-service"; Desc = "Future Servo engine integration placeholder." },
    @{ Name = "sdkwork-browser-network-service"; Desc = "Browser network stack abstraction." },
    @{ Name = "sdkwork-browser-tab-service"; Desc = "Browser tab lifecycle service." },
    @{ Name = "sdkwork-browser-session-service"; Desc = "Browser session lifecycle service." },
    @{ Name = "sdkwork-browser-history-service"; Desc = "Browsing history service." },
    @{ Name = "sdkwork-browser-bookmark-service"; Desc = "Bookmark service." },
    @{ Name = "sdkwork-browser-download-service"; Desc = "Download manager service." },
    @{ Name = "sdkwork-browser-cookie-service"; Desc = "Cookie jar service." },
    @{ Name = "sdkwork-browser-security-service"; Desc = "Browser security policy service." },
    @{ Name = "sdkwork-browser-agent-service"; Desc = "Agent runtime integration for page understanding and automation." },
    @{ Name = "sdkwork-browser-mcp-service"; Desc = "MCP client/server integration for enterprise connectors." },
    @{ Name = "sdkwork-browser-plugin-service"; Desc = "Unified browser plugin registry." }
)

function Ensure-Dir($p) {
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

foreach ($c in $crates) {
    $dir = Join-Path $Root "crates\$($c.Name)"
    Ensure-Dir "$dir\src"
    Ensure-Dir "$dir\specs"
    $slug = ($c.Name -replace '-', '_')
    if (-not (Test-Path "$dir\Cargo.toml")) {
        @"
[package]
name = "$($c.Name)"
version = "0.1.0"
edition = "2021"
license = "Apache-2.0"
description = "$($c.Desc)"

[lib]
path = "src/lib.rs"

[dependencies]
serde = { version = "1", features = ["derive"] }
thiserror = "2"
"@ | Set-Content "$dir\Cargo.toml" -Encoding UTF8
    }
    if (-not (Test-Path "$dir\src\lib.rs")) {
        "//! $($c.Desc)`npub const CRATE_NAME: &str = `"$($c.Name)`";" | Set-Content "$dir\src\lib.rs" -Encoding UTF8
    }
    if (-not (Test-Path "$dir\README.md")) {
        "# $($c.Name)`n`n$($c.Desc)" | Set-Content "$dir\README.md" -Encoding UTF8
    }
}

Write-Host "Crate skeletons ready under $Root\crates"
