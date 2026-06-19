# SDKWork Browser SDK families (PRD §12)

| PRD name | SDKWork family directory | Consumers |
| --- | --- | --- |
| sdkwork-browser-rust | `sdkwork-browser-rust-sdk/` | Rust apps, Tauri host, embedded runtime |
| sdkwork-browser-java | `sdkwork-browser-java-sdk/` | Spring Boot, Spring AI, Android |
| sdkwork-browser-node | `sdkwork-browser-node-sdk/` | Electron, Next.js, NestJS |
| sdkwork-browser-python | `sdkwork-browser-python-sdk/` | Agent, workflow, AI platforms |

Generated from OpenAPI authorities under `apis/` per `SDK_WORKSPACE_GENERATION_SPEC.md`.

```bash
pnpm run api:materialize
pnpm run sdk:generate
```

Produces TypeScript, Rust, Java, and Python SDKs for app-api and backend-api families.
