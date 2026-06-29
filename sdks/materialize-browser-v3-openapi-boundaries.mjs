import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sdkWorkEnvelopeComponentSchemas,
  successResponseSchemaRef,
  typedSdkWorkResourceResponse,
} from "../../sdkwork-specs/tools/lib/openapi-envelope-schemas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserRoot = resolve(__dirname, "..");

const routeSources = [
  {
    owner: "browser",
    sourceRouteCrate: "sdkwork-routes-browser-app-api",
    path: resolve(browserRoot, "crates/sdkwork-routes-browser-app-api/src/manifest.rs"),
    constructors: ["BrowserHttpRoute::new"],
  },
  {
    owner: "browser",
    sourceRouteCrate: "sdkwork-routes-browser-backend-api",
    path: resolve(browserRoot, "crates/sdkwork-routes-browser-backend-api/src/manifest.rs"),
    constructors: ["BrowserHttpRoute::new"],
  },
];

const surfaces = {
  app: {
    routeSurface: "app-api",
    sdkType: "app",
    sdkOwner: "sdkwork-browser",
    familyName: "sdkwork-browser-app-sdk",
    authorityName: "sdkwork-browser-app-api",
    title: "SDKWork Browser App API",
    description: "App/client contract for SDKWork browser sessions, tabs, and AI actions.",
    prefix: "/app/v3/api",
    audience: "PC, desktop, mobile, H5, and user-facing browser clients",
    authMode: "dual-token",
    apisPath: "apis/app-api/platform/openapi.yaml",
  },
  backend: {
    routeSurface: "backend-api",
    sdkType: "backend",
    sdkOwner: "sdkwork-browser",
    familyName: "sdkwork-browser-backend-sdk",
    authorityName: "sdkwork-browser-backend-api",
    title: "SDKWork Browser Backend API",
    description: "Backend/admin contract for SDKWork browser sessions and engine registry.",
    prefix: "/backend/v3/api",
    audience: "Backend consoles, operators, and browser control-plane integrations",
    authMode: "dual-token",
    apisPath: "apis/backend-api/platform/openapi.yaml",
  },
};

const methodNames = {
  Delete: "delete",
  Get: "get",
  Patch: "patch",
  Post: "post",
  Put: "put",
};

async function main() {
  const routes = await collectRoutes();
  const appRoutes = selectRoutes(routes, surfaces.app.prefix);
  const backendRoutes = selectRoutes(routes, surfaces.backend.prefix);

  if (appRoutes.length === 0) {
    throw new Error("No browser app-api routes were materialized from Rust route catalogs.");
  }
  if (backendRoutes.length === 0) {
    throw new Error("No browser backend-api routes were materialized from Rust route catalogs.");
  }

  await writeSurfaceOpenApi(surfaces.app, appRoutes);
  await writeSurfaceOpenApi(surfaces.backend, backendRoutes);
  await writeRouteManifest(surfaces.app, appRoutes);
  await writeRouteManifest(surfaces.backend, backendRoutes);

  console.log(`Materialized ${appRoutes.length} browser app-api operations.`);
  console.log(`Materialized ${backendRoutes.length} browser backend-api operations.`);
}

async function collectRoutes() {
  const routes = [];
  for (const source of routeSources) {
    const content = await readFile(source.path, "utf8");
    const constructors = source.constructors.map((constructor) => escapeRegExp(constructor)).join("|");
    const routePattern = new RegExp(
      `(?:${constructors})\\s*\\(\\s*HttpMethod::(Get|Post|Patch|Put|Delete)\\s*,\\s*"([^"]+)"\\s*,\\s*"([^"]+)"\\s*,\\s*"([^"]+)"\\s*,?\\s*\\)`,
      "g",
    );

    for (const match of content.matchAll(routePattern)) {
      routes.push({
        owner: source.owner,
        sourceRouteCrate: source.sourceRouteCrate,
        sourcePath: source.path,
        method: methodNames[match[1]],
        path: match[2],
        tag: match[3],
        operationId: match[4],
      });
    }
  }

  return routes.sort((left, right) => `${left.path}:${left.method}`.localeCompare(`${right.path}:${right.method}`));
}

