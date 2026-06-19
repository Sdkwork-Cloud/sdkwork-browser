# SDKWork Browser Tests

Cross-package and contract verification for the browser runtime platform workspace.

## Layers

- **Governance** — `scripts/browser-governance.test.mjs` (structure, framework wiring, manifests)
- **TypeScript contracts** — `packages/common/browser/sdkwork-browser-contracts/tests/`
- **Rust crate tests** — `crates/*/tests/` and inline `#[cfg(test)]`
- **OpenAPI materialization** — `pnpm run api:materialize:check`

## Commands

```bash
pnpm verify
pnpm run test:governance
cargo test --workspace
```
