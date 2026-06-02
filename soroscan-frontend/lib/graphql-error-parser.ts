/**
 * GraphQL Error Parser
 *
 * Translates raw Apollo/GraphQL errors into structured, user-friendly objects.
 *
 * Architecture note:
 *   - FE-5 (GraphQL type generation) feeds typed queries/mutations into our hooks.
 *     The ApolloError type from @apollo/client already carries `graphQLErrors` and
 *     `networkError`, so this utility slots in naturally after the Apollo link chain
 *     (apollo-client.ts) processes auth/retry logic.
 *   - FE-22 (global error layout / error boundary) can consume `ParsedGraphQLError`
 *     objects directly to render page-level banners, form-level blocks, or toasts.
 */

import type { ApolloError, GraphQLErrors } from '@apollo/client';
import type { GraphQLError } from 'graphql';

// ── Types ────────────────────────────────────────────────────────────────────

/** Extension codes we handle explicitly. */
export type GraphQLErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_USER_INPUT'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_FAILED'
  | 'UNKNOWN';

/** Structured output of the parser — ready to render directly. */
export interface ParsedGraphQLError {
  /** Short, human-readable headline (no stack traces, no raw field names). */
  message: string;
  /** Optional extra context — e.g. which fields failed validation. */
  details?: string;
  /** Actionable next step for the user. */
  suggestion?: string;
  /** Normalised code for conditional rendering / testing. */
  code: GraphQLErrorCode;
}

// ── Error code → UX copy map ─────────────────────────────────────────────────

const CODE_MAP: Record<
  Exclude<GraphQLErrorCode, 'UNKNOWN'>,
  Omit<ParsedGraphQLError, 'code'>
