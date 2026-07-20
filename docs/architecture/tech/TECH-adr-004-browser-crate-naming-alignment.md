> Migrated from `docs/adr/ADR-004-browser-crate-naming-alignment.md` on 2026-06-24.
> Owner: SDKWork maintainers

# ADR-004: Browser Crate Naming Alignment

Status: accepted  
Owner: sdkwork-browser  
Date: 2026-06-21  
Specs: NAMING_SPEC.md, RUST_CODE_SPEC.md, MIGRATION_SPEC.md

## Context

Early browser workspace crates used non-canonical names:

- `sdkwork-browser-app-server` (retired `-app-server` suffix)
- `sdkwork-browser-storage-sqlx-rust` (non-standard storage suffix)

## Decision

Rename to SDKWork canonical patterns:

| Before | After |
| --- | --- |
| `sdkwork-browser-app-server` | `sdkwork-browser-standalone-gateway` |
| `sdkwork-browser-storage-sqlx-rust` | `sdkwork-platform-browser-repository-sqlx` |

## Consequences

- Root `pnpm dev:server`, `gateway:run`, and `dev:server` target `sdkwork-browser-standalone-gateway`.
- Governance tests forbid retired crate directory names.
- Repository bootstrap and SQLx bindings live in `sdkwork-platform-browser-repository-sqlx`.

## Verification

- `pnpm run test:governance`
- `cargo test -p sdkwork-platform-browser-repository-sqlx`
- `cargo run -p sdkwork-browser-standalone-gateway` (manual smoke)

