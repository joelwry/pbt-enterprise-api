import fs from 'fs';
import path from 'path';

export interface ParsedRoute {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  /** Express-style path with `:param` segments, e.g. `/roadmaps/:roadmapId`. */
  expressPath: string;
  requiresAuth: boolean;
  /** Empty array means "any authenticated role" (no `authorize(...)` gate found). */
  roles: string[];
}

const ROUTE_CALL_RE = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
// Non-greedy up to the first `);` -- `[^)]*` alone stops at the first `)` it
// meets, which is `authorize('admin', 'super_admin')`'s own closing paren,
// truncating the capture before `authorize(...)` is even complete. Every
// `router.use(...)` call in this codebase is a single statement ending in
// `);` with nothing else on that line, so this holds.
const ROUTER_USE_RE = /router\.use\(([\s\S]*?)\);/g;

/**
 * Statically parses a route file for its registered endpoints and whether
 * each one sits behind `authenticate`/`authorize(...)`. This is a
 * regex-based approximation (not a real TS parser) that relies on this
 * codebase's very consistent route-file shape -- see AGENTS.md for the
 * convention it depends on. If that convention changes, this needs a
 * matching update.
 */
export function parseRouteFile(absolutePath: string): ParsedRoute[] {
  const source = fs.readFileSync(absolutePath, 'utf-8');

  const routerUseGates: { index: number; requiresAuth: boolean; roles: string[] }[] = [];
  for (const match of source.matchAll(ROUTER_USE_RE)) {
    const args = match[1];
    const requiresAuth = /\bauthenticate\b/.test(args);
    const roles = extractRoles(args);
    routerUseGates.push({ index: match.index ?? 0, requiresAuth, roles });
  }

  const routeMatches = [...source.matchAll(ROUTE_CALL_RE)];
  const routes: ParsedRoute[] = [];

  routeMatches.forEach((match, i) => {
    const method = match[1] as ParsedRoute['method'];
    const expressPath = match[2];
    const startIndex = match.index ?? 0;
    const endIndex = routeMatches[i + 1]?.index ?? source.length;
    const statementChunk = source.slice(startIndex, endIndex);

    const applicableGate = [...routerUseGates].reverse().find((g) => g.index < startIndex);
    const gateRequiresAuth = applicableGate?.requiresAuth ?? false;
    const gateRoles = applicableGate?.roles ?? [];

    const inlineRequiresAuth = /\bauthenticate\b/.test(statementChunk);
    const inlineRoles = extractRoles(statementChunk);

    routes.push({
      method,
      expressPath,
      requiresAuth: gateRequiresAuth || inlineRequiresAuth,
      roles: inlineRoles.length > 0 ? inlineRoles : gateRoles,
    });
  });

  return routes;
}

function extractRoles(text: string): string[] {
  const authorizeMatch = text.match(/authorize\(([^)]*)\)/);
  if (!authorizeMatch) return [];
  return [...authorizeMatch[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2]);
}

/**
 * Route files are read as source text (not imported) so registration order
 * and comment context survive for the regex parser above. In dev this
 * resolves the original `.ts` file; in the compiled `dist` build only the
 * transpiled `.js` survives, but the `router.*` calls this parser looks for
 * come through transpilation unchanged, so falling back to `.js` works too.
 */
export function resolveRouteFile(relativeToSrc: string): string {
  const tsPath = path.join(__dirname, '..', '..', relativeToSrc);
  if (fs.existsSync(tsPath)) return tsPath;
  return tsPath.replace(/\.ts$/, '.js');
}
