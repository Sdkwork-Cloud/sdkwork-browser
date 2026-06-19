# SDKWork Browser APIs

Author-owned HTTP contracts for the browser runtime platform. Materialize from Rust route manifests:

```bash
pnpm run api:materialize
```

## Authorities

| Surface | Authority | Path |
| --- | --- | --- |
| app-api | `sdkwork-browser-app-api` | `apis/app-api/platform/openapi.yaml` |
| backend-api | `sdkwork-browser-backend-api` | `apis/backend-api/platform/openapi.yaml` |

Route manifests: `sdks/_route-manifests/<surface>/`.

Generated SDK families: `sdks/sdkwork-browser-app-sdk/`, `sdks/sdkwork-browser-backend-sdk/`.

RPC (`apis/rpc/`) and `sdkwork-discovery` are deferred until the first hosted gRPC service — see `docs/adr/ADR-003-browser-rpc-discovery-deferred.md`.