> = {
  UNAUTHENTICATED: {
    message: 'Your session has expired.',
    suggestion: 'Please sign in again to continue.',
  },
  FORBIDDEN: {
    message: "You don't have permission to do that.",
    suggestion: 'Contact your organisation administrator if you think this is a mistake.',
  },
  NOT_FOUND: {
    message: 'The requested resource could not be found.',
    suggestion: 'Double-check the ID or URL and try again.',
  },
  BAD_USER_INPUT: {
    message: 'One or more fields contain invalid data.',
    suggestion: 'Review the highlighted fields and correct the values before resubmitting.',
  },
  VALIDATION_FAILED: {
    message: 'Your request failed validation.',
    suggestion: 'Check that all required fields are filled in and match the expected format.',
  },
  RATE_LIMITED: {
    message: 'Too many requests in a short time.',
    suggestion: 'Wait a moment, then try again.',
  },
  INTERNAL_SERVER_ERROR: {
    message: 'An unexpected server error occurred.',
    suggestion: 'This is on our end. Please try again later or contact support if the issue persists.',
  },
  NETWORK_ERROR: {
    message: 'Could not reach the server.',
    suggestion: 'Check your internet connection and try again.',
  },
  PARSE_FAILED: {
    message: 'The server could not understand the request.',
    suggestion: 'If this keeps happening, please report it to the development team.',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a normalised code from a raw GraphQL error's extensions.
 * Falls back to message-based heuristics for backends that don't set
 * extensions.code consistently (e.g. Strawberry default errors).
 */
function resolveCode(error: GraphQLError): GraphQLErrorCode {
  const raw =
    (error.extensions?.code as string | undefined) ??
    (error.extensions?.errorType as string | undefined) ??
    '';

  const upper = raw.toUpperCase();

  if (upper === 'UNAUTHENTICATED' || upper === '401') return 'UNAUTHENTICATED';
  if (upper === 'FORBIDDEN' || upper === '403') return 'FORBIDDEN';
  if (upper === 'NOT_FOUND' || upper === '404') return 'NOT_FOUND';
  if (upper === 'BAD_USER_INPUT') return 'BAD_USER_INPUT';
  if (upper === 'VALIDATION_FAILED' || upper === 'VALIDATION_ERROR') return 'VALIDATION_FAILED';
  if (upper === 'RATE_LIMITED' || upper === 'TOO_MANY_REQUESTS') return 'RATE_LIMITED';
  if (upper === 'INTERNAL_SERVER_ERROR' || upper === '500') return 'INTERNAL_SERVER_ERROR';
  if (upper === 'GRAPHQL_PARSE_FAILED' || upper === 'PARSE_FAILED') return 'PARSE_FAILED';

  // Heuristic: Strawberry / graphene validation errors often contain keywords
  const msg = error.message.toLowerCase();
  if (msg.includes('not authenticated') || msg.includes('not authorized') || msg.includes('permission denied')) {
    return 'FORBIDDEN';
  }
  if (msg.includes('invalid') || msg.includes('must be') || msg.includes('required')) {
    return 'VALIDATION_FAILED';
  }
  if (msg.includes('not found')) return 'NOT_FOUND';
  if (msg.includes('syntax') || msg.includes('parse')) return 'PARSE_FAILED';

  return 'UNKNOWN';
}

/**
 * Extract a human-readable detail string from a single GraphQL error's
 * extensions — surfaces validation field errors when present.
 */
function extractDetails(error: GraphQLError): string | undefined {
  const ext = error.extensions;
  if (!ext) return undefined;

  // Common shapes: { field_errors: { fieldName: ["msg"] } }, { fields: [...] }
  if (ext.field_errors && typeof ext.field_errors === 'object') {
    const parts: string[] = [];
    for (const [field, msgs] of Object.entries(ext.field_errors as Record<string, unknown>)) {
      const text = Array.isArray(msgs) ? msgs.join('; ') : String(msgs);
      parts.push(`${field}: ${text}`);
    }
    if (parts.length) return parts.join(' · ');
  }

  // Strawberry / graphene detail string
  if (typeof ext.detail === 'string' && ext.detail) return ext.detail;

  // Path context  e.g. ["login", "email"]
  if (Array.isArray(error.path) && error.path.length) {
    return `Field path: ${error.path.join(' › ')}`;
  }

  return undefined;
}

// ── Single-error parser ───────────────────────────────────────────────────────

/**
 * Parse a single raw GraphQLError into a user-friendly object.
 */
export function parseSingleGraphQLError(error: GraphQLError): ParsedGraphQLError {
  const code = resolveCode(error);
  const base = CODE_MAP[code as Exclude<GraphQLErrorCode, 'UNKNOWN'>] ?? {
    message: 'Something went wrong. Please try again.',
    suggestion: 'If the issue continues, contact support.',
  };

  return {
    code,
    message: base.message,
    details: extractDetails(error),
    suggestion: base.suggestion,
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * `parseGraphQLError(error)`
 *
 * Accepts an `ApolloError` (or any error-like object) and returns a
 * `ParsedGraphQLError` ready to display.  Always returns a safe fallback —
 * never throws.
 *
 * Precedence:
 *   1. First entry in `graphQLErrors` array (most specific)
 *   2. Network error
 *   3. Generic fallback
 *
 * Usage in hooks:
 *   ```ts
 *   onError: (err) => {
 *     const parsed = parseGraphQLError(err);
 *     showToast(parsed.message, 'error', parsed.suggestion);
 *   }
 *   ```
 */
export function parseGraphQLError(error: ApolloError | Error | unknown): ParsedGraphQLError {
  try {
    // Apollo errors carry graphQLErrors + networkError
    const apolloError = error as ApolloError;

    if (apolloError?.graphQLErrors?.length) {
      const first = apolloError.graphQLErrors[0];
      const parsed = parseSingleGraphQLError(first);

      // If there are multiple field errors, surface them all in details
      if (apolloError.graphQLErrors.length > 1) {
        const allDetails = apolloError.graphQLErrors
          .map((e: GraphQLError) => extractDetails(e) ?? e.message)
          .filter(Boolean)
          .join(' | ');
        return { ...parsed, details: allDetails || parsed.details };
      }

      return parsed;
    }

    if (apolloError?.networkError) {
      const net = apolloError.networkError as { statusCode?: number; message?: string };
      const status = net?.statusCode;

      // Map HTTP status to a code
      if (status === 401) return { ...CODE_MAP.UNAUTHENTICATED, code: 'UNAUTHENTICATED' };
      if (status === 403) return { ...CODE_MAP.FORBIDDEN, code: 'FORBIDDEN' };
      if (status === 404) return { ...CODE_MAP.NOT_FOUND, code: 'NOT_FOUND' };
      if (status === 429) return { ...CODE_MAP.RATE_LIMITED, code: 'RATE_LIMITED' };
      if (status && status >= 500) return { ...CODE_MAP.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR' };

      return { ...CODE_MAP.NETWORK_ERROR, code: 'NETWORK_ERROR' };
    }

    // Plain Error object — extract what we can
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
        return { ...CODE_MAP.NETWORK_ERROR, code: 'NETWORK_ERROR' };
      }
      if (msg.includes('parse') || msg.includes('syntax')) {
        return { ...CODE_MAP.PARSE_FAILED, code: 'PARSE_FAILED' };
      }
    }
  } catch {
    // Defensive — parsing should never crash the app
  }

  return {
    code: 'UNKNOWN',
    message: 'Something went wrong. Please try again.',
    suggestion: 'If the issue continues, contact support.',
  };
}

/**
 * Parse an array of raw GraphQL errors into individual user-friendly objects.
 * Useful when you want to list every validation error separately.
 */
export function parseGraphQLErrors(errors: GraphQLErrors): ParsedGraphQLError[] {
  if (!errors?.length) return [];
  return errors.map((e) => parseSingleGraphQLError(e));
}
