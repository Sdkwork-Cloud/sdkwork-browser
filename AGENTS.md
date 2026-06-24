# Repository Guidelines

<!-- SDKWORK-AGENTS-GENERATED: v1 -->

## SDKWORK Soul

Read `../sdkwork-specs/SOUL.md` before executing tasks in this root. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this root:

- `../sdkwork-specs/README.md`
- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/AGENTS_SPEC.md`
- `../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../sdkwork-specs/NAMING_SPEC.md`

Do not copy root standard text into this repository. If these relative paths do not resolve, stop and report the broken workspace layout.

## Application Identity

Root `sdkwork.app.config.json` defines the browser platform workspace identity. Per-surface manifests live under `apps/sdkwork-browser-pc/`, `apps/sdkwork-browser-h5/`, and `apps/sdkwork-browser-flutter-mobile/`.

## Local Dictionary Structure

- `AGENTS.md`: local agent entrypoint and relative SDKWORK spec index.
- `CLAUDE.md`, `GEMINI.md`, `CODEX.md`: tool compatibility shims pointing to `AGENTS.md`.
- `apis/`: API contracts and materialization inputs for browser domain.
- `apps/`: tri-surface application roots (PC, H5, Flutter mobile).
- `crates/`: Rust route crates, storage, and Tauri host library.
- `sdks/`: SDK families and generated SDK workspaces.
- `packages/common/browser/`: cross-surface TypeScript contracts and services.
- `configs/`, `deployments/`, `docs/`, `scripts/`, `tests/`: standard project-root dictionary.
- `package.json`, `pnpm-workspace.yaml`, `Cargo.toml`: language/build manifests.

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Spec Resolution Order

1. Read this `AGENTS.md` and any nearer component-level `AGENTS.md`.
2. Read `sdkwork.app.config.json` when present.
3. Read local `specs/README.md` and `specs/component.spec.json` when present.
4. Read local `.sdkwork/README.md`, `.sdkwork/skills/`, and `.sdkwork/plugins/` when relevant.
5. Read `../sdkwork-specs/README.md` and the task-specific root specs.
6. Inspect implementation files only after the relevant dictionary entries are clear.

## Required Specs By Task Type

- Agent/workflow changes: `../sdkwork-specs/SOUL.md`, `../sdkwork-specs/AGENTS_SPEC.md`, `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`.
- Any code change: `../sdkwork-specs/CODE_STYLE_SPEC.md`, `../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- Rust code: `../sdkwork-specs/RUST_CODE_SPEC.md`; Tauri/desktop: `../sdkwork-specs/DESKTOP_APP_ARCHITECTURE_SPEC.md`.
- TypeScript/Node code: `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, and exactly one detailed UI architecture spec.
- PC surface: `../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, `../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`.
- H5 surface: `../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`, `../sdkwork-specs/APP_MOBILE_REACT_UI_SPEC.md`.
- Flutter surface: `../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`, `../sdkwork-specs/APP_FLUTTER_UI_SPEC.md`.
- Cross-client alignment: `../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`.

## Code Style Rules

Read `../sdkwork-specs/CODE_STYLE_SPEC.md` and `../sdkwork-specs/NAMING_SPEC.md` before code changes.

For Rust, keep `src/lib.rs` limited to module declarations, re-exports, and wiring.

## Build, Test, and Verification

Run commands from this directory unless a command explicitly targets another path.

- `pnpm install`: install dependencies.
- `pnpm dev`: start default PC renderer development.
- `pnpm dev:desktop`: start Tauri desktop shell.
- `pnpm test`: run TypeScript contract and package tests.
- `pnpm verify`: run typecheck, cargo check, tests, and Rust tests.
- `cargo test --workspace`: run Rust crate tests.

## Agent Execution Rules

Do not rely on memory when a relevant SDKWork spec exists. Do not hand-edit generated SDK output. Stop when the relative spec path, app identity, or SDK family is ambiguous.

## Human Review Rules

Human review is required for breaking standard changes, security exceptions, and changes affecting generated SDK ownership or public naming.
