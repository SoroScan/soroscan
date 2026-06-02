"use client";

/**
 * GraphQLErrorDisplay
 *
 * A focused, accessible component for rendering parsed GraphQL errors.
 * Consumes `ParsedGraphQLError` objects from `lib/graphql-error-parser.ts`.
 *
 * Integration points:
 *   - FE-5: typed query/mutation hooks feed ApolloError instances that are
 *     passed through `parseGraphQLError()` before reaching this component.
 *   - FE-22: the `variant="banner"` prop makes this suitable for page-level
 *     error layout slots (e.g. at the top of a form or data panel).
 *
 * Variants:
 *   - "inline"  — compact single-line block, ideal inside forms.
 *   - "banner"  — full-width dismissible panel, ideal for page-level errors.
 *   - "toast"   — minimal text-only block for inside toast containers.
 */

import React from "react";
import { XCircle, WifiOff, ShieldOff, AlertTriangle, Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedGraphQLError, GraphQLErrorCode } from "@/lib/graphql-error-parser";

// ── Types ────────────────────────────────────────────────────────────────────

export type GraphQLErrorDisplayVariant = "inline" | "banner" | "toast";

export interface GraphQLErrorDisplayProps {
  /** The parsed error object from `parseGraphQLError()`. Pass `null` to render nothing. */
  error: ParsedGraphQLError | null | undefined;
  /** Visual variant. Defaults to "inline". */
  variant?: GraphQLErrorDisplayVariant;
  /** Allow the user to dismiss the error. */
  dismissible?: boolean;
  /** Callback fired when the user dismisses the error. */
  onDismiss?: () => void;
  /** Show a "details" expandable section. Defaults to true when details exist. */
  showDetails?: boolean;
  /** Extra class names on the root element. */
  className?: string;
  /** Override the data-testid (defaults to "graphql-error-display"). */
  testId?: string;
}

// ── Icon mapping ─────────────────────────────────────────────────────────────

const CODE_ICONS: Partial<Record<GraphQLErrorCode, React.ComponentType<{ className?: string }>>> = {
  UNAUTHENTICATED: ShieldOff,
  FORBIDDEN: ShieldOff,
  NETWORK_ERROR: WifiOff,
  RATE_LIMITED: AlertTriangle,
  INTERNAL_SERVER_ERROR: AlertTriangle,
  UNKNOWN: Info,
};

function getIcon(code: GraphQLErrorCode): React.ComponentType<{ className?: string }> {
  return CODE_ICONS[code] ?? XCircle;
}

// ── Variant styles ────────────────────────────────────────────────────────────

const ROOT_VARIANTS: Record<GraphQLErrorDisplayVariant, string> = {
  inline:
    "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
  banner:
    "w-full flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400",
  toast:
    "flex items-start gap-2 text-sm text-red-800 dark:text-red-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function GraphQLErrorDisplay({
  error,
  variant = "inline",
  dismissible = false,
  onDismiss,
  showDetails = true,
  className,
  testId = "graphql-error-display",
}: GraphQLErrorDisplayProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  // Reset dismissed state when the error changes
  React.useEffect(() => {
    setDismissed(false);
    setExpanded(false);
  }, [error?.code, error?.message]);

  if (!error || dismissed) return null;

  const Icon = getIcon(error.code);
  const hasDetails = showDetails && Boolean(error.details);
  const hasSuggestion = Boolean(error.suggestion);
  const canDismiss = dismissible || Boolean(onDismiss);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid={testId}
      data-error-code={error.code}
      className={cn(ROOT_VARIANTS[variant], className)}
    >
      {/* Icon */}
      <Icon
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {/* Primary message */}
        <p className="font-medium leading-snug" data-testid={`${testId}-message`}>
          {error.message}
        </p>

        {/* Suggestion */}
        {hasSuggestion && (
          <p
            className="mt-0.5 text-xs opacity-80"
            data-testid={`${testId}-suggestion`}
          >
            {error.suggestion}
          </p>
        )}

        {/* Expandable details */}
        {hasDetails && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-0.5 text-xs underline underline-offset-2 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
              aria-expanded={expanded}
              aria-controls={`${testId}-details`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3" aria-hidden="true" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" aria-hidden="true" />
                  Show details
                </>
              )}
            </button>

            {expanded && (
              <p
                id={`${testId}-details`}
                className="mt-1 break-words font-mono text-xs opacity-75"
                data-testid={`${testId}-details`}
              >
                {error.details}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {canDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss error"
          className="ml-1 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 transition-opacity"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ── Multi-error list variant ──────────────────────────────────────────────────

export interface GraphQLErrorListProps {
  /** Multiple parsed errors — e.g. from `parseGraphQLErrors()`. */
  errors: ParsedGraphQLError[];
  variant?: GraphQLErrorDisplayVariant;
  dismissible?: boolean;
  className?: string;
}

/**
 * Renders a stacked list of `GraphQLErrorDisplay` items.
 * Useful when a single operation returns multiple validation errors.
 */
export function GraphQLErrorList({
  errors,
  variant = "inline",
  dismissible = false,
  className,
}: GraphQLErrorListProps) {
  const [dismissed, setDismissed] = React.useState<Set<number>>(new Set());

  if (!errors.length) return null;

  const visible = errors.filter((_, i) => !dismissed.has(i));
  if (!visible.length) return null;

  return (
    <ul
      className={cn("flex flex-col gap-2", className)}
      aria-label="Error list"
      data-testid="graphql-error-list"
    >
      {errors.map((error, i) =>
        dismissed.has(i) ? null : (
          <li key={`${error.code}-${i}`}>
            <GraphQLErrorDisplay
              error={error}
              variant={variant}
              dismissible={dismissible}
              onDismiss={() => setDismissed((s) => new Set([...s, i]))}
              testId={`graphql-error-display-${i}`}
            />
          </li>
        )
      )}
    </ul>
  );
}
