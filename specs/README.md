# SDKWork Browser Component Specs

Component-local contracts for the browser runtime platform workspace.

| Component | Spec |
| --- | --- |
| Workspace root | `specs/component.spec.json` |
| Rust crates | `crates/*/specs/component.spec.json` |
| App surfaces | `apps/*/specs/component.spec.json` |

Regenerate crate/app specs:

```bash
node scripts/generate-component-specs.mjs
```

## Platform integrations

| Framework | Status | Location |
| --- | --- | --- |
| sdkwork-web-framework | Integrated | route crates `web_bootstrap.rs` |
| sdkwork-database | Integrated | `sdkwork-platform-browser-repository-sqlx` |
| sdkwork-utils | Integrated | `sdkwork-browser-shared-service` (id, string, validation helpers) |
| sdkwork-discovery | Deferred | ADR-003 |
