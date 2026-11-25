/**
 * HTTP security headers for every route, wired up in `next.config.ts`.
 *
 * Kept as a plain module (no Next.js imports) so the header set can be unit
 * tested without booting the server.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeaderOptions {
  /** HSTS is only meaningful over HTTPS, so it is production-only. */
  isProduction?: boolean;
  /** GraphQL/Apollo endpoint (`NEXT_PUBLIC_GRAPHQL_URL`). */
  graphqlUrl?: string;
  /** GraphQL subscription endpoint (`NEXT_PUBLIC_WS_URL`). */
  wsUrl?: string;
  /** Django REST base URL (`NEXT_PUBLIC_API_URL`). */
  apiUrl?: string;
  /** Web Vitals collector (`NEXT_PUBLIC_WEB_VITALS_ENDPOINT`). */
  webVitalsEndpoint?: string;
}

/** Returns the `scheme://host[:port]` origin of `value`, or `null` if unusable. */
function originOf(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const HSTS = 'max-age=63072000; includeSubDomains';

const PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'interest-cohort=()',
].join(', ');

export function contentSecurityPolicy(options: SecurityHeaderOptions = {}): string {
  const { isProduction = false } = options;

  const connectSrc = new Set<string>(["'self'"]);
  for (const url of [
    options.graphqlUrl,
    options.wsUrl,
    options.apiUrl,
    options.webVitalsEndpoint,
  ]) {
    const origin = originOf(url);
    if (origin) connectSrc.add(origin);
  }

  const directives = [
    "default-src 'self'",
    // Next.js emits inline bootstrap and hydration scripts, and the root layout
    // injects JSON-LD via dangerouslySetInnerHTML; nonce-based CSP is follow-up
    // work. This is report-only while that migration happens.
    "script-src 'self' 'unsafe-inline'",
    // Tailwind plus inline `style` attributes rendered by components.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${[...connectSrc].join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];

  if (isProduction) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}

export function securityHeaders(options: SecurityHeaderOptions = {}): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
    { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy(options) },
  ];

  if (options.isProduction) {
    headers.push({ key: 'Strict-Transport-Security', value: HSTS });
  }

  return headers;
}