function selectRoutes(routes, prefix) {
  return routes.filter((route) => route.path.startsWith(`${prefix}/`) || route.path === prefix);
}

async function writeSurfaceOpenApi(surface, routes) {
  const authority = buildOpenApi(surface, routes);
  const familyRoot = resolve(browserRoot, "sdks", surface.familyName);
  const openapiRoot = resolve(familyRoot, "openapi");
  await mkdir(openapiRoot, { recursive: true });

  const authorityPath = resolve(openapiRoot, `${surface.authorityName}.openapi.yaml`);
  const apisAuthorityPath = resolve(browserRoot, surface.apisPath);
  const content = `${JSON.stringify(authority, null, 2)}\n`;

  await mkdir(dirname(apisAuthorityPath), { recursive: true });
  await writeFile(authorityPath, content, "utf8");
  await writeFile(apisAuthorityPath, content, "utf8");
}

async function writeRouteManifest(surface, routes) {
  const packageName = routePackageForSurface(surface);
  const manifestRoot = resolve(browserRoot, "sdks", "_route-manifests", surface.routeSurface);
  await mkdir(manifestRoot, { recursive: true });
  const manifestPath = resolve(manifestRoot, `${packageName}.route-manifest.json`);
  const manifest = {
    schemaVersion: 1,
    kind: "sdkwork.route.manifest",
    packageName,
    surface: surface.routeSurface,
    owner: surface.sdkOwner,
    domain: "platform",
    capability: "browser",
    apiAuthority: surface.authorityName,
    sdkFamily: surface.familyName,
    prefix: surface.prefix,
    source: {
      crateRoot: `crates/${packageName}`,
      crateImport: packageName.replaceAll("-", "_"),
    },
    routes: routes.map((route) => ({
      method: route.method.toUpperCase(),
      path: route.path,
      operationId: route.operationId,
      tags: [route.tag],
      requestContext: "WebRequestContext",
      apiSurface: surface.routeSurface,
      auth: {
        mode: surface.authMode,
        required: true,
      },
      ownership: {
        owner: surface.sdkOwner,
        apiAuthority: surface.authorityName,
        sdkFamily: surface.familyName,
        sourceRouteCrate: route.sourceRouteCrate,
      },
    })),
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function buildOpenApi(surface, routes) {
  const paths = {};
  for (const route of routes) {
    const pathItem = paths[route.path] ?? {};
    pathItem[route.method] = buildOperation(surface, route);
    paths[route.path] = pathItem;
  }

  return {
    openapi: "3.1.2",
    info: {
      title: surface.title,
      version: "1.0.0",
      description: surface.description,
      "x-sdkwork-api-authority": surface.authorityName,
      "x-sdkwork-sdk-family": surface.familyName,
      "x-sdkwork-audience": surface.audience,
    },
    servers: [{ url: "http://localhost:8080", description: "Local sdkwork-browser runtime" }],
    tags: [{ name: "browser", description: "Browser runtime platform resources." }],
    security: [{ AuthToken: [], AccessToken: [] }],
    paths,
    components: {
      securitySchemes: {
        AuthToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        AccessToken: {
          type: "apiKey",
          in: "header",
          name: "Access-Token",
        },
      },
      schemas: {
        ...sdkWorkEnvelopeComponentSchemas,
        BrowserOperationCommand: {
          type: "object",
          additionalProperties: true,
        },
        ...surfaceBackendSchemas(surface),
      },
    },
  };
}

function buildOperation(surface, route) {
  const operation = {
    tags: [route.tag],
    summary: route.operationId,
    operationId: route.operationId,
    responses: {
      200: {
        description: "Success",
        content: {
          "application/json": {
            schema: successResponseSchema(surface, route),
          },
        },
      },
      401: problemResponse("Unauthorized"),
      403: problemResponse("Forbidden"),
      500: problemResponse("Internal server error"),
    },
    security: [{ AuthToken: [], AccessToken: [] }],
    "x-sdkwork-owner": surface.sdkOwner,
    "x-sdkwork-api-authority": surface.authorityName,
    "x-sdkwork-request-context": "WebRequestContext",
    "x-sdkwork-api-surface": surface.routeSurface,
  };

  if (route.method === "post") {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/BrowserOperationCommand" },
        },
      },
    };
  }

  return operation;
}

