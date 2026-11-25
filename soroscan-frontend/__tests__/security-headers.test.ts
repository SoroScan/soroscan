import {
  contentSecurityPolicy,
  securityHeaders,
  type SecurityHeader,
} from '@/lib/security-headers';

function asMap(headers: SecurityHeader[]): Record<string, string> {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

describe('securityHeaders', () => {
  it('returns the baseline hardening headers for every route', () => {
    const headers = asMap(securityHeaders());
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('geolocation=()');
  });

  it('only sends HSTS in production', () => {
    expect(asMap(securityHeaders())['Strict-Transport-Security']).toBeUndefined();
    expect(asMap(securityHeaders({ isProduction: true }))['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains',
    );
  });

  it('ships the CSP as report-only, never as an enforced policy', () => {
    const headers = asMap(securityHeaders({ isProduction: true }));
    expect(headers['Content-Security-Policy-Report-Only']).toBeDefined();
    expect(headers['Content-Security-Policy']).toBeUndefined();
  });
});

describe('contentSecurityPolicy', () => {
  it('locks down the high-risk directives', () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('allows only local and configured origins to be contacted', () => {
    const csp = contentSecurityPolicy({
      graphqlUrl: 'https://api.soroscan.io/graphql/',
      wsUrl: 'wss://api.soroscan.io/graphql/',
      apiUrl: 'https://api.soroscan.io',
    });
    const connectSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src'));

    expect(connectSrc).toBe(
      "connect-src 'self' https://api.soroscan.io wss://api.soroscan.io",
    );
  });

  it('ignores unparseable endpoint configuration instead of widening the policy', () => {
    const csp = contentSecurityPolicy({ graphqlUrl: 'not a url', wsUrl: '' });
    const connectSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('connect-src'));

    expect(connectSrc).toBe("connect-src 'self'");
  });

  it('upgrades insecure requests in production only', () => {
    expect(contentSecurityPolicy()).not.toContain('upgrade-insecure-requests');
    expect(contentSecurityPolicy({ isProduction: true })).toContain(
      'upgrade-insecure-requests',
    );
  });
});
