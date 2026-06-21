# SDKWork Browser Cross-Surface Packages

Cross-client TypeScript contracts and services shared by PC and H5 browser surfaces.

This root-level `packages/common/browser/` directory is an approved platform exception: the browser workspace owns shared contracts before each app surface splits UI packages under `apps/sdkwork-browser-*`.

| Package | Purpose |
| --- | --- |
| `sdkwork-browser-contracts` | Shared TypeScript contracts |
| `sdkwork-browser-service` | Cross-surface browser services |

Governed by `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` and root `specs/component.spec.json`.