function successResponseSchema(surface, route) {
  if (
    surface.routeSurface === "backend-api" &&
    route.operationId === "browser.sessions.list"
  ) {
    return { $ref: "#/components/schemas/BrowserSessionsListResponse" };
  }
  return { $ref: successResponseSchemaRef(route) };
}

function surfaceBackendSchemas(surface) {
  if (surface.routeSurface !== "backend-api") {
    return {};
  }

  return {
    BrowserOperatorSession: {
      type: "object",
      required: [
        "sessionId",
        "kind",
        "tabCount",
        "agentRuntimeId",
        "runtimeMode",
        "mcpConnectorCount",
        "observedAtUnix",
      ],
      properties: {
        sessionId: { type: "string" },
        kind: { type: "string" },
        activeEngineId: { type: ["string", "null"] },
        activeTabId: { type: ["string", "null"] },
        tabCount: { type: "integer", minimum: 0 },
        agentRuntimeId: { type: "string" },
        runtimeMode: { type: "string" },
        mcpConnectorCount: { type: "integer", minimum: 0 },
        observedAtUnix: { type: "integer", minimum: 0 },
      },
    },
    AgentProviderDiagnostic: {
      type: "object",
      required: [
        "providerId",
        "providerFamily",
        "providerVersion",
        "typedRegistered",
        "capabilities",
      ],
      properties: {
        providerId: { type: "string" },
        providerFamily: { type: "string" },
        providerVersion: { type: "string" },
        typedRegistered: { type: "boolean" },
        health: {
          type: "object",
          properties: {
            status: { type: "string" },
          },
        },
        capabilities: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    AgentRuntimeDiagnostics: {
      type: "object",
      required: [
        "schemaVersion",
        "runtimeId",
        "agentId",
        "state",
        "providerCount",
        "capabilityCount",
        "typedProviderCount",
        "manifestOnlyProviderCount",
        "missingRequiredCapabilities",
        "degradedCapabilities",
        "providerDiagnostics",
        "runtimeMode",
      ],
      properties: {
        schemaVersion: { type: "string", const: "agent_runtime_diagnostics.v1" },
        runtimeId: { type: "string" },
        agentId: { type: "string" },
        state: { type: "string", enum: ["ready", "degraded", "failed"] },
        providerCount: { type: "integer", minimum: 0 },
        capabilityCount: { type: "integer", minimum: 0 },
        typedProviderCount: { type: "integer", minimum: 0 },
        manifestOnlyProviderCount: { type: "integer", minimum: 0 },
        missingRequiredCapabilities: {
          type: "array",
          items: { type: "string" },
        },
        degradedCapabilities: {
          type: "array",
          items: { type: "string" },
        },
        providerDiagnostics: {
          type: "array",
          items: { $ref: "#/components/schemas/AgentProviderDiagnostic" },
        },
        runtimeMode: { type: "string" },
      },
    },
    BrowserSessionsListData: {
      type: "object",
      required: ["sessions", "agentDiagnostics"],
      properties: {
        sessions: {
          type: "array",
          items: { $ref: "#/components/schemas/BrowserOperatorSession" },
        },
        agentDiagnostics: { $ref: "#/components/schemas/AgentRuntimeDiagnostics" },
      },
    },
    BrowserSessionsListResponse: typedSdkWorkResourceResponse(
      "#/components/schemas/BrowserSessionsListData",
    ),
  };
}

function problemResponse(description) {
  return {
    description,
    content: {
      "application/problem+json": {
        schema: { $ref: "#/components/schemas/ProblemDetail" },
      },
    },
  };
}

function routePackageForSurface(surface) {
  return surface.routeSurface === "app-api"
    ? "sdkwork-routes-browser-app-api"
    : "sdkwork-routes-browser-backend-api";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

await main();
