import { config } from '@/config/environment';
import { ROUTE_MANIFEST } from '@/docs/openapi/route-manifest';
import { parseRouteFile, resolveRouteFile, ParsedRoute } from '@/docs/openapi/parse-route-file';
import { ENRICHED_PATHS } from '@/docs/openapi/enriched-paths';

interface ManualRoute {
  mountPath: string;
  expressPath: string;
  method: ParsedRoute['method'];
  requiresAuth: boolean;
  roles: string[];
  tag: string;
}

/** Mounted directly in app.ts ahead of the JSON body parser (needs the raw body for Stripe signature verification) -- not part of any router file, so the manifest walk below can't discover it. */
const MANUAL_ROUTES: ManualRoute[] = [
  { mountPath: '/billing', expressPath: '/webhook', method: 'post', requiresAuth: false, roles: [], tag: 'Billing' },
];

const GENERIC_SUCCESS_RESPONSE = {
  description: 'Success',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {},
        },
      },
    },
  },
};

const GENERIC_ERROR_RESPONSE = {
  description: 'Error',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** `mountPath + '/'` (the router's own root route) should render as the bare mount path, not a trailing slash. */
function joinMountAndRoute(mountPath: string, routePath: string): string {
  if (routePath === '/') return mountPath || '/';
  return `${mountPath}${routePath}`;
}

function extractPathParams(openApiPath: string) {
  return [...openApiPath.matchAll(/\{([^}]+)\}/g)].map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
}

export function buildOpenApiSpec() {
  const paths: Record<string, Record<string, unknown>> = {};
  const tags = new Map<string, string | undefined>();

  function registerRoute(
    mountPath: string,
    tag: string,
    method: ParsedRoute['method'],
    expressPath: string,
    requiresAuth: boolean,
    roles: string[],
    isRootMounted: boolean
  ) {
    const openApiSubPath = toOpenApiPath(joinMountAndRoute(mountPath, expressPath));
    const fullPath = isRootMounted ? openApiSubPath : `/api/${config.API_VERSION}${openApiSubPath}`;
    const enrichKey = `${method.toUpperCase()} ${openApiSubPath}`;
    const enriched = ENRICHED_PATHS[enrichKey];

    const operation: Record<string, unknown> = {
      tags: [tag],
      summary: enriched?.summary ?? `${method.toUpperCase()} ${fullPath}`,
      ...(enriched?.description ? { description: enriched.description } : {}),
      parameters: extractPathParams(openApiSubPath),
      ...(enriched?.requestBody ? { requestBody: enriched.requestBody } : {}),
      responses: enriched?.responses ?? {
        '200': GENERIC_SUCCESS_RESPONSE,
        ...(requiresAuth ? { '401': GENERIC_ERROR_RESPONSE } : {}),
      },
      ...(requiresAuth ? { security: [{ bearerAuth: [] }] } : {}),
      ...(roles.length > 0 ? { 'x-required-roles': roles } : {}),
    };

    if (!paths[fullPath]) paths[fullPath] = {};
    paths[fullPath][method] = operation;
  }

  for (const entry of ROUTE_MANIFEST) {
    tags.set(entry.tag, entry.tagDescription);
    const filePath = resolveRouteFile(entry.file);
    let routes: ParsedRoute[];
    try {
      routes = parseRouteFile(filePath);
    } catch {
      // A route file that can't be read/parsed shouldn't take the whole docs page down.
      continue;
    }
    for (const route of routes) {
      registerRoute(entry.mountPath, entry.tag, route.method, route.expressPath, route.requiresAuth, route.roles, entry.mountPath === '');
    }
  }

  for (const manual of MANUAL_ROUTES) {
    registerRoute(manual.mountPath, manual.tag, manual.method, manual.expressPath, manual.requiresAuth, manual.roles, false);
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'PBT Enterprise API',
      version: '1.0.0',
      description:
        'Property Business Training member portal API. Endpoints under `/admin/*` require an `admin` or `super_admin` role (see each operation\'s `x-required-roles`). ' +
        'Click **Authorize** below and paste an access token (obtained from `POST /auth/login` or `POST /auth/admin/login`) to try protected endpoints directly from this page. ' +
        'This spec is generated from the live route files on server start -- every endpoint mounted in `app.ts` appears here automatically.',
    },
    servers: [{ url: `http://localhost:${config.PORT}`, description: 'Local development' }],
    tags: [...tags.entries()].map(([name, description]) => ({ name, ...(description ? { description } : {}) })),
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
}
