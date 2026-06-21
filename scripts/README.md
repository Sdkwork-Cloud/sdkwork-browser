# SDKWork Browser Scripts

Thin command entrypoints for build, verification, generation, and governance checks.

| Script | Purpose |
| --- | --- |
| `browser-governance.test.mjs` | Workspace structure and framework integration gates |
| `generate-component-specs.mjs` | Regenerate `specs/component.spec.json` for crates and apps |
| `check-browser-sdks.mjs` | Verify generated SDK artifacts |
| `clean.mjs` | Remove build artifacts |

Prefer root `pnpm` scripts over calling these files directly.
