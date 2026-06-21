# BROWSER Database Module

Canonical lifecycle assets for `sdkwork-browser` per `DATABASE_FRAMEWORK_SPEC.md`.

- moduleId: `browser`
- serviceCode: `BROWSER`
- tablePrefix: `browser_`

## Commands

```bash
pnpm run db:validate
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```

## Migration status

Versioned migrations live under `migrations/{sqlite,postgres}/`. Baseline DDL is mirrored from `ddl/baseline/` as `0001_browser_legacy_baseline`.

Runtime services MUST create pools through `sdkwork-database-sqlx` and register `DefaultDatabaseModule` at bootstrap via `sdkwork-platform-browser-repository-sqlx`.
