# Frontend HTTP Security Headers

`soroscan-frontend/next.config.ts` applies security headers to every route via
`async headers()`; the header set is built by `soroscan-frontend/lib/security-headers.ts`
and unit tested in `soroscan-frontend/__tests__/security-headers.test.ts`.

## Headers sent

| Header | Value | Why |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing a response into a script or stylesheet. |
| `X-Frame-Options` | `DENY` | Blocks clickjacking by refusing to be framed. `frame-ancestors 'none'` in the CSP says the same thing for modern browsers. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full paths to same-origin requests, and only the origin to other sites. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` | The app never needs these capabilities, so no page or embedded frame can ask for them. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Production only. Tells browsers to stay on HTTPS for two years; harmless (and meaningless) over plain HTTP in local development. |
| `Content-Security-Policy-Report-Only` | see below | Report-only so violations are visible without breaking the app while the policy is tightened. |

## Content Security Policy (report-only)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' <configured API/GraphQL/WS origins>;
worker-src 'self' blob:;
manifest-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
object-src 'none';
upgrade-insecure-requests            (production only)
```

Directive rationale:

- `default-src 'self'` — deny anything a more specific directive does not allow.
- `script-src 'unsafe-inline'` — Next.js emits inline bootstrap/hydration scripts and the
  root layout injects JSON-LD with `dangerouslySetInnerHTML`. A nonce-based policy is the
  follow-up; until then inline script is allowed but the rest of the policy still constrains
  where scripts can be loaded from.
- `style-src 'unsafe-inline'` — Tailwind output plus `style` attributes used by components.
- `img-src data: blob:` — the org-logo cropper works on local blob URLs; `data:` covers
  inlined icons.
- `font-src 'self' data:` — fonts are self-hosted at build time by `next/font/google`.
- `connect-src` — starts at `'self'` and adds the origin of `NEXT_PUBLIC_GRAPHQL_URL`,
  `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WEB_VITALS_ENDPOINT`
  (WebSocket origins included, since `connect-src` also governs `ws:`/`wss:`).
  Unparseable values are ignored rather than widening the policy.
- `worker-src blob:` — service/web workers bundled by Next may be instantiated from blobs.
- `base-uri`, `form-action`, `frame-ancestors`, `object-src` — close off base-tag
  injection, cross-origin form posts, framing and plugin content.
- `upgrade-insecure-requests` — production only; local development uses plain HTTP.

## Verifying

```bash
cd soroscan-frontend
pnpm build
pnpm start &
curl -sI http://localhost:3000/ | grep -Ei 'content-security|x-frame|x-content|referrer|permissions|strict-transport'
```

The `Strict-Transport-Security` header only appears when `NODE_ENV=production`
(`next start` after `next build`), which is also how it should be checked.

## Not covered

These headers protect the HTML responses served by Next.js. The Django API sets its own
headers and CORS policy (see [CORS guide](./CORS_GUIDE.md)); middleware and proxy layers
may add or strip headers, so confirm with `curl -I` against the deployed origin.

The CSP is deliberately report-only: no `report-uri`/`report-to` endpoint is configured
yet, so violations appear in the browser console rather than in a collector. Enforcing the
policy requires adding nonces to scripts and replacing inline styles first.
